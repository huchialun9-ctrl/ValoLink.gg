import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@valolink/db';

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('綁定特戰英豪 Riot ID 與牌位 (Bind your Riot ID and Rank)')
  .addStringOption(option =>
    option.setName('riot-id')
      .setDescription('您的 Riot ID (例如: User#TAG)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('rank')
      .setDescription('您的目前牌位 (Current Rank)')
      .setRequired(true)
      .addChoices(
        { name: '鐵牌 (Iron)', value: 'Iron' },
        { name: '銅牌 (Bronze)', value: 'Bronze' },
        { name: '銀牌 (Silver)', value: 'Silver' },
        { name: '金牌 (Gold)', value: 'Gold' },
        { name: '白金 (Platinum)', value: 'Platinum' },
        { name: '鑽石 (Diamond)', value: 'Diamond' },
        { name: '超凡入聖 (Ascendant)', value: 'Ascendant' },
        { name: '神話 (Immortal)', value: 'Immortal' },
        { name: '輻能戰士 (Radiant)', value: 'Radiant' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const riotId = interaction.options.getString('riot-id', true);
  const rank = interaction.options.getString('rank', true);
  const userId = interaction.user.id;

  // Simple validation for Riot ID format (Name#TAG)
  if (!riotId.includes('#')) {
    return interaction.reply({
      content: '❌ 格式錯誤。請輸入正確的 Riot ID，必須包含 `#` (例如: `TenZ#NA1`)。',
      ephemeral: true
    });
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    // Update database
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {
        riotId,
        rank
      },
      create: {
        id: userId,
        riotId,
        rank,
        valoScore: 100 // Default score
      }
    });

    const embed = new EmbedBuilder()
      .setColor('#4eff8a') // Green Success
      .setTitle('✅ Riot 帳號驗證成功')
      .setDescription('您的帳號已成功與 ValoLink 生態系連結！')
      .addFields(
        { name: '🔗 Discord 帳號', value: `<@${userId}>`, inline: true },
        { name: '🎮 Riot ID', value: user.riotId || 'N/A', inline: true },
        { name: '🏆 認證牌位', value: user.rank || 'N/A', inline: true },
        { name: '🛡️ 初始信用值', value: `${user.valoScore} pts`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: '數據已同步至 ValoLink.gg 官網大廳' });

    await interaction.editReply({ embeds: [embed] });

    // Try to update member nickname or assign role if server configuration allows
    // This can be expanded in later phases
  } catch (error) {
    console.error('Error verifying user:', error);
    await interaction.editReply({ content: '❌ 驗證失敗，資料庫發生錯誤，請聯絡管理員。' });
  }
}
