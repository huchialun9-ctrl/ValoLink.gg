import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export async function POST() {
  try {
    await prisma.lobbyMember.deleteMany();
    await prisma.lobby.deleteMany();
    return NextResponse.json({ success: true, message: '所有房間已清除' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '清除失敗' }, { status: 500 });
  }
}
