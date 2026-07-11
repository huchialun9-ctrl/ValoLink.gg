import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@valolink/db';

export const data = new SlashCommandBuilder()
  .setName('rate')
  .setDescription('匿名評價隊友行為並調整其信用值 (Anonymously rate your teammate)')
  .addUserOption(option =>
    option.setName('target')
      .setDescription('你要評價的隊友 (Target Teammate)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('rating')
      .setDescription('評價內容 (Evaluation type)')
      .setRequired(true)
      .addChoices(
        { name: '👍 友善溝通 / 技術 Carry (+2 分)', value: 'good' },
        { name: '👎 言語暴力 / 嘴砲惡意 (-5 分)', value: 'toxic' },
        { name: '💤 擺爛掛網 / 斷線 AFK (-10 分)', value: 'afk' }
      )
  );

const COOLDOWN_HOURS = 24;

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('target', true);
  const ratingType = interaction.options.getString('rating', true);
  const senderId = interaction.user.id;
  const targetId = targetUser.id;

  if (senderId === targetId) {
    return interaction.reply({ content: '❌ 您不能評價您自己！', ephemeral: true });
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    // --- 24h Cooldown check ---
    const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
    const existing = await prisma.ratingRecord.findFirst({
      where: { raterId: senderId, targetId, createdAt: { gte: since } }
    });

    if (existing) {
      const nextAvailable = new Date(existing.createdAt.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
      return interaction.editReply({
        content: `⏳ 您在過去 ${COOLDOWN_HOURS} 小時內已對 <@${targetId}> 評分過，請於 **${nextAvailable.toLocaleTimeString('zh-TW')}** 後再試。`
      });
    }

    // --- Mutual rating farm detection ---
    const mutualGood = await prisma.ratingRecord.findFirst({
      where: {
        raterId: targetId,
        targetId: senderId,
        ratingType: 'good',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });
    const isSuspicious = mutualGood !== null && ratingType === 'good';

    // --- Weight by rater score ---
    await prisma.user.upsert({ where: { id: targetId }, update: {}, create: { id: targetId, valoScore: 100 } });
    const raterUser = await prisma.user.findUnique({ where: { id: senderId } });
    const raterScore = raterUser?.valoScore ?? 100;
    let weight = raterScore < 50 ? 0.5 : raterScore < 70 ? 0.75 : 1.0;

    let baseDiff = 0, desc = '';
    if (ratingType === 'good')  { baseDiff = 2;   desc = '👍 友善配合 / 技術 Carry'; }
    if (ratingType === 'toxic') { baseDiff = -5;  desc = '👎 言語惡意 / 嘴砲騷擾'; }
    if (ratingType === 'afk')   { baseDiff = -10; desc = '💤 惡意掛網 / 擺爛行為'; }

    const actualDiff = isSuspicious ? 0 : Math.round(baseDiff * weight);

    const currentTargetUser = await prisma.user.findUnique({ where: { id: targetId } });
    const currentScore = currentTargetUser?.valoScore ?? 100;
    const newScore = Math.max(0, Math.min(100, currentScore + actualDiff));

    await prisma.$transaction([
      prisma.user.update({ where: { id: targetId }, data: { valoScore: newScore } }),
      prisma.reputationLog.create({
        data: { userId: targetId, oldScore: currentScore, newScore, reason: desc }
      }),
      prisma.ratingRecord.create({
        data: { raterId: senderId, targetId, ratingType, suspicious: isSuspicious }
      }),
      ...(isSuspicious ? [prisma.user.update({ where: { id: senderId }, data: { isSuspicious: true } })] : [])
    ]);

    // DM the target player
    try {
      const dmChannel = await targetUser.createDM();
      const sign = actualDiff >= 0 ? '+' : '';
      await dmChannel.send({
        embeds: [{
          color: actualDiff >= 0 ? 0x4eff8a : 0xff4655,
          title: '🛡️ ValoLink.gg — 信用分變動通知',
          description: '您收到了來自隊友的匿名評分',
          fields: [
            { name: '評分類別', value: desc, inline: true },
            { name: '分數變動', value: `${currentScore} → **${newScore} pts** (${sign}${actualDiff})`, inline: true }
          ],
          footer: { text: '評分者已匿名保護 · ValoLink.gg' },
          timestamp: new Date().toISOString()
        }]
      });
    } catch {
      // DM might be blocked — non-critical
    }

    const embed = new EmbedBuilder()
      .setColor(isSuspicious ? 0xe5c158 : 0x4eff8a)
      .setTitle(isSuspicious ? '⚠️ 評分已記錄（可疑偵測）' : '📝 隊友行為互評已送出')
      .setDescription(
        isSuspicious
          ? '系統偵測到可能的互刷行為，本次評分已被標記審查，分數**不計入**。'
          : '感謝您的回報！評分已匿名記入系統，並影響該玩家在全伺服器的組隊權限。'
      )
      .addFields(
        { name: '👥 被評價對象', value: `<@${targetId}>`, inline: true },
        { name: '🏷️ 評價類別', value: desc, inline: true },
        { name: '🛡️ 信用值變化', value: `${currentScore} → **${newScore} pts** (${actualDiff >= 0 ? '+' : ''}${actualDiff})`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: '安全守護 • 匿名數據防護 • 24小時冷卻期' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[rate]', error);
    await interaction.editReply({ content: '❌ 無法送出評價，資料庫寫入失敗。' });
  }
}
