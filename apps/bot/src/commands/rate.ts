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

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('target', true);
  const ratingType = interaction.options.getString('rating', true);
  const senderId = interaction.user.id;
  const targetId = targetUser.id;

  if (senderId === targetId) {
    return interaction.reply({
      content: '❌ 您不能評價您自己！',
      ephemeral: true
    });
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    // Ensure the target exists in database
    await prisma.user.upsert({
      where: { id: targetId },
      update: {},
      create: {
        id: targetId,
        valoScore: 100
      }
    });

    // Score adjustments
    let diff = 0;
    let desc = '';
    if (ratingType === 'good') {
      diff = 2;
      desc = '👍 友善配合 / 技術 Carry';
    } else if (ratingType === 'toxic') {
      diff = -5;
      desc = '👎 言語惡意 / 嘴砲騷擾';
    } else if (ratingType === 'afk') {
      diff = -10;
      desc = '💤 惡意掛網 / 擺爛行為';
    }

    const currentTargetUser = await prisma.user.findUnique({
      where: { id: targetId }
    });

    const currentScore = currentTargetUser?.valoScore ?? 100;
    let newScore = currentScore + diff;
    if (newScore > 100) newScore = 100;
    if (newScore < 0) newScore = 0;

    // Save back to DB and log reputation change event
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetId },
        data: { valoScore: newScore }
      }),
      prisma.reputationLog.create({
        data: {
          userId: targetId,
          oldScore: currentScore,
          newScore,
          reason: desc
        }
      })
    ]);

    const embed = new EmbedBuilder()
      .setColor('#4eff8a')
      .setTitle('📝 隊友行為互評已送出')
      .setDescription('感謝您的回報！您的評價將匿名記入系統，並影響該玩家在全伺服器的組隊權限。')
      .addFields(
        { name: '👥 被評價對象', value: `<@${targetId}>`, inline: true },
        { name: '🏷️ 評價類別', value: desc, inline: true },
        { name: '🛡️ 信用值變化', value: `${currentScore} ➔ **${newScore} pts** (${diff > 0 ? '+' : ''}${diff})`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: '安全守護 • 匿名數據防護' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error evaluating user:', error);
    await interaction.editReply({ content: '❌ 無法送出評價，資料庫寫入失敗。' });
  }
}
