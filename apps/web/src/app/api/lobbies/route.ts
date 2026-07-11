import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const lobbies = await prisma.lobby.findMany({
      where: {
        status: 'OPEN'
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
      captainName: lobby.captain.riotId || `Discord:${lobby.captainId}`,
      captainAvatar: (lobby.captain.riotId || '?')[0].toUpperCase(),
      valoScore: lobby.captain.valoScore,
      currentCount: lobby.members.length,
      maxCount: 5
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

    // 1. Create/update captain user
    await prisma.user.upsert({
      where: { id: discordId },
      update: { riotId: captainName, rank: minRank },
      create: {
        id: discordId,
        riotId: captainName,
        rank: minRank,
        valoScore: 100
      }
    });

    // 2. Create lobby
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

    return NextResponse.json({ success: true, lobbyId: lobby.id });
  } catch (error) {
    console.error('Failed to create lobby via web POST:', error);
    return NextResponse.json({ error: 'Failed to create lobby' }, { status: 500 });
  }
}
