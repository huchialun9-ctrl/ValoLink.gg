import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  
  const response = NextResponse.redirect(`${protocol}://${host}/`);
  
  // Clear cookie
  response.cookies.delete('user_session');
  
  return response;
}
