import { prisma } from '@valolink/db';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

export async function postLobbyToDiscord(lobbyId: string) {
  if (!DISCORD_TOKEN) return null;

  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      captain: true,
      members: { include: { user: true } },
    },
  });

  if (!lobby) return null;

  const config = await prisma.serverConfig.findFirst();
  if (!config || !config.lobbyChannelId) return null;

  const currentCount = lobby.members.length;
  const maxCount = 5;

  const fields = [
    { name: '👑 隊長', value: `<@${lobby.captainId}>`, inline: true },
    { name: '🎯 模式', value: lobby.gameMode, inline: true },
    { name: '🏆 牌位限制', value: lobby.minRank || '無限制', inline: true },
    {
      name: `👥 成員 (${currentCount}/${maxCount})`,
      value: lobby.members.map((m, i) => `${i + 1}. <@${m.userId}>${m.inVoice ? ' 🎙️' : ''}`).join('\n') || '尚無成員',
    },
  ];

  const payload: any = {
    embeds: [{
      color: lobby.status === 'PLAYING' ? 0x238636 : lobby.status === 'CLOSED' ? 0x8b949e : 0xff4654,
      title: lobby.status === 'PLAYING' ? '⚔️ 戰局已開始' : lobby.status === 'CLOSED' ? '🔒 房間已關閉' : '🎮 ValoLink 揪團大廳',
      description: lobby.description || '來一起打吧！',
      fields,
      footer: { text: `ID: ${lobby.id} • ${lobby.status}` },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${config.lobbyChannelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const msg = await res.json();
      return { messageId: msg.id, channelId: config.lobbyChannelId, guildId: config.guildId };
    }
  } catch (e) {
    console.error('Discord sync failed:', e);
  }
  return null;
}

export async function updateDiscordEmbed(lobbyId: string) {
  if (!DISCORD_TOKEN) return;

  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      captain: true,
      members: { include: { user: true } },
    },
  });

  if (!lobby || !lobby.discordChannelId || !lobby.discordMessageId) return;

  const currentCount = lobby.members.length;
  const maxCount = 5;

  const fields = [
    { name: '👑 隊長', value: `<@${lobby.captainId}>`, inline: true },
    { name: '🎯 模式', value: lobby.gameMode, inline: true },
    { name: '🏆 牌位限制', value: lobby.minRank || '無限制', inline: true },
    {
      name: `👥 成員 (${currentCount}/${maxCount})`,
      value: lobby.members.map((m, i) => `${i + 1}. <@${m.userId}>${m.inVoice ? ' 🎙️' : ''}`).join('\n') || '尚無成員',
    },
  ];

  const payload: any = {
    embeds: [{
      color: lobby.status === 'PLAYING' ? 0x238636 : lobby.status === 'CLOSED' ? 0x8b949e : 0xff4654,
      title: lobby.status === 'PLAYING' ? '⚔️ 戰局已開始' : lobby.status === 'CLOSED' ? '🔒 房間已關閉' : '🎮 ValoLink 揪團大廳',
      description: lobby.description || '',
      fields,
      footer: { text: `ID: ${lobby.id} • ${lobby.status}` },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    await fetch(`https://discord.com/api/v10/channels/${lobby.discordChannelId}/messages/${lobby.discordMessageId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Discord embed update failed:', e);
  }
}
