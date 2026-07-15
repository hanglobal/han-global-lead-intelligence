import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  
  // Allow access to the login page and static assets
  if (
    url.pathname.startsWith('/login') || 
    url.pathname.startsWith('/_next') || 
    url.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Allow the Next.js API route for logging in
  if (url.pathname.startsWith('/auth-api/')) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get('reli_auth_token')?.value;

  if (authCookie) {
    try {
      const [user, pwd] = atob(authCookie).split(':');
      if (user === 'admin' && pwd === '321@admin') {
        // Valid cookie, forward request with Basic Auth header to backend
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('Authorization', `Basic ${authCookie}`);
        
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    } catch (e) {
      // Invalid base64
    }
  }

  // If we reach here, user is not authenticated
  // Redirect to login page
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
