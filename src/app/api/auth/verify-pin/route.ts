import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Simple hash function (must match middleware)
function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    // Get the expected PIN from environment
    const accessPin = process.env.ACCESS_PIN;

    if (!accessPin) {
      // No PIN configured, allow access
      return NextResponse.json({ success: true });
    }

    // Verify PIN
    if (pin !== accessPin) {
      return NextResponse.json(
        { error: 'Invalid PIN. Please try again.' },
        { status: 401 }
      );
    }

    // Set auth cookie (7 days)
    const cookieStore = await cookies();
    cookieStore.set('progress_auth', `authenticated_${hashPin(accessPin)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PIN verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
