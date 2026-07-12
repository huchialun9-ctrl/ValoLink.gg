import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';
import { postLobbyToDiscord } from '@/lib/discordBot';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const lobbies = await prisma.lobby.findMany({
      where: {
        status: { in: ['OPEN', 'PLAYING'] }
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
      captainName: lobby.captain.displayName || lobby.captain.riotId || lobby.captainId,
      captainAvatar: (lobby.captain.displayName || lobby.captain.riotId || '?')[0].toUpperCase(),
      valoScore: lobby.captain.valoScore,
      currentCount: lobby.members.length,
      maxCount: 5,
      status: lobby.status,
      membersList: lobby.members.map(m => ({
        id: m.userId,
        name: m.user.displayName || m.user.riotId || m.userId,
        avatar: m.user.avatar,
        inVoice: m.inVoice,
        isMuted: m.isMuted,
        valoScore: m.user.valoScore
      }))
    }));

    return NextResponse.json(formattedLobbies);
  } catch (error) {
    console.error('無法獲取大廳列表:', error);
    return NextResponse.json({ error: '獲取大廳失敗' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { captainName, userId, gameMode, minRank, description } = body;

    if (!captainName || !userId || !gameMode) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        valoScore: 100
      }
    });

    const lobby = await prisma.lobby.create({
      data: {
        captainId: userId,
        gameMode,
        minRank,
        description,
        status: 'OPEN'
      }
    });

    await prisma.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId: userId
      }
    });

    const discordSync = await postLobbyToDiscord(lobby.id);
    if (discordSync) {
      await prisma.lobby.update({
        where: { id: lobby.id },
        data: {
          discordMessageId: discordSync.messageId,
          discordChannelId: discordSync.channelId,
          discordGuildId: discordSync.guildId,
        },
      });
    }

    return NextResponse.json({ success: true, lobbyId: lobby.id });
  } catch (error) {
    console.error('建立大廳失敗:', error);
    return NextResponse.json({ error: '建立大廳失敗' }, { status: 500 });
  }
}
