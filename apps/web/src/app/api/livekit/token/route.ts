import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomName = searchParams.get('roomName');
  const identity = searchParams.get('identity');
  const name = searchParams.get('name');

  if (!roomName || !identity) {
    return NextResponse.json({ error: 'Missing roomName or identity' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit credentials not configured on server' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: name || identity,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({
    token,
    url: process.env.LIVEKIT_URL,
  });
}
