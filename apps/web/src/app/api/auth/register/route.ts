import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'valolink-default-secret-change-me');

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Email、密碼與使用者名稱為必填' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密碼至少需要 6 個字元' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: '此 Email 已經註冊過' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();

    const user = await prisma.user.create({
      data: {
        id,
        email,
        passwordHash,
        displayName: username,
      },
    });

    const token = await new SignJWT({ userId: user.id, email: user.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, username: user.displayName },
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
    return NextResponse.json({ error: err.message || '註冊失敗' }, { status: 500 });
  }
}
