import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@valolink/db';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('查看玩家的特務名片與信用分 (View player profile and ValoScore)')
  .addUserOption(option =>
    option.setName('target')
      .setDescription('要查詢的玩家 (Select player)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser('target') || interaction.user;
  const userId = targetUser.id;

  try {
    await interaction.deferReply();

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return interaction.editReply({
        content: targetUser.id === interaction.user.id
          ? '❌ 您尚未綁定帳號！請先使用 `/verify` 指令進行認證。'
          : `❌ <@${userId}> 尚未在 ValoLink.gg 註冊或綁定。`
      });
    }

    const embed = new EmbedBuilder()
      .setColor(user.valoScore >= 90 ? '#4eff8a' : user.valoScore >= 60 ? '#ffb020' : '#ff4655')
      .setTitle(`🎮 ${user.riotId || '未認證特務'} 的玩家檔案`)
      .setDescription(`Discord 帳號: <@${userId}>`)
      .addFields(
        { name: '🏆 目前牌位', value: user.rank || '未認證', inline: true },
        { name: '🛡️ ValoScore 信用度', value: `**${user.valoScore} pts**`, inline: true },
        { 
          name: '📊 玩家信用評級', 
          value: user.valoScore >= 90 ? '🟢 優良信用 (良好配合隊友)' : user.valoScore >= 60 ? '🟡 一般信用 (注意行為指標)' : '🔴 不良信用 (已被系統列入名單)', 
          inline: false 
        }
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: '數據源自 ValoLink.gg 玩家信用網' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    await interaction.editReply({ content: '❌ 無法載入個人檔案，資料庫發生錯誤。' });
  }
}
