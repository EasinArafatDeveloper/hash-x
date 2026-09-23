import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { isStealthShareDomain } from '@/lib/config/domains';

const SESSION_COOKIE_NAME = 'dataflow_session';

const getSecretKey = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set.');
  }
  return new TextEncoder().encode(secret);
};

// Paths that do not require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/verify-2fa',
  '/api/auth/logout',
  '/v',
  '/share',
  '/api/share',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    '';

  // 1. Skip static assets, Next.js internal files, and public images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    (pathname.includes('.') && !pathname.endsWith('.html'))
  ) {
    return NextResponse.next();
  }

  // 2. STEALTH CLOAKING DEFENSE FOR DISPOSABLE SHARE DOMAINS (tempshr.click, tempshr.xyz, tempshr.lol)
  // If request is coming through a disposable share domain:
  if (isStealthShareDomain(host)) {
    const isAllowedSharePath =
      pathname.startsWith('/v/') ||
      pathname.startsWith('/api/share/') ||
      pathname.startsWith('/share/');

    if (isAllowedSharePath) {
      const res = NextResponse.next();
      applySecurityHeaders(res);
      res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
      return res;
    }

    // Direct visit to root '/', '/login', '/dashboard' on share domains gets an immediate 404 Blackhole!
    return new NextResponse('404 Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 3. Extract and verify session token from HttpOnly cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const secretKey = getSecretKey();
      await jwtVerify(token, secretKey, {
        algorithms: ['HS256'],
      });
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));

  // 4. If authenticated user attempts to visit /login, redirect to /dashboard
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 5. If path is public (e.g. /login, /api/auth/login, /v/...), allow through with security headers
  if (isPublicPath) {
    const res = NextResponse.next();
    applySecurityHeaders(res);
    return res;
  }

  // 6. If user is NOT authenticated on a protected route
  if (!isAuthenticated) {
    // For protected API endpoints, return 401 Unauthorized JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized. Authentication session required.' },
        { status: 401 }
      );
    }

    // For web dashboard pages, redirect to login with callback URL
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('callbackUrl', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 7. User is authenticated and accessing protected dashboard/API
  const response = NextResponse.next();
  applySecurityHeaders(response);
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
