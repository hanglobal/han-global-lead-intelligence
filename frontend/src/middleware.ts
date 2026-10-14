import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBackendApiUrl } from '@/lib/config';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // Allow access to the login page and static assets
  if (
    url.pathname.startsWith('/login') || 
    url.pathname.startsWith('/_next') || 
    url.pathname === '/favicon.ico' ||
    url.pathname === '/logo.png'
  ) {
    return NextResponse.next();
  }

  // Allow the Next.js API route for logging in
  if (url.pathname.startsWith('/auth-api/')) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get('reli_session_token')?.value;

  if (authCookie) {
    try {
      // Forward request with Bearer Auth header to backend verify endpoint
      const verifyRes = await fetch(`${getBackendApiUrl()}/users/verify-auth/`, {
        headers: {
          'Authorization': `Bearer ${authCookie}`
        }
      });

      if (verifyRes.ok) {
        // Valid cookie, forward request with Bearer Auth header to backend API
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('Authorization', `Bearer ${authCookie}`);
        
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    } catch (e) {
      console.error("Middleware Auth Error:", e);
    }
  }

  // Attempt silent refresh if session token expired or missing but refresh token exists
  const refreshToken = req.cookies.get('reli_refresh_token')?.value;
  if (refreshToken) {
    try {
      const refreshRes = await fetch(`${getBackendApiUrl()}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData.access;
        if (newAccessToken) {
          const requestHeaders = new Headers(req.headers);
          requestHeaders.set('Authorization', `Bearer ${newAccessToken}`);
          
          const response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });

          response.cookies.set('reli_session_token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60, // 1 hour
          });

          if (refreshData.refresh) {
            response.cookies.set('reli_refresh_token', refreshData.refresh, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              path: '/',
              maxAge: 7 * 24 * 60 * 60, // 7 days
            });
          }

          return response;
        }
      }
    } catch (e) {
      console.error("Middleware Refresh Error:", e);
    }
  }

  // If user is not authenticated and requesting an API route, return 401 JSON instead of redirecting
  if (url.pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'token_expired' },
      { status: 401 }
    );
  }

  // For frontend pages, redirect to login page
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const protocol = req.headers.get('x-forwarded-proto') || (req.headers.get('referer')?.startsWith('https') ? 'https' : req.nextUrl.protocol.replace(':', ''));
  const loginUrl = new URL('/login', `${protocol}://${host}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png).*)',
  ],
};
