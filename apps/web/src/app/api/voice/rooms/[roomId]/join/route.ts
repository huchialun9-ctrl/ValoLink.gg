import { NextRequest, NextResponse } from 'next/server';
import { joinRoom, getRoom } from '@/lib/signal-store';

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;
    const { userId, username, avatar } = await req.json();

    if (!userId || !username) {
      return NextResponse.json({ error: 'userId and username required' }, { status: 400 });
    }

    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const existingParticipants = joinRoom(roomId, {
      userId,
      username,
      avatar: avatar || '',
      joinedAt: Date.now(),
    });

    return NextResponse.json({ participants: existingParticipants });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
