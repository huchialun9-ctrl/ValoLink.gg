import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');

  // Handle Discord denying the OAuth request
  if (errorParam) {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    return NextResponse.redirect(`${protocol}://${host}/?auth_error=denied`);
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter from Discord' }, { status: 400 });
  }

  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';

  // Always use the production URL as the redirect URI on Render
  // to match exactly what is registered in the Discord Developer Portal
  const redirectUri = process.env.REDIRECT_URI || `${protocol}://${host}/api/auth/callback`;

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[Auth] Missing CLIENT_ID or CLIENT_SECRET env vars');
    return NextResponse.json({
      error: 'Server misconfiguration: OAuth2 credentials not set',
      hint: 'Set CLIENT_ID and CLIENT_SECRET environment variables in Render dashboard'
    }, { status: 500 });
  }

  // --- Step 1: Exchange code for access token ---
  let accessToken: string;
  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('[Auth] Token exchange failed:', errBody);
      return NextResponse.json({
        error: 'Token exchange failed',
        detail: errBody,
        hint: 'Ensure REDIRECT_URI in Render matches exactly what is set in Discord Developer Portal → OAuth2 → Redirects'
      }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('[Auth] Network error during token exchange:', err);
    return NextResponse.json({ error: 'Network error contacting Discord API' }, { status: 502 });
  }

  // --- Step 2: Fetch user profile from Discord ---
  let userData: any;
  try {
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      const errBody = await userResponse.text();
      console.error('[Auth] Failed to fetch Discord user:', errBody);
      return NextResponse.json({ error: 'Failed to fetch user data from Discord', detail: errBody }, { status: 400 });
    }

    userData = await userResponse.json();
  } catch (err) {
    console.error('[Auth] Network error fetching Discord profile:', err);
    return NextResponse.json({ error: 'Network error fetching Discord user profile' }, { status: 502 });
  }

  const discordId = userData.id;
  const username = userData.username;
  const avatar = userData.avatar
    ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${Number(userData.discriminator || 0) % 5}.png`;

  // --- Step 3: Upsert user in database ---
  let user: any;
  try {
    user = await prisma.user.upsert({
      where: { id: discordId },
      update: {},
      create: {
        id: discordId,
        valoScore: 100
      }
    });
  } catch (err: any) {
    console.error('[Auth] Database upsert failed:', err?.message);
    // Don't block login if DB is temporarily unreachable - create a minimal in-memory session
    user = { id: discordId, riotId: null, rank: null, valoScore: 100 };
  }

  // --- Step 4: Set session cookie and redirect to dashboard ---
  const sessionObj = {
    id: discordId,
    username,
    avatar,
    riotId: user.riotId || null,
    rank: user.rank || null,
    valoScore: user.valoScore ?? 100
  };

  const responseRedirect = NextResponse.redirect(`${protocol}://${host}/dashboard`);
  responseRedirect.cookies.set('user_session', JSON.stringify(sessionObj), {
    path: '/',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: protocol === 'https'
  });

  return responseRedirect;
}
