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

    // Map database structures to match the frontend expectations
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
