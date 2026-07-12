import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';
import { verifyPassword } from '@/lib/password';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'valolink-default-secret-change-me');

export async function GET() {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000';

  if (!clientId) {
    return NextResponse.json({ error: 'Discord Client ID 未設定' }, { status: 500 });
  }

  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(`${redirectUri}/api/auth/callback`)}&response_type=code&scope=identify`;
  return NextResponse.redirect(url);
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email 與密碼為必填' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Email 或密碼錯誤' }, { status: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Email 或密碼錯誤' }, { status: 401 });
    }

    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.displayName,
        riotId: user.riotId,
        rank: user.rank,
        valoScore: user.valoScore,
        bio: user.bio,
      },
      token,
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '登入失敗' }, { status: 500 });
  }
}
