import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Check if running on Vercel
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

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
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.woff2')
  ) {
    return NextResponse.next();
  }

  // Check if ACCESS_PIN is set (only enforce in production/Vercel)
  const accessPin = process.env.ACCESS_PIN;

  // If no PIN configured, allow access (dev mode) but still handle redirects
  const isAuthenticated = !accessPin ||
    request.cookies.get('progress_auth')?.value === `authenticated_${hashPin(accessPin)}`;

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname === '/' && isVercel ? '/mobile' : pathname);
    return NextResponse.redirect(loginUrl);
  }

  // VERCEL: Redirect root "/" to "/mobile"
  // Desktop dashboard is not available on Vercel (coach doesn't work)
  if (isVercel && pathname === '/') {
    return NextResponse.redirect(new URL('/mobile', request.url));
  }

  // VERCEL: Redirect any desktop-only routes to mobile
  // These routes won't work properly on Vercel anyway
  if (isVercel && !pathname.startsWith('/mobile') && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/mobile', request.url));
  }

  return NextResponse.next();
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
