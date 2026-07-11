import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@valolink/db';

export const data = new SlashCommandBuilder()
  .setName('history')
  .setDescription('查看最近揪團紀錄與信用評分事件 (View your squad and rating history)')
  .addUserOption(option =>
    option.setName('target')
      .setDescription('查詢特定玩家 (預設為自己)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('target') || interaction.user;
  const userId = targetUser.id;
  const isSelf = userId === interaction.user.id;

  try {
    await interaction.deferReply({ ephemeral: isSelf });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reputationLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      return interaction.editReply({
        content: isSelf
          ? '❌ 您尚未在 ValoLink.gg 註冊，請先使用 `/verify` 綁定帳號。'
          : `❌ <@${userId}> 尚未在 ValoLink.gg 上有任何紀錄。`
      });
    }

    // Fetch recent squads
    const recentSquads = await prisma.lobbyMember.findMany({
      where: { userId },
      include: {
        lobby: {
          include: { captain: true }
        }
      },
      orderBy: { joinedAt: 'desc' },
      take: 5
    });

    // Fetch rating stats
    const totalGiven = await prisma.ratingRecord.count({ where: { raterId: userId } });
    const totalReceived = await prisma.ratingRecord.count({ where: { targetId: userId } });
    const goodReceived = await prisma.ratingRecord.count({ where: { targetId: userId, ratingType: 'good' } });
    const toxicReceived = await prisma.ratingRecord.count({ where: { targetId: userId, ratingType: 'toxic' } });

    const squadLines = recentSquads.length > 0
      ? recentSquads.map((mj, i) => {
          const statusEmoji = mj.lobby.status === 'OPEN' ? '🟢' : mj.lobby.status === 'PLAYING' ? '🎮' : '⚫';
          const captain = mj.lobby.captain.riotId || `Discord:${mj.lobby.captainId}`;
          const date = mj.joinedAt.toISOString().split('T')[0];
          return `${i + 1}. ${statusEmoji} **${mj.lobby.gameMode}** · 隊長: ${captain} · ${date}`;
        }).join('\n')
      : '尚無揪團紀錄';

    const recentLogLines = user.reputationLogs.length > 0
      ? user.reputationLogs.map(log => {
          const diff = log.newScore - log.oldScore;
          const sign = diff >= 0 ? '+' : '';
          const date = log.createdAt.toISOString().split('T')[0];
          return `· ${log.reason || '調整'} → **${sign}${diff}** (${log.oldScore}→${log.newScore}) · ${date}`;
        }).join('\n')
      : '尚無信用評分紀錄';

    const scoreColor = user.valoScore >= 90 ? 0x4eff8a : user.valoScore >= 60 ? 0xe5c158 : 0xff4655;

    const embed = new EmbedBuilder()
      .setColor(scoreColor)
      .setTitle(`📋 ${user.riotId || `Discord:${userId}`} 的活動紀錄`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: '🛡️ 目前信用狀態',
          value: `ValoScore: **${user.valoScore} pts** ${user.isSuspicious ? '⚠️ *可疑標記*' : ''}`,
          inline: false
        },
        {
          name: `🎮 近期揪團 (${recentSquads.length} 場)`,
          value: squadLines,
          inline: false
        },
        {
          name: `📊 評分統計`,
          value: `發出: **${totalGiven}** 筆 · 收到: **${totalReceived}** 筆 (👍${goodReceived} / 👎${toxicReceived})`,
          inline: false
        },
        {
          name: `📝 最近信用事件 (最新5筆)`,
          value: recentLogLines,
          inline: false
        }
      )
      .setFooter({ text: `ValoLink.gg · 更多資料請至 valolink-gg.onrender.com/player/${userId}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[history]', error);
    await interaction.editReply({ content: '❌ 無法讀取紀錄，資料庫連接失敗。' });
  }
}
