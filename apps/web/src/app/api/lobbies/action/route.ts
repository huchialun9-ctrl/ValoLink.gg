import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

// Helper to update the Discord embed with new status
async function updateDiscordEmbed(lobbyId: string, inviteUrl?: string) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return;

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

  if (!lobby || !lobby.discordChannelId || !lobby.discordMessageId) return;

  const currentCount = lobby.members.length;
  const maxCount = 5;

  let title = `🎮 ValoLink.gg — 揪團大廳`;
  let color = 0xff4654; // Valorant Red

  if (lobby.status === 'PLAYING') {
    title = `⚔️ ValoLink.gg — 戰局已開始`;
    color = 0x238636; // Success Green
  } else if (lobby.status === 'CLOSED') {
    title = `🔒 ValoLink.gg — 房間已關閉`;
    color = 0x8b949e; // Neutral Grey
  }

  const fields = [
    { name: '👑 隊長', value: `<@${lobby.captainId}>`, inline: true },
    { name: '🎯 模式', value: lobby.gameMode, inline: true },
    { name: '🏆 牌位限制', value: lobby.minRank || '無限制', inline: true },
    { 
      name: `👥 隊伍成員 (${currentCount}/${maxCount})`, 
      value: lobby.members.map((m, index) => `${index + 1}. <@${m.userId}> (ValoScore: ${m.user.valoScore}) ${m.inVoice ? '🎙️ [語音中]' : ''}`).join('\n') || '尚無成員'
    }
  ];

  if (inviteUrl) {
    fields.push({ name: '🔊 戰術語音通道', value: `[🔗 點擊加入語音頻道](${inviteUrl})`, inline: false });
  }

  const payload = {
    embeds: [{
      color,
      title,
      description: lobby.status === 'PLAYING' 
        ? '隊伍已出發開打！祝你們旗開得勝！🎉' 
        : (lobby.status === 'CLOSED' ? '此揪團隊伍已被解散。' : lobby.description),
      fields,
      footer: { text: `Lobby ID: ${lobby.id} • 狀態: ${lobby.status}` },
      timestamp: new Date().toISOString()
    }],
    components: [{
      type: 1, // ActionRow
      components: [
        {
          type: 2, // Button
          custom_id: `lobby_join_${lobby.id}`,
          label: '加入 (Join)',
          style: 1, // Primary
          disabled: true
        },
        {
          type: 2,
          custom_id: `lobby_leave_${lobby.id}`,
          label: '退出 (Leave)',
          style: 2, // Secondary
          disabled: true
        },
        {
          type: 2,
          custom_id: `lobby_lock_${lobby.id}`,
          label: '已開打 (Playing)',
          style: 3, // Success
          disabled: true
        }
      ]
    }]
  };

  try {
    await fetch(`https://discord.com/api/v10/channels/${lobby.discordChannelId}/messages/${lobby.discordMessageId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Failed to update Discord Embed status:', err);
  }
}

// Provision dynamic voice channel and generate invite code via Discord REST API
async function createTemporaryVoice(lobbyId: string, guildId: string, categoryId?: string) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return null;

  try {
    // 1. Create VC
    const channelPayload = {
      name: `🔊 ValoLink #${lobbyId.slice(0, 4)}`,
      type: 2, // GUILD_VOICE
      parent_id: categoryId || null
    };

    const channelRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(channelPayload)
    });

    if (!channelRes.ok) {
      console.error('Failed to create voice channel:', await channelRes.text());
      return null;
    }

    const channelData = await channelRes.json();
    const voiceChannelId = channelData.id;

    // 2. Create Invite Code
    const invitePayload = {
      max_age: 3600, // 1 hour
      max_uses: 5
    };

    const inviteRes = await fetch(`https://discord.com/api/v10/channels/${voiceChannelId}/invites`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invitePayload)
    });

    if (!inviteRes.ok) {
      console.error('Failed to create invite code:', await inviteRes.text());
      return { voiceChannelId, inviteUrl: `discord://discord.com/channels/${guildId}/${voiceChannelId}` };
    }

    const inviteData = await inviteRes.json();
    return { voiceChannelId, inviteUrl: `https://discord.gg/${inviteData.code}` };

  } catch (err) {
    console.error('Error provisioning dynamic voice channel via REST API:', err);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lobbyId, action, userId } = body; // action: 'start' | 'close'

    if (!lobbyId || !action || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Verify Lobby existence and Captain permission
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId }
    });

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
    }

    if (lobby.captainId !== userId) {
      return NextResponse.json({ error: 'Unauthorized: Only the Captain can perform this action' }, { status: 403 });
    }

    if (action === 'start') {
      if (lobby.status !== 'OPEN') {
        return NextResponse.json({ error: 'Lobby is not open' }, { status: 400 });
      }

      let inviteUrl = '';
      let voiceChannelId = null;

      // Create Voice room if server config is active
      if (lobby.discordGuildId) {
        const config = await prisma.serverConfig.findUnique({
          where: { guildId: lobby.discordGuildId }
        });

        if (config && config.autoVoice) {
          const voiceSetup = await createTemporaryVoice(
            lobby.id, 
            lobby.discordGuildId, 
            config.voiceCategoryId || undefined
          );
          if (voiceSetup) {
            inviteUrl = voiceSetup.inviteUrl;
            voiceChannelId = voiceSetup.voiceChannelId;
          }
        }
      }

      // Update Database
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: {
          status: 'PLAYING',
          voiceChannelId
        }
      });

      // Update Discord embeds
      await updateDiscordEmbed(lobbyId, inviteUrl || undefined);

      return NextResponse.json({ success: true, inviteUrl });
    }

    if (action === 'close') {
      // Update Database
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { status: 'CLOSED' }
      });

      // Update Discord embeds
      await updateDiscordEmbed(lobbyId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });

  } catch (error) {
    console.error('Failed to trigger captain lobby action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
