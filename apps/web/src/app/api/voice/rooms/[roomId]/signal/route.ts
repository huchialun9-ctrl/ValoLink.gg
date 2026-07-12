import { NextRequest, NextResponse } from 'next/server';
import { addSignal, getSignals, getRoom } from '@/lib/signal-store';

export async function GET(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  const since = parseInt(url.searchParams.get('since') || '0', 10);

  if (!userId) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const signals = getSignals(roomId, userId, since);
  return NextResponse.json({ signals, serverTime: Date.now() });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const { from, to, type, data } = await req.json();

    if (!from || !to || !type || !data) {
      return NextResponse.json({ error: 'from, to, type, data required' }, { status: 400 });
    }

    if (!['offer', 'answer', 'ice-candidate'].includes(type)) {
      return NextResponse.json({ error: 'type must be offer, answer, or ice-candidate' }, { status: 400 });
    }

    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    addSignal(roomId, { from, to, type, data, timestamp: Date.now() });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
