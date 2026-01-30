import { NextResponse } from 'next/server';
import { getSettings, saveSetting } from '@/lib/storage';

export async function GET() {
  try {
    const settings = await getSettings();

    // Parse JSON values
    const parsed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(settings)) {
      try {
        parsed[key] = JSON.parse(value);
      } catch {
        parsed[key] = value;
      }
    }

    return NextResponse.json({ settings: parsed });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const settings = await request.json();

    for (const [key, value] of Object.entries(settings)) {
      const stringValue = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
      await saveSetting(key, stringValue);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
