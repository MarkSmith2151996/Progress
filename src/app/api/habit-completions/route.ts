import { NextResponse } from 'next/server';
import { getHabitCompletions, saveHabitCompletion } from '@/lib/storage';
import { HabitCompletion } from '@/types';

export async function GET() {
  try {
    const completions = await getHabitCompletions();
    return NextResponse.json({ completions });
  } catch (error) {
    console.error('Failed to fetch habit completions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habit completions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const completion: HabitCompletion = await request.json();
    await saveHabitCompletion(completion);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save habit completion:', error);
    return NextResponse.json(
      { error: 'Failed to save habit completion' },
      { status: 500 }
    );
  }
}
