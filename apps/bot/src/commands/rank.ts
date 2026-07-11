import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@valolink/db';

export const data = new SlashCommandBuilder()
  .setName('rank')
  .setDescription('查看特戰英豪玩家信用分數排行榜 (View reputation rankings)');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();

    // Query top 10 users
    const topUsers = await prisma.user.findMany({
      orderBy: {
        valoScore: 'desc'
      },
      take: 10
    });

    if (topUsers.length === 0) {
      return interaction.editReply({
        content: '📭 目前排行榜尚無任何使用者記錄。'
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#0969da')
      .setTitle('🛡️ ValoLink.gg 信用度排行榜 (Top 10)')
      .setDescription('系統根據賽後互評分數進行排行，良好行為能建立優良戰術網絡。')
      .setTimestamp();

    const rankingText = topUsers.map((user, idx) => {
      const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;
      const rankTag = user.rank ? ` [${user.rank}]` : '';
      return `${rankEmoji} <@${user.id}> - **${user.riotId || '未認證 Riot ID'}**${rankTag} : **${user.valoScore} pts**`;
    }).join('\n\n');

    embed.addFields({ name: '🏆 當前信用排行', value: rankingText });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching rankings on Discord:', error);
    await interaction.editReply({ content: '❌ 無法讀取排行榜，資料庫連線失敗。' });
  }
}
