import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

// Helper to post embed card to Discord channel when room is created on web
async function postLobbyToDiscord(lobbyId: string) {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return null;

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

  // Retrieve the first configured guild settings
  const config = await prisma.serverConfig.findFirst();
  if (!config || !config.lobbyChannelId) {
    console.warn('No Discord server config found to broadcast lobby card.');
    return null;
  }

  const currentCount = lobby.members.length;
  const maxCount = 5;

  const fields = [
    { name: '👑 隊長', value: `<@${lobby.captainId}>`, inline: true },
    { name: '🎯 模式', value: lobby.gameMode, inline: true },
    { name: '🏆 牌位限制', value: lobby.minRank || '無限制', inline: true },
    { 
      name: `👥 隊伍成員 (${currentCount}/${maxCount})`, 
      value: lobby.members.map((m, index) => `${index + 1}. <@${m.userId}> (ValoScore: ${m.user.valoScore})`).join('\n') || '尚無成員'
    }
  ];

  const payload = {
    embeds: [{
      color: 0xff4654, // Valorant Red
      title: `🎮 ValoLink.gg — 揪團大廳 (網頁發起)`,
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
    const res = await fetch(`https://discord.com/api/v10/channels/${config.lobbyChannelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const msgData = await res.json();
      return {
        messageId: msgData.id,
        channelId: config.lobbyChannelId,
        guildId: config.guildId
      };
    } else {
      console.error('Failed to post message to Discord:', await res.text());
    }
  } catch (err) {
    console.error('REST call failed to post lobby to Discord:', err);
  }
  return null;
}

export async function GET() {
  try {
    const lobbies = await prisma.lobby.findMany({
      where: {
        status: { in: ['OPEN', 'PLAYING'] } // Show both open and playing matches on dashboard
      },
      include: {
        captain: true,
        members: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedLobbies = lobbies.map(lobby => ({
      id: lobby.id,
      mode: lobby.gameMode,
      minRank: lobby.minRank || 'Unranked',
      description: lobby.description || '無備註。',
      captainId: lobby.captainId,
      captainName: lobby.captain.riotId || `Discord:${lobby.captainId}`,
      captainAvatar: (lobby.captain.riotId || '?')[0].toUpperCase(),
      valoScore: lobby.captain.valoScore,
      currentCount: lobby.members.length,
      maxCount: 5,
      status: lobby.status,
      voiceChannelId: lobby.voiceChannelId,
      discordGuildId: lobby.discordGuildId,
      membersList: lobby.members.map(m => ({
        id: m.userId,
        riotId: m.user.riotId || `Discord:${m.userId}`,
        inVoice: m.inVoice,
        valoScore: m.user.valoScore
      }))
    }));

    return NextResponse.json(formattedLobbies);
  } catch (error) {
    console.error('Failed to fetch real-time lobbies from database:', error);
    return NextResponse.json({ error: 'Failed to fetch lobbies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { captainName, discordId, gameMode, minRank, description } = body;

    if (!captainName || !discordId || !gameMode) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Ensure captain exists in DB — never overwrite real rank data
    await prisma.user.upsert({
      where: { id: discordId },
      update: {},  // do not overwrite riotId or rank from lobby form
      create: {
        id: discordId,
        valoScore: 100
      }
    });

    // 2. Create lobby in database
    const lobby = await prisma.lobby.create({
      data: {
        captainId: discordId,
        gameMode,
        minRank,
        description,
        status: 'OPEN'
      }
    });

    // 3. Add captain as lobby member
    await prisma.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId: discordId
      }
    });

    // 4. Synchronize to Discord channel as an interactive card
    const discordSync = await postLobbyToDiscord(lobby.id);
    if (discordSync) {
      await prisma.lobby.update({
        where: { id: lobby.id },
        data: {
          discordMessageId: discordSync.messageId,
          discordChannelId: discordSync.channelId,
          discordGuildId: discordSync.guildId
        }
      });
    }

    return NextResponse.json({ success: true, lobbyId: lobby.id });
  } catch (error) {
    console.error('Failed to create lobby via web POST:', error);
    return NextResponse.json({ error: 'Failed to create lobby' }, { status: 500 });
  }
}
