import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendApiUrl } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const res = await fetch(`${getBackendApiUrl()}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    if (res.ok) {
      const data = await res.json();
      // Set the access token cookie as session cookie
      cookies().set('reli_session_token', data.access, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      // Set 7-day refresh token cookie for silent background renewal
      if (data.refresh) {
        cookies().set('reli_refresh_token', data.refresh, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
      }
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
