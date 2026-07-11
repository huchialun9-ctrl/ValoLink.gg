import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
  }

  try {
    // 1. Fetch user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reputationLogs: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 2. Fetch user's historical lobbies (both led and joined)
    const lobbiesJoined = await prisma.lobbyMember.findMany({
      where: { userId },
      include: {
        lobby: {
          include: {
            captain: true,
            members: {
              include: {
                user: true
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    const historicalSquads = lobbiesJoined.map(mj => ({
      id: mj.lobby.id,
      gameMode: mj.lobby.gameMode,
      minRank: mj.lobby.minRank || 'Unranked',
      description: mj.lobby.description || '無備註。',
      status: mj.lobby.status,
      captain: mj.lobby.captain.riotId || `Discord:${mj.lobby.captainId}`,
      joinedAt: mj.joinedAt.toISOString().split('T')[0],
      memberCount: mj.lobby.members.length
    }));

    // 3. Extract unique list of past teammates
    const teammateMap = new Map<string, { id: string; riotId: string; valoScore: number }>();
    lobbiesJoined.forEach(mj => {
      mj.lobby.members.forEach(member => {
        if (member.userId !== userId && !teammateMap.has(member.userId)) {
          teammateMap.set(member.userId, {
            id: member.userId,
            riotId: member.user.riotId || `Discord:${member.userId}`,
            valoScore: member.user.valoScore
          });
        }
      });
    });
    const pastTeammates = Array.from(teammateMap.values());

    // 4. Construct credit history trend line data
    // Map reputation log history or initialize with default if empty
    const reputationTrend = user.reputationLogs.map(log => ({
      date: log.createdAt.toISOString().split('T')[0],
      score: log.newScore,
      reason: log.reason || '系統調整'
    }));

    // Prepend initial baseline score
    const creditHistory = [
      { date: user.createdAt.toISOString().split('T')[0], score: 100, reason: '帳號建立' },
      ...reputationTrend
    ];

    // Compute simple dashboard metrics
    const stats = {
      squadCount: lobbiesJoined.length,
      averageTeammateScore: pastTeammates.length > 0 
        ? Math.round(pastTeammates.reduce((acc, curr) => acc + curr.valoScore, 0) / pastTeammates.length)
        : 100,
      valoScore: user.valoScore,
      riotId: user.riotId || '未認證 Riot ID',
      rank: user.rank || '未認證牌位',
      winRate: 54 // Placeholder metric for MVP front-end visual
    };

    return NextResponse.json({
      stats,
      historicalSquads,
      pastTeammates,
      creditHistory
    });

  } catch (error) {
    console.error('Failed to compile user dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
