import { NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL?.replace('wss://', 'https://') || '';
const apiKey = process.env.LIVEKIT_API_KEY || '';
const apiSecret = process.env.LIVEKIT_API_SECRET || '';

export async function POST(req: Request) {
  try {
    const { room, identity, action } = await req.json();

    if (!room || !identity || !action) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const client = new RoomServiceClient(livekitHost, apiKey, apiSecret);

    if (action === 'mute') {
      await client.mutePublishedTrack(room, identity, 'audio', true);
      return NextResponse.json({ success: true, action: 'muted' });
    }

    if (action === 'unmute') {
      await client.mutePublishedTrack(room, identity, 'audio', false);
      return NextResponse.json({ success: true, action: 'unmuted' });
    }

    if (action === 'remove') {
      await client.removeParticipant(room, identity);
      return NextResponse.json({ success: true, action: 'removed' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '操作失敗' }, { status: 500 });
  }
}
