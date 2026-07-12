import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.CLIENT_ID || process.env.NEXT_PUBLIC_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: 'CLIENT_ID 未設定' }, { status: 500 });
  }

  const callbackUrl = `${new URL(req.url).origin}/api/admin/callback`;
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=identify%20guilds`;

  return NextResponse.json({ url });
}
