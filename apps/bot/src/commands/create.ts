import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  PermissionFlagsBits
} from 'discord.js';
import { prisma } from '@valolink/db';

export const data = new SlashCommandBuilder()
  .setName('create')
  .setDescription('建立一個特戰英豪揪團 Lobby (Create a Valorant squad lobby)')
  .addStringOption(option =>
    option.setName('mode')
      .setDescription('遊戲模式 (Game Mode)')
      .setRequired(true)
      .addChoices(
        { name: '競技模式 (Competitive)', value: 'Competitive' },
        { name: '一般模式 (Unrated)', value: 'Unrated' },
        { name: '超急速衝鋒 (Swiftplay)', value: 'Swiftplay' },
        { name: '首要對決 (Premier)', value: 'Premier' }
      )
  )
  .addStringOption(option =>
    option.setName('min-rank')
      .setDescription('最低牌位限制 (Minimum Rank)')
      .addChoices(
        { name: '無限制 (Any Rank)', value: 'Unranked' },
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
  )
  .addStringOption(option =>
    option.setName('description')
      .setDescription('隊伍備註 (e.g., 缺控場/開麥/歡樂打)')
      .setMaxLength(100)
  );

export async function generateLobbyEmbed(lobbyId: string) {
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      captain: true,
      members: {
        include: {
          user: true
        }
      }
    }
  });

  if (!lobby) return null;

  const currentCount = lobby.members.length;
  const maxCount = 5;

  const embed = new EmbedBuilder()
    .setColor('#ff4654') // Valorant Red
    .setTitle(`🎮 ValoLink.gg — 揪團大廳`)
    .setDescription(lobby.description || '目前沒有備註。來加入一起打吧！')
    .addFields(
      { name: '👑 隊長', value: `<@${lobby.captainId}>`, inline: true },
      { name: '🎯 模式', value: lobby.gameMode, inline: true },
      { name: '🏆 牌位限制', value: lobby.minRank || '無限制', inline: true },
      { 
        name: `👥 隊伍成員 (${currentCount}/${maxCount})`, 
        value: lobby.members.map((m, index) => `${index + 1}. <@${m.userId}> (ValoScore: ${m.user.valoScore}) ${m.inVoice ? '🎙️ [語音中]' : ''}`).join('\n') || '尚無成員'
      }
    )
    .setFooter({ text: `Lobby ID: ${lobby.id} • 數據與 ValoLink.gg 網頁同步` })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`lobby_join_${lobby.id}`)
        .setLabel('加入 (Join)')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(lobby.status !== 'OPEN' || currentCount >= maxCount),
      new ButtonBuilder()
        .setCustomId(`lobby_leave_${lobby.id}`)
        .setLabel('退出 (Leave)')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(lobby.status !== 'OPEN'),
      new ButtonBuilder()
        .setCustomId(`lobby_lock_${lobby.id}`)
        .setLabel('出發開打 (Start)')
        .setStyle(ButtonStyle.Success)
        .setDisabled(lobby.status !== 'OPEN')
    );

  return { embeds: [embed], components: [row] };
}

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const mode = interaction.options.getString('mode', true);
  const minRank = interaction.options.getString('min-rank') || 'Unranked';
  const description = interaction.options.getString('description') || '';
  const userId = interaction.user.id;

  try {
    // 1. Ensure captain exists in DB
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId }
    });

    // 2. Create the lobby
    const lobby = await prisma.lobby.create({
      data: {
        captainId: userId,
        gameMode: mode,
        minRank,
        description,
        status: 'OPEN'
      }
    });

    // 3. Add captain as member
    await prisma.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId
      }
    });

    // 4. Generate visual elements
    const payload = await generateLobbyEmbed(lobby.id);
    if (!payload) {
      return interaction.editReply({ content: '建立 Lobby 失敗，請重試！' });
    }

    const message = await interaction.editReply(payload);

    // 5. Update message ID in DB
    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        discordMessageId: message.id,
        discordChannelId: interaction.channelId,
        discordGuildId: interaction.guildId
      }
    });

  } catch (error) {
    console.error('Error creating lobby:', error);
    await interaction.editReply({ content: '系統發生錯誤，無法建立 Lobby。' });
  }
}
