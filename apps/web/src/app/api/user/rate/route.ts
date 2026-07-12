import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

const COOLDOWN_HOURS = 24;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { senderId, targetId, rating } = body;

    if (!senderId || !targetId || !rating) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    if (senderId === targetId) {
      return NextResponse.json({ error: 'You cannot rate yourself' }, { status: 400 });
    }
    if (!['good', 'toxic', 'afk'].includes(rating)) {
      return NextResponse.json({ error: 'Invalid rating type' }, { status: 400 });
    }

    // --- 24h Cooldown check ---
    const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
    const existing = await prisma.ratingRecord.findFirst({
      where: {
        raterId: senderId,
        targetId,
        createdAt: { gte: since }
      }
    });
    if (existing) {
      const nextAvailable = new Date(existing.createdAt.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
      return NextResponse.json({
        error: `您在 ${COOLDOWN_HOURS} 小時內已對此玩家評分過一次，請於 ${nextAvailable.toLocaleTimeString('zh-TW')} 後再試`,
        cooldown: true
      }, { status: 429 });
    }

    // --- Mutual-rating suspicious detection ---
    // Check if target has also rated sender positively in the last 7 days (farm detection)
    const mutualCheck = await prisma.ratingRecord.findFirst({
      where: {
        raterId: targetId,
        targetId: senderId,
        ratingType: 'good',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });
    const isSuspicious = mutualCheck !== null && rating === 'good';

    // --- Fetch rater's ValoScore to determine weight ---
    const raterUser = await prisma.user.findUnique({ where: { id: senderId } });
    const raterScore = raterUser?.valoScore ?? 100;

    // Weight: low-reputation raters have less impact
    let weightMultiplier = 1.0;
    if (raterScore < 50) weightMultiplier = 0.5;
    else if (raterScore < 70) weightMultiplier = 0.75;

    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Target teammate not found' }, { status: 404 });
    }

    let baseDiff = 0;
    let desc = '';
    if (rating === 'good')  { baseDiff = 2;   desc = '👍 友善配合 / 技術 Carry (網頁評分)'; }
    if (rating === 'toxic') { baseDiff = -5;  desc = '👎 言語惡意 / 嘴砲騷擾 (網頁評分)'; }
    if (rating === 'afk')   { baseDiff = -10; desc = '💤 惡意掛網 / 擺爛行為 (網頁評分)'; }

    // Suspicious ratings are quarantined (diff = 0, just recorded)
    const actualDiff = isSuspicious ? 0 : Math.round(baseDiff * weightMultiplier);
    const currentScore = targetUser.valoScore;
    let newScore = Math.max(0, Math.min(100, currentScore + actualDiff));

    // Atomic transaction: update score + create log + create rating record
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetId },
        data: { valoScore: newScore }
      }),
      prisma.reputationLog.create({
        data: { userId: targetId, oldScore: currentScore, newScore, reason: desc }
      }),
      prisma.ratingRecord.create({
        data: { raterId: senderId, targetId, ratingType: rating, suspicious: isSuspicious }
      }),
      // Mark rater as suspicious if mutual farm detected
      ...(isSuspicious ? [prisma.user.update({
        where: { id: senderId },
        data: { isSuspicious: true }
      })] : [])
    ]);

    // --- DM notification via Discord Bot REST ---
    const token = process.env.DISCORD_TOKEN;
    if (token && actualDiff !== 0) {
      try {
        // Create DM channel
        const dmRes = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
          method: 'POST',
          headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient_id: targetId })
        });
        if (dmRes.ok) {
          const dmData = await dmRes.json();
          const sign = actualDiff > 0 ? '+' : '';
          await fetch(`https://discord.com/api/v10/channels/${dmData.id}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                color: actualDiff > 0 ? 0x4eff8a : 0xff4655,
                title: 'ValoLink.gg — 信用分變動通知',
                description: `您收到了一筆來自隊友的匿名評分`,
                fields: [
                  { name: '評分類別', value: desc, inline: true },
                  { name: '分數變動', value: `${currentScore} → **${newScore} pts** (${sign}${actualDiff})`, inline: true }
                ],
                footer: { text: '評分者已匿名保護 • ValoLink.gg' },
                timestamp: new Date().toISOString()
              }]
            })
          });
        }
      } catch (dmErr) {
        console.warn('[rate] DM notification failed (non-critical):', dmErr);
      }
    }

    return NextResponse.json({
      success: true,
      newScore,
      actualDiff,
      suspicious: isSuspicious,
      message: isSuspicious ? '已記錄，但因偵測到疑似互刷行為，分數不計入' : '評分成功'
    });
  } catch (error) {
    console.error('[rate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
