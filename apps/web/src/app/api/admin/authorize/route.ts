import { NextResponse } from 'next/server';

const CLIENT_ID = process.env.CLIENT_ID || '';
const REDIRECT_URI = process.env.REDIRECT_URI || '';

export async function GET() {
  if (!CLIENT_ID) {
    return NextResponse.json({ error: 'CLIENT_ID 未設定' }, { status: 500 });
  }

  const redirect = encodeURIComponent(`${REDIRECT_URI || 'http://localhost:3000'}/api/auth/callback`);
  const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify%20guilds`;

  return NextResponse.json({ url });
}
