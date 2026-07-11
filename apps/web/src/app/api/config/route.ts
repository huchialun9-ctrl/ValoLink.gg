import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const guildId = searchParams.get('guildId');

  if (!guildId) {
    return NextResponse.json({ error: 'Missing guildId parameter' }, { status: 400 });
  }

  try {
    const config = await prisma.serverConfig.findUnique({
      where: { guildId }
    });

    if (!config) {
      // Return default values if config is not initialized yet
      return NextResponse.json({
        guildId,
        lobbyChannelId: '',
        voiceCategoryId: '',
        autoVoice: true,
        minValoScore: 50
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to fetch server configuration:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { guildId, lobbyChannelId, voiceCategoryId, autoVoice, minValoScore } = body;

    if (!guildId) {
      return NextResponse.json({ error: 'Missing guildId parameter' }, { status: 400 });
    }

    const config = await prisma.serverConfig.upsert({
      where: { guildId },
      update: {
        lobbyChannelId,
        voiceCategoryId,
        autoVoice: !!autoVoice,
        minValoScore: Number(minValoScore)
      },
      create: {
        guildId,
        lobbyChannelId,
        voiceCategoryId,
        autoVoice: !!autoVoice,
        minValoScore: Number(minValoScore)
      }
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to save server configuration:', error);
    return NextResponse.json({ error: 'Database upsert failed' }, { status: 500 });
  }
}
