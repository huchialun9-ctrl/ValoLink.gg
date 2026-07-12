import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiter (resets on redeploy; good enough for free tier)
const ipRequestLog = new Map<string, number[]>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const times = (ipRequestLog.get(ip) || []).filter(t => now - t < WINDOW_MS);
  times.push(now);
  ipRequestLog.set(ip, times);
  return times.length > MAX_REQUESTS;
}

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        const msg = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(msg));
      };

      // Initial snapshot
      try {
        const lobbies = await prisma.lobby.findMany({
          where: { status: { in: ['OPEN', 'PLAYING'] } },
          include: {
            captain: true,
            members: { include: { user: true } }
          },
          orderBy: { createdAt: 'desc' }
        });

        const formatted = lobbies.map(lobby => ({
          id: lobby.id,
          mode: lobby.gameMode,
          minRank: lobby.minRank || 'Unranked',
          description: lobby.description || '',
          captainId: lobby.captainId,
          captainName: lobby.captain.displayName || lobby.captain.riotId || lobby.captainId,
          valoScore: lobby.captain.valoScore,
          currentCount: lobby.members.length,
          maxCount: 5,
          status: lobby.status,
          membersList: lobby.members.map(m => ({
            id: m.userId,
            name: m.user.displayName || m.user.riotId || m.userId,
            avatar: m.user.avatar,
            inVoice: m.inVoice,
            isMuted: m.isMuted,
            valoScore: m.user.valoScore
          }))
        }));

        send({ type: 'snapshot', lobbies: formatted });
      } catch (err) {
        send({ type: 'error', message: 'Database unavailable' });
      }

      // Poll for changes every 5 seconds
      const interval = setInterval(async () => {
        try {
          const lobbies = await prisma.lobby.findMany({
            where: { status: { in: ['OPEN', 'PLAYING'] } },
            include: {
              captain: true,
              members: { include: { user: true } }
            },
            orderBy: { createdAt: 'desc' }
          });

          const formatted = lobbies.map(lobby => ({
            id: lobby.id,
            mode: lobby.gameMode,
            minRank: lobby.minRank || 'Unranked',
            description: lobby.description || '',
            captainId: lobby.captainId,
            captainName: lobby.captain.displayName || lobby.captain.riotId || lobby.captainId,
            valoScore: lobby.captain.valoScore,
            currentCount: lobby.members.length,
            maxCount: 5,
              status: lobby.status,
              membersList: lobby.members.map(m => ({
                id: m.userId,
                name: m.user.displayName || m.user.riotId || m.userId,
                avatar: m.user.avatar,
                inVoice: m.inVoice,
                isMuted: m.isMuted,
                valoScore: m.user.valoScore
              }))
            }));

            send({ type: 'update', lobbies: formatted });
        } catch {
          send({ type: 'ping' }); // keep-alive
        }
      }, 5000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
