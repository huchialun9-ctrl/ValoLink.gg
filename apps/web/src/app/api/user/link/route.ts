import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

const RIOT_API_KEY = process.env.RIOT_API_KEY;

async function fetchRealRank(riotId: string): Promise<{ rank: string | null; error?: string }> {
  if (!RIOT_API_KEY || !RIOT_API_KEY.startsWith('RGAPI-')) {
    return { rank: null, error: 'RIOT_API_KEY 未設定或格式不正確' };
  }

  try {
    const [name, tag] = riotId.split('#');

    const accountRes = await fetch(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    if (accountRes.status === 404) {
      return { rank: null, error: '找不到此 Riot 帳號，請確認 ID 是否正確' };
    }
    if (!accountRes.ok) {
      return { rank: null, error: 'Riot API 帳號查詢失敗 (HTTP ' + accountRes.status + ')' };
    }

    const { puuid } = await accountRes.json();

    const rankRes = await fetch(
      `https://api.henrikdev.xyz/valorant/v1/by-puuid/mmr/ap/${puuid}`,
      { headers: { 'Authorization': RIOT_API_KEY } }
    );

    if (rankRes.status === 404) {
      return { rank: null, error: '尚未進行過競技模式，無牌位資料' };
    }
    if (!rankRes.ok) {
      return { rank: null, error: '牌位查詢服務暫時無法使用' };
    }

    const rankData = await rankRes.json();
    const tier = rankData?.data?.currenttierpatched;
    return { rank: tier || null, error: tier ? undefined : '取得牌位資料為空' };
  } catch (err) {
    return { rank: null, error: '連線至 Riot API 失敗，請稍後再試' };
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

    const { rank, error: rankError } = await fetchRealRank(riotId);

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { riotId, rank }
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return NextResponse.json({ error: '此 Riot ID 已經被其他帳號綁定' }, { status: 409 });
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      riotId,
      rank,
      rankVerified: rank !== null,
      rankError: rankError || null
    });
  } catch (error: any) {
    console.error('[link] Failed to link Riot ID:', error?.message || error);
    return NextResponse.json({ error: error?.message === 'fetch failed' ? '無法連線至 Riot API，請稍後再試' : '伺服器內部錯誤' }, { status: 500 });
  }
}
