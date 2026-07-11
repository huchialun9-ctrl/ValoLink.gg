import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderId, targetId, rating } = body; // rating: 'good' | 'toxic' | 'afk'

    if (!senderId || !targetId || !rating) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (senderId === targetId) {
      return NextResponse.json({ error: 'You cannot rate yourself' }, { status: 400 });
    }

    // Determine score adjustment
    let diff = 0;
    let desc = '';
    if (rating === 'good') {
      diff = 2;
      desc = '👍 友善配合 / 技術 Carry (網頁評分)';
    } else if (rating === 'toxic') {
      diff = -5;
      desc = '👎 言語惡意 / 嘴砲騷擾 (網頁評分)';
    } else if (rating === 'afk') {
      diff = -10;
      desc = '💤 惡意掛網 / 擺爛行為 (網頁評分)';
    } else {
      return NextResponse.json({ error: 'Invalid rating type' }, { status: 400 });
    }

    // Fetch target user current score
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target teammate not found in database' }, { status: 404 });
    }

    const currentScore = targetUser.valoScore;
    let newScore = currentScore + diff;
    if (newScore > 100) newScore = 100;
    if (newScore < 0) newScore = 0;

    // Atomically update user score and log event
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetId },
        data: { valoScore: newScore }
      }),
      prisma.reputationLog.create({
        data: {
          userId: targetId,
          oldScore: currentScore,
          newScore,
          reason: desc
        }
      })
    ]);

    return NextResponse.json({ success: true, newScore });
  } catch (error) {
    console.error('Failed to rate teammate via web API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
