import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const token = btoa(`${username}:${password}`);
    
    // Verify credentials with Django backend
    const verifyRes = await fetch('http://127.0.0.1:5050/api/users/verify-auth/', {
      headers: {
        'Authorization': `Basic ${token}`
      }
    });

    if (verifyRes.ok) {
      // Set the cookie as a session cookie (no maxAge)
      cookies().set('reli_session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      
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
