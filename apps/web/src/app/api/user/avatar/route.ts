import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@valolink/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'valolink-default-secret-change-me');

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: '未登入' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) return NextResponse.json({ error: '請選擇圖片' }, { status: 400 });

    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) return NextResponse.json({ error: '圖片不能超過 2MB' }, { status: 400 });

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: '僅支援 PNG、JPEG、GIF、WebP 格式' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    await prisma.user.update({
      where: { id: payload.userId as string },
      data: { avatar: dataUrl },
    });

    return NextResponse.json({ avatar: dataUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '上傳失敗' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: '未登入' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    await prisma.user.update({
      where: { id: payload.userId as string },
      data: { avatar: null },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '重設失敗' }, { status: 500 });
  }
}
