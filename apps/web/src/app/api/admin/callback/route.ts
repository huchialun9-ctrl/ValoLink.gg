import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@valolink/db';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'valolink-default-secret-change-me');
const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || '';
const REDIRECT_URI = process.env.REDIRECT_URI
  ? `${process.env.REDIRECT_URI}/api/admin/callback`
  : 'http://localhost:3000/api/admin/callback';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  if (!code) return NextResponse.json({ error: '缺少授權碼' }, { status: 400 });

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        scope: 'identify guilds',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.json({ error: 'Token 交換失敗', detail: errText }, { status: 400 });
    }

    const { access_token } = await tokenRes.json();

    // Fetch user's guilds
    const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!guildsRes.ok) return NextResponse.json({ error: '無法取得伺服器列表' }, { status: 400 });
    const userGuilds: any[] = await guildsRes.json();

    // Fetch user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) return NextResponse.json({ error: '無法取得使用者資訊' }, { status: 400 });
    const userData = await userRes.json();
    const discordId = userData.id;

    // Fetch bot's guilds
    const botGuildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bot ${DISCORD_TOKEN}` },
    });
    if (!botGuildsRes.ok) return NextResponse.json({ error: '無法取得機器人伺服器列表' }, { status: 400 });
    const botGuilds: any[] = await botGuildsRes.json();
    const botGuildIds = new Set(botGuilds.map(g => g.id));

    // Check if user is admin in any guild where bot is also present
    const adminGuild = userGuilds.find(g => {
      const perms = BigInt(g.permissions);
      const isAdmin = (perms & BigInt(8)) === BigInt(8);
      return isAdmin && botGuildIds.has(g.id);
    });

    if (!adminGuild) {
      // Set admin to false if they no longer qualify
      await prisma.user.update({
        where: { id: discordId },
        data: { isAdmin: false },
      });
      return NextResponse.redirect(`${REDIRECT_URI}/admin?error=no_admin_guild`);
    }

    // Set admin to true
    await prisma.user.update({
      where: { id: discordId },
      data: { isAdmin: true },
    });

    // Also create/update ServerConfig for this guild
    await prisma.serverConfig.upsert({
      where: { guildId: adminGuild.id },
      update: {},
      create: {
        guildId: adminGuild.id,
        lobbyChannelId: null,
        voiceCategoryId: null,
        autoVoice: true,
        minValoScore: 50,
      },
    });

    return NextResponse.redirect(`${REDIRECT_URI}/admin?verified=true`);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '驗證失敗' }, { status: 500 });
  }
}
