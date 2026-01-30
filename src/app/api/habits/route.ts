import { NextResponse } from 'next/server';
import { getHabits, saveHabit } from '@/lib/storage';
import { Habit } from '@/types';

export async function GET() {
  try {
    const habits = await getHabits();
    return NextResponse.json({ habits });
  } catch (error) {
    console.error('Failed to fetch habits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch habits' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const habit: Habit = await request.json();
    await saveHabit(habit);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save habit:', error);
    return NextResponse.json(
      { error: 'Failed to save habit' },
      { status: 500 }
    );
  }
}
