import { NextResponse } from 'next/server';
import { prisma } from '@valolink/db';

export const dynamic = 'force-dynamic';

// Verify the user is a Discord server administrator
async function verifyAdmin(request: Request): Promise<{ userId: string } | null> {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/user_session=([^;]+)/);
  if (!match) return null;

  try {
    const session = JSON.parse(decodeURIComponent(match[1]));
    if (!session?.id) return null;

    // Check if user has ADMINISTRATOR permission in any configured guild
    const token = process.env.DISCORD_TOKEN;
    if (!token) return null;

    const configs = await prisma.serverConfig.findMany({ take: 5 });
    for (const config of configs) {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${config.guildId}/members/${session.id}`,
        { headers: { Authorization: `Bot ${token}` } }
      );
      if (res.ok) {
        const member = await res.json();
        // Check ADMINISTRATOR flag (bit 3 = 0x8)
        const guildRes = await fetch(
          `https://discord.com/api/v10/guilds/${config.guildId}`,
          { headers: { Authorization: `Bot ${token}` } }
        );
        if (guildRes.ok) {
          const guild = await guildRes.json();
          if (guild.owner_id === session.id) return { userId: session.id };

          // Check roles for ADMINISTRATOR
          const adminRoles = guild.roles?.filter((r: any) => (BigInt(r.permissions) & BigInt(0x8)) !== BigInt(0));
          const memberRoleIds = member.roles || [];
          const isAdmin = adminRoles?.some((r: any) => memberRoleIds.includes(r.id));
          if (isAdmin) return { userId: session.id };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized — must be a Discord server administrator' }, { status: 403 });
  }

  try {
    const configs = await prisma.serverConfig.findMany();
    const suspiciousUsers = await prisma.user.findMany({
      where: { isSuspicious: true },
      orderBy: { valoScore: 'asc' },
      take: 20
    });
    const recentLogs = await prisma.reputationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { user: true }
    });

    return NextResponse.json({ configs, suspiciousUsers, recentLogs });
  } catch (error) {
    console.error('[admin GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, guildId, minValoScore, autoVoice, lobbyChannelId, voiceCategoryId, resetUserId } = body;

    if (action === 'update_config') {
      if (!guildId) return NextResponse.json({ error: 'Missing guildId' }, { status: 400 });
      const config = await prisma.serverConfig.upsert({
        where: { guildId },
        update: {
          ...(minValoScore !== undefined && { minValoScore }),
          ...(autoVoice !== undefined && { autoVoice }),
          ...(lobbyChannelId !== undefined && { lobbyChannelId }),
          ...(voiceCategoryId !== undefined && { voiceCategoryId }),
        },
        create: { guildId, minValoScore: minValoScore ?? 50, autoVoice: autoVoice ?? true }
      });
      return NextResponse.json({ success: true, config });
    }

    if (action === 'clear_suspicious') {
      if (!resetUserId) return NextResponse.json({ error: 'Missing resetUserId' }, { status: 400 });
      await prisma.user.update({
        where: { id: resetUserId },
        data: { isSuspicious: false }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[admin POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
