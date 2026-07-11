import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const topUsers = await prisma.user.findMany({
      orderBy: {
        valoScore: 'desc'
      },
      take: 50 // Limit to top 50 players
    });

    const formattedLeaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      riotId: user.riotId || '未綁定 Riot ID',
      gameRank: user.rank || '未配對牌位',
      valoScore: user.valoScore,
      joinedAt: user.createdAt.toISOString().split('T')[0]
    }));

    return NextResponse.json(formattedLeaderboard);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
