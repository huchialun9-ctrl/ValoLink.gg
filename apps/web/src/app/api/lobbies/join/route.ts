import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';
import { updateDiscordEmbed } from '@/lib/discordBot';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lobbyId, userId } = body;

    if (!lobbyId || !userId) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: { members: true }
    });

    if (!lobby || lobby.status !== 'OPEN') {
      return NextResponse.json({ error: '大廳不在開放狀態或不存在' }, { status: 400 });
    }

    const isAlreadyMember = lobby.members.some(m => m.userId === userId);
    if (isAlreadyMember) {
      return NextResponse.json({ error: '你已經在此隊伍中' }, { status: 400 });
    }

    if (lobby.members.length >= 5) {
      return NextResponse.json({ error: '隊伍已滿' }, { status: 400 });
    }

    await prisma.lobbyMember.create({
      data: { lobbyId, userId }
    });

    await updateDiscordEmbed(lobbyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('加入大廳失敗:', error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
