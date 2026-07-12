import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@valolink/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'valolink-default-secret-change-me');

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: '未登入' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '請輸入目前密碼與新密碼' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密碼至少需要 6 個字元' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId as string } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: '此帳號未設定密碼（可能使用 Discord 登入）' }, { status: 400 });
    }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: '目前密碼錯誤' }, { status: 401 });
    }

    const passwordHash = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '密碼更新失敗' }, { status: 500 });
  }
}
