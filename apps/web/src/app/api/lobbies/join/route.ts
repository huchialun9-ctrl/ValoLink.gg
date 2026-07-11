import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

// Helper to push update payload directly to Discord API via REST
async function updateDiscordEmbed(lobbyId: string) {
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

  const fields = [
    { name: '👑 隊長', value: `<@${lobby.captainId}>`, inline: true },
    { name: '🎯 模式', value: lobby.gameMode, inline: true },
    { name: '🏆 牌位限制', value: lobby.minRank || '無限制', inline: true },
    { 
      name: `👥 隊伍成員 (${currentCount}/${maxCount})`, 
      value: lobby.members.map((m, index) => `${index + 1}. <@${m.userId}> (ValoScore: ${m.user.valoScore}) ${m.inVoice ? '🎙️ [語音中]' : ''}`).join('\n') || '尚無成員'
    }
  ];

  const payload = {
    embeds: [{
      color: 0xff4654, // Valorant Red
      title: `🎮 ValoLink.gg — 揪團大廳`,
      description: lobby.description || '目前沒有備註。來加入一起打吧！',
      fields,
      footer: { text: `Lobby ID: ${lobby.id} • 數據與 ValoLink.gg 網頁同步` },
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
          disabled: lobby.status !== 'OPEN' || currentCount >= maxCount
        },
        {
          type: 2,
          custom_id: `lobby_leave_${lobby.id}`,
          label: '退出 (Leave)',
          style: 2, // Secondary
          disabled: lobby.status !== 'OPEN'
        },
        {
          type: 2,
          custom_id: `lobby_lock_${lobby.id}`,
          label: '出發開打 (Start)',
          style: 3, // Success
          disabled: lobby.status !== 'OPEN'
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
    console.error('Failed to dispatch REST PATCH embed update to Discord:', err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lobbyId, userId } = body;

    if (!lobbyId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Fetch lobby details
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: { members: true }
    });

    if (!lobby || lobby.status !== 'OPEN') {
      return NextResponse.json({ error: 'Lobby is not open or does not exist' }, { status: 400 });
    }

    // 2. Check if already member
    const isAlreadyMember = lobby.members.some(m => m.userId === userId);
    if (isAlreadyMember) {
      return NextResponse.json({ error: 'Already a member of this squad' }, { status: 400 });
    }

    if (lobby.members.length >= 5) {
      return NextResponse.json({ error: 'Lobby is already full' }, { status: 400 });
    }

    // 3. Check reputation score gates
    const config = lobby.discordGuildId ? await prisma.serverConfig.findUnique({
      where: { guildId: lobby.discordGuildId }
    }) : null;

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, valoScore: 100 }
    });

    if (config && user.valoScore < config.minValoScore) {
      return NextResponse.json({ 
        error: `您的信用分數為 ${user.valoScore}，低於該伺服器最低限制門檻 (${config.minValoScore})！` 
      }, { status: 403 });
    }

    // 4. Create membership record
    await prisma.lobbyMember.create({
      data: {
        lobbyId,
        userId
      }
    });

    // 5. Trigger Discord REST embed update async
    await updateDiscordEmbed(lobbyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to join lobby via web API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
