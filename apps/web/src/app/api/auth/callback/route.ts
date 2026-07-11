import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/callback`;

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET || 'syTSAwGUpLOOSkwzquFHjNzNLRkf6BZH'; // using the client secret provided
  const token = process.env.DISCORD_TOKEN;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'OAuth2 configuration is incomplete' }, { status: 500 });
  }

  try {
    // 1. Exchange authorization code for token
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
      console.error('Token exchange failed:', errBody);
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user information from Discord API
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch user data from Discord' }, { status: 400 });
    }

    const userData = await userResponse.json();
    const discordId = userData.id;
    const username = userData.username;
    const avatar = userData.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordId}/${userData.avatar}.png`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    // 3. Upsert user in database
    const user = await prisma.user.upsert({
      where: { id: discordId },
      update: {},
      create: {
        id: discordId,
        valoScore: 100
      }
    });

    // 4. Create response and set cookie
    const responseRedirect = NextResponse.redirect(`${protocol}://${host}/dashboard`);
    
    // Store simple user session object in cookie
    const sessionObj = {
      id: discordId,
      username,
      avatar,
      riotId: user.riotId || null,
      rank: user.rank || null,
      valoScore: user.valoScore
    };

    responseRedirect.cookies.set('user_session', JSON.stringify(sessionObj), {
      path: '/',
      httpOnly: false, // Accessible to client-side react hooks for UI convenience
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: 'lax',
      secure: protocol === 'https'
    });

    return responseRedirect;
  } catch (error) {
    console.error('OAuth2 callback error:', error);
    return NextResponse.json({ error: 'Authentication flow failed' }, { status: 500 });
  }
}
