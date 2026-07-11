import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, riotId } = body;

    if (!userId || !riotId || !riotId.includes('#')) {
      return NextResponse.json({ error: 'Riot ID 格式必須包含 # (例如: TenZ#NA1)' }, { status: 400 });
    }

    // Determine rank deterministically based on character hashing (simulating Riot API lookup fallbacks)
    const namePart = riotId.split('#')[0];
    const ranks = [
      'Platinum 1', 
      'Platinum 2', 
      'Diamond 1', 
      'Diamond 2', 
      'Ascendant 1', 
      'Ascendant 3', 
      'Immortal 1',
      'Immortal 2'
    ];
    let hash = 0;
    for (let i = 0; i < namePart.length; i++) {
      hash = namePart.charCodeAt(i) + ((hash << 5) - hash);
    }
    const resolvedRank = ranks[Math.abs(hash) % ranks.length];

    // Update in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        riotId,
        rank: resolvedRank
      }
    });

    return NextResponse.json({ 
      success: true, 
      riotId: user.riotId, 
      rank: user.rank 
    });
  } catch (error) {
    console.error('Failed to link Riot ID via web API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
