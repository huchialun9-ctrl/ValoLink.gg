import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  PermissionFlagsBits,
  ChannelType
} from 'discord.js';
import { prisma } from '@valolink/db';

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('設定與管理 ValoLink.gg 機器人行為 (Configure bot settings)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand.setName('view')
      .setDescription('檢視目前伺服器的設定檔 (View current server settings)')
  )
  .addSubcommand(subcommand =>
    subcommand.setName('setup')
      .setDescription('更新伺服器設定檔 (Update settings)')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('揪團公告文字頻道 (Lobby Text Channel)')
          .addChannelTypes(ChannelType.GuildText)
      )
      .addChannelOption(option =>
        option.setName('voice-category')
          .setDescription('臨時語音類別分區 (Temporary Voice Category)')
          .addChannelTypes(ChannelType.GuildCategory)
      )
      .addIntegerOption(option =>
        option.setName('min-score')
          .setDescription('最低加入信用分限制 (30 - 100)')
          .setMinValue(30)
          .setMaxValue(100)
      )
      .addBooleanOption(option =>
        option.setName('auto-voice')
          .setDescription('是否啟用自動建立語音頻道 (Enable dynamic VCs)')
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    return interaction.reply({ content: '❌ 此指令僅能在伺服器內使用。', ephemeral: true });
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    await interaction.deferReply({ ephemeral: true });

    // Fetch existing config or default
    let config = await prisma.serverConfig.findUnique({
      where: { guildId }
    });

    if (subcommand === 'view') {
      const embed = new EmbedBuilder()
        .setColor('#0969da')
        .setTitle('⚙️ ValoLink.gg 伺服器配置設定')
        .setDescription(`伺服器 ID: \`${guildId}\``)
        .addFields(
          { 
            name: '📢 揪團公告文字頻道', 
            value: config?.lobbyChannelId ? `<#${config.lobbyChannelId}>` : '❌ 未設定 (全頻道皆可發起)', 
            inline: true 
          },
          { 
            name: '📁 語音類別分區', 
            value: config?.voiceCategoryId ? `<#${config.voiceCategoryId}>` : '❌ 未設定 (將在根目錄建立)', 
            inline: true 
          },
          { 
            name: '🛡️ 最低信用分數門檻', 
            value: `**${config?.minValoScore ?? 50} pts**`, 
            inline: true 
          },
          { 
            name: '⚡ 自動語音房建立', 
            value: config?.autoVoice !== false ? '🟢 啟用' : '🔴 停用', 
            inline: true 
          }
        )
        .setTimestamp()
        .setFooter({ text: '管理員設定面板 • 數據與網頁端雙向同步' });

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const voiceCategory = interaction.options.getChannel('voice-category');
      const minScore = interaction.options.getInteger('min-score');
      const autoVoice = interaction.options.getBoolean('auto-voice');

      // Prepare updates
      const updateData: any = {};
      if (channel) updateData.lobbyChannelId = channel.id;
      if (voiceCategory) updateData.voiceCategoryId = voiceCategory.id;
      if (minScore !== null) updateData.minValoScore = minScore;
      if (autoVoice !== null) updateData.autoVoice = autoVoice;

      config = await prisma.serverConfig.upsert({
        where: { guildId },
        update: updateData,
        create: {
          guildId,
          lobbyChannelId: channel?.id || null,
          voiceCategoryId: voiceCategory?.id || null,
          minValoScore: minScore ?? 50,
          autoVoice: autoVoice ?? true
        }
      });

      const successEmbed = new EmbedBuilder()
        .setColor('#4eff8a')
        .setTitle('✅ 伺服器設定更新成功')
        .setDescription('設定已立即生效並同步至網頁主控台！')
        .addFields(
          { 
            name: '📢 揪團公告頻道', 
            value: config.lobbyChannelId ? `<#${config.lobbyChannelId}>` : '未設定', 
            inline: true 
          },
          { 
            name: '📁 語音類別分區', 
            value: config.voiceCategoryId ? `<#${config.voiceCategoryId}>` : '未設定', 
            inline: true 
          },
          { 
            name: '🛡️ 最低門檻限制', 
            value: `**${config.minValoScore} pts**`, 
            inline: true 
          },
          { 
            name: '⚡ 自動語音房建立', 
            value: config.autoVoice ? '🟢 啟用' : '🔴 停用', 
            inline: true 
          }
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [successEmbed] });
    }
  } catch (error) {
    console.error('Error handling config command:', error);
    await interaction.editReply({ content: '❌ 無法處理設定命令，資料庫連接失敗。' });
  }
}
