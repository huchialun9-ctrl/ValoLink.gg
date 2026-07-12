import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@valolink/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'valolink-default-secret-change-me');

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        riotId: true,
        rank: true,
        valoScore: true,
        bio: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
