import { NextResponse } from 'next/server';

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';

export async function GET() {
  if (!DISCORD_CLIENT_ID) {
    return NextResponse.json({ error: 'Discord Client ID 未設定' }, { status: 500 });
  }

  const permissions = '8'; // Administrator
  const scope = 'bot applications.commands';
  const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=${permissions}&scope=${encodeURIComponent(scope)}`;

  return NextResponse.json({ url });
}
