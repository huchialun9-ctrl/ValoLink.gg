import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@valolink/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'valolink-default-secret-change-me');

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: '未登入' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { displayName, bio, riotId } = await req.json();

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (riotId !== undefined) updateData.riotId = riotId;

    const user = await prisma.user.update({
      where: { id: payload.userId as string },
      data: updateData,
    });

    return NextResponse.json({ user: { id: user.id, displayName: user.displayName, avatar: user.avatar, bio: user.bio, riotId: user.riotId } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '更新失敗' }, { status: 500 });
  }
}
