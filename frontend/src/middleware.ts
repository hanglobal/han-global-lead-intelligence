import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
      // Forward request with Basic Auth header to backend verify endpoint
      const verifyRes = await fetch('http://127.0.0.1:5050/api/users/verify-auth/', {
        headers: {
          'Authorization': `Basic ${authCookie}`
        }
      });

      if (verifyRes.ok) {
        // Valid cookie, forward request with Basic Auth header to backend API
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('Authorization', `Basic ${authCookie}`);
        
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

  // If we reach here, user is not authenticated
  // Redirect to login page
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png).*)',
  ],
};
