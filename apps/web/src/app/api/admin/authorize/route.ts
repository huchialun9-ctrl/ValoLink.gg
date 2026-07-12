import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.CLIENT_ID || process.env.NEXT_PUBLIC_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: 'CLIENT_ID 未設定' }, { status: 500 });
  }

  const base = (process.env.REDIRECT_URI || 'http://localhost:3000').replace(/\/+$/, '');
  const redirectUri = `${base}/api/admin/callback`;

  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds`;

  return NextResponse.json({ url });
}
