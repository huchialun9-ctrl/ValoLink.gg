import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

const RIOT_API_KEY = process.env.RIOT_API_KEY;

/**
 * Fetches real Valorant rank via Riot Account API + HenrikDev proxy.
 * Returns null if lookup fails — never returns fake data.
 */
async function fetchRealRank(riotId: string): Promise<string | null> {
  if (!RIOT_API_KEY || !RIOT_API_KEY.startsWith('RGAPI-')) return null;

  try {
    const [name, tag] = riotId.split('#');

    const accountRes = await fetch(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    if (!accountRes.ok) return null;

    const { puuid } = await accountRes.json();

    const rankRes = await fetch(
      `https://api.henrikdev.xyz/valorant/v1/by-puuid/mmr/ap/${puuid}`,
      { headers: { 'Authorization': RIOT_API_KEY } }
    );

    if (!rankRes.ok) return null;

    const rankData = await rankRes.json();
    return rankData?.data?.currenttierpatched || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, riotId } = body;

    if (!userId || !riotId || !riotId.includes('#')) {
      return NextResponse.json(
        { error: 'Riot ID 格式必須包含 # (例如: TenZ#NA1)' },
        { status: 400 }
      );
    }

    // Fetch real rank — null means unverified, NOT fabricated
    const resolvedRank = await fetchRealRank(riotId);

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        riotId,
        rank: resolvedRank  // null = 未能驗證牌位
      }
    });

    return NextResponse.json({
      success: true,
      riotId: user.riotId,
      rank: user.rank,
      rankVerified: resolvedRank !== null
    });
  } catch (error) {
    console.error('[link] Failed to link Riot ID:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
