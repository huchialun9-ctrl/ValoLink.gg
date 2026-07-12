import { NextRequest, NextResponse } from 'next/server';
import { createRoom, getRoomByLobby, listRooms } from '@/lib/signal-store';

export async function GET() {
  const rooms = listRooms();
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  try {
    const { lobbyId } = await req.json();
    if (!lobbyId) {
      return NextResponse.json({ error: 'lobbyId is required' }, { status: 400 });
    }

    const existing = getRoomByLobby(lobbyId);
    if (existing) {
      return NextResponse.json({ roomId: existing.id });
    }

    const roomId = createRoom(lobbyId);
    return NextResponse.json({ roomId });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
