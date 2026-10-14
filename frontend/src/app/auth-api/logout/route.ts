import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  cookies().delete('reli_session_token');
  cookies().delete('reli_refresh_token');
  return NextResponse.json({ success: true });
}
