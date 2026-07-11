import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@valolink/db';
import { fetchUserRank } from '../utils/riot';

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('綁定特戰英豪 Riot ID 並自動同步牌位 (Bind your Riot ID and auto-sync Rank)')
  .addStringOption(option =>
    option.setName('riot-id')
      .setDescription('您的 Riot ID (例如: User#TAG)')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const riotId = interaction.options.getString('riot-id', true);
  const userId = interaction.user.id;

  if (!riotId.includes('#')) {
    return interaction.reply({
      content: '❌ 格式錯誤。請輸入正確的 Riot ID，必須包含 `#` (例如: `TenZ#NA1`)。',
      ephemeral: true
    });
  }

  try {
    await interaction.deferReply({ ephemeral: true });

    // 1. Fetch rank from Riot API / Deterministic generator
    const rank = await fetchUserRank(riotId);

    // 2. Update database
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
      .setTitle('✅ Riot 帳號綁定暨牌位同步成功')
      .setDescription('您的帳號已成功與 ValoLink 智慧平台連結！')
      .addFields(
        { name: '🔗 Discord 帳號', value: `<@${userId}>`, inline: true },
        { name: '🎮 Riot ID', value: user.riotId || 'N/A', inline: true },
        { name: '🏆 自動同步牌位', value: `**${user.rank}**`, inline: true },
        { name: '🛡️ 初始信用值', value: `${user.valoScore} pts`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: '數據已同步至 ValoLink.gg 官網大廳' });

    await interaction.editReply({ embeds: [embed] });

    // Handle Discord role sync helper
    if (interaction.guild && rank) {
      try {
        const guild = interaction.guild;
        const member = await guild.members.fetch(userId);
        
        // Find or create role based on rank name
        const roleName = `Valorant - ${rank}`;
        let role = guild.roles.cache.find(r => r.name === roleName);
        
        if (!role) {
          // Color representations for Valorant ranks
          const rankColors: Record<string, number> = {
            'Iron': 0x8b8b8b,
            'Bronze': 0xa17453,
            'Silver': 0xc0c0c0,
            'Gold': 0xe5c158,
            'Platinum': 0x4da6ff,
            'Diamond': 0xb366ff,
            'Ascendant': 0x1ad682,
            'Immortal': 0xff4655,
            'Radiant': 0xffff99
          };
          
          role = await guild.roles.create({
            name: roleName,
            color: rankColors[rank] || 0xffffff,
            reason: 'ValoLink Rank Role Synchronization'
          });
        }
        
        // Remove other rank roles first to avoid duplicate rank roles
        const allRankRoles = guild.roles.cache.filter(r => r.name.startsWith('Valorant - '));
        for (const [rId, rRole] of allRankRoles) {
          if (member.roles.cache.has(rId)) {
            await member.roles.remove(rRole);
          }
        }

        // Add new rank role
        await member.roles.add(role);
      } catch (roleErr) {
        console.warn('Failed to sync Discord rank role:', roleErr);
      }
    }

  } catch (error) {
    console.error('Error verifying user:', error);
    await interaction.editReply({ content: '❌ 驗證失敗，請重新輸入，或確認資料庫狀態是否正常。' });
  }
}
