import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lobbyId, action, userId } = body;

    if (!lobbyId || !action || !userId) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId }
    });

    if (!lobby) {
      return NextResponse.json({ error: '找不到此大廳' }, { status: 404 });
    }

    if (lobby.captainId !== userId) {
      return NextResponse.json({ error: '只有隊長可以執行此操作' }, { status: 403 });
    }

    if (action === 'start') {
      if (lobby.status !== 'OPEN') {
        return NextResponse.json({ error: '大廳目前不在開放狀態' }, { status: 400 });
      }

      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { status: 'PLAYING' }
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'close') {
      await prisma.lobby.update({
        where: { id: lobbyId },
        data: { status: 'CLOSED' }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '未知的操作類型' }, { status: 400 });

  } catch (error) {
    console.error('隊長操作失敗:', error);
    return NextResponse.json({ error: '伺服器內部錯誤' }, { status: 500 });
  }
}
