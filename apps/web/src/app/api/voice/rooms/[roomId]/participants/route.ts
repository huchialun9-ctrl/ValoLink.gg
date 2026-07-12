import { NextResponse } from 'next/server';
import { getParticipants, getRoom } from '@/lib/signal-store';

export async function GET(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  const participants = getParticipants(roomId);
  return NextResponse.json({ participants });
}
