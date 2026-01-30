import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// PIN protection middleware
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip PIN check for:
  // - API routes (they handle their own auth if needed)
  // - Static files and Next.js internals
  // - The login page itself
  // - Service worker and manifest
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname === '/login' ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg')
  ) {
    return NextResponse.next();
  }

  // Check if ACCESS_PIN is set (only enforce in production/Vercel)
  const accessPin = process.env.ACCESS_PIN;
  if (!accessPin) {
    // No PIN configured, allow access (dev mode)
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get('progress_auth');
  if (authCookie?.value === `authenticated_${hashPin(accessPin)}`) {
    return NextResponse.next();
  }

  // Redirect to login page
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

// Simple hash function for the PIN (not cryptographically secure, but sufficient for this use case)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
