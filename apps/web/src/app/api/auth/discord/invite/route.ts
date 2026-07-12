import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.CLIENT_ID || process.env.NEXT_PUBLIC_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: 'Discord Client ID 未設定' }, { status: 500 });
  }

  const permissions = '8'; // Administrator
  const scope = 'bot applications.commands';
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${encodeURIComponent(scope)}`;

  return NextResponse.json({ url });
}
