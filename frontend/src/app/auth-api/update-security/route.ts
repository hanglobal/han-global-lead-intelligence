import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { current_password, new_password, new_username } = body;

    const authCookie = cookies().get('reli_session_token')?.value;
    if (!authCookie) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Call Django backend
    const res = await fetch('http://127.0.0.1:5050/api/users/update-security/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authCookie}`
      },
      body: JSON.stringify({ current_password, new_password, new_username })
    });

    const data = await res.json();

    if (res.ok) {
      // If the username or password was changed, we must update the Next.js cookie!
      // We parse the old cookie to get the current username if not changed, etc.
      const [oldUser, oldPass] = atob(authCookie).split(':');
      
      // If superuser is doing the override, their cookie does NOT change!
      // We only update the cookie if the person logged in is NOT superuser, or if the logic requires it.
      // Wait, if superuser is logged in, their username/password didn't change (only the regular user's did).
      // If regular user is logged in, their username/password changed.
      // How do we know who is logged in? The backend can return whether the cookie needs update.
      if (data.token_update_required && data.new_token) {
        cookies().set('reli_session_token', data.new_token, {
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
