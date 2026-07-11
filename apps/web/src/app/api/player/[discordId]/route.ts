import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ discordId: string }> }
) {
  const { discordId } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: discordId },
      include: {
        reputationLogs: { orderBy: { createdAt: 'asc' } },
        ratingsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Aggregate ratings received
    const totalRatings = user.ratingsReceived.length;
    const goodCount  = user.ratingsReceived.filter(r => r.ratingType === 'good').length;
    const toxicCount = user.ratingsReceived.filter(r => r.ratingType === 'toxic').length;
    const afkCount   = user.ratingsReceived.filter(r => r.ratingType === 'afk').length;

    // Lobbies joined
    const lobbiesJoined = await prisma.lobbyMember.findMany({
      where: { userId: discordId },
      include: { lobby: { include: { captain: true } } },
      orderBy: { joinedAt: 'desc' },
      take: 10
    });

    const creditHistory = [
      { date: user.createdAt.toISOString().split('T')[0], score: 100, reason: '帳號建立' },
      ...user.reputationLogs.map(log => ({
        date: log.createdAt.toISOString().split('T')[0],
        score: log.newScore,
        reason: log.reason || '信用分調整'
      }))
    ];

    return NextResponse.json({
      id: user.id,
      riotId: user.riotId,
      rank: user.rank,
      valoScore: user.valoScore,
      isSuspicious: user.isSuspicious,
      memberSince: user.createdAt.toISOString().split('T')[0],
      ratingStats: { totalRatings, goodCount, toxicCount, afkCount },
      creditHistory,
      recentSquads: lobbiesJoined.map(mj => ({
        id: mj.lobby.id,
        gameMode: mj.lobby.gameMode,
        status: mj.lobby.status,
        captain: mj.lobby.captain.riotId || `Discord:${mj.lobby.captainId}`,
        joinedAt: mj.joinedAt.toISOString().split('T')[0]
      }))
    });
  } catch (error) {
    console.error('[player API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
