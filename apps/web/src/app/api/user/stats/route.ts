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
    // 1. Fetch user profile with full reputation log
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        reputationLogs: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch lobbies this user has joined, with all members
    const lobbiesJoined = await prisma.lobbyMember.findMany({
      where: { userId },
      include: {
        lobby: {
          include: {
            captain: true,
            members: {
              include: { user: true }
            }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    const historicalSquads = lobbiesJoined.map(mj => ({
      id: mj.lobby.id,
      gameMode: mj.lobby.gameMode,
      minRank: mj.lobby.minRank || 'Unranked',
      description: mj.lobby.description || '',
      status: mj.lobby.status,
      captain: mj.lobby.captain.riotId || `Discord:${mj.lobby.captainId}`,
      joinedAt: mj.joinedAt.toISOString().split('T')[0],
      memberCount: mj.lobby.members.length
    }));

    // 3. Extract unique past teammates (excluding self)
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

    // 4. Build ValoScore trend from real reputation log entries only
    // First point = account creation baseline, subsequent = real log events
    const creditHistory = [
      { date: user.createdAt.toISOString().split('T')[0], score: 100, reason: '帳號建立' },
      ...user.reputationLogs.map(log => ({
        date: log.createdAt.toISOString().split('T')[0],
        score: log.newScore,
        reason: log.reason || '信用分調整'
      }))
    ];

    // 5. Compute real aggregate stats — no hardcoded values
    const totalSquads = lobbiesJoined.length;
    const avgTeammateScore = pastTeammates.length > 0
      ? Math.round(
          pastTeammates.reduce((acc, t) => acc + t.valoScore, 0) / pastTeammates.length
        )
      : null; // null = no data yet, shown as N/A in UI

    // Real win rate: count of CLOSED lobbies user was in vs total finished
    const finishedSquads = lobbiesJoined.filter(
      mj => mj.lobby.status === 'CLOSED' || mj.lobby.status === 'PLAYING'
    ).length;

    const stats = {
      squadCount: totalSquads,
      finishedSquads,
      averageTeammateScore: avgTeammateScore,
      valoScore: user.valoScore,
      riotId: user.riotId || null,
      rank: user.rank || null,
    };

    return NextResponse.json({
      stats,
      historicalSquads,
      pastTeammates,
      creditHistory
    });

  } catch (error) {
    console.error('[stats] Failed to compile dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
