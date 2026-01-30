import { NextResponse } from 'next/server';
import { getDailyLogs, saveDailyLog } from '@/lib/storage';
import { DailyLog } from '@/types';

export async function GET() {
  try {
    const logs = await getDailyLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to fetch daily logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const log: DailyLog = await request.json();
    await saveDailyLog(log);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save daily log:', error);
    return NextResponse.json(
      { error: 'Failed to save daily log' },
      { status: 500 }
    );
  }
}
