import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/callback`;

  const clientId = process.env.CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'CLIENT_ID environment variable is missing' }, { status: 500 });
  }

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;

  return NextResponse.redirect(discordAuthUrl);
}
