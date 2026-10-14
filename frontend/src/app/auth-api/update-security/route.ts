import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendApiUrl } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { current_password, new_password, new_username } = body;

    const authCookie = cookies().get('reli_session_token')?.value;
    if (!authCookie) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Call Django backend
    const res = await fetch(`${getBackendApiUrl()}/users/update-security/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authCookie}`
      },
      body: JSON.stringify({ current_password, new_password, new_username })
    });

    const data = await res.json();

    if (res.ok) {
      // If credentials changed, update the cookie with the newly issued JWT token
      if (data.token_update_required && data.access) {
        cookies().set('reli_session_token', data.access, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });
      }
      
      return NextResponse.json({ success: true, message: data.message });
    }

    return NextResponse.json(
      { success: false, message: data.error || 'Failed to update security settings' },
      { status: res.status }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
