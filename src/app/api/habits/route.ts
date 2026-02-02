import { NextResponse } from 'next/server';
import { getHabits, saveHabit, deleteHabit } from '@/lib/storage';
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

export async function PUT(request: Request) {
  try {
    const habit: Habit = await request.json();
    if (!habit.habit_id) {
      return NextResponse.json(
        { error: 'habit_id is required' },
        { status: 400 }
      );
    }
    await saveHabit(habit);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update habit:', error);
    return NextResponse.json(
      { error: 'Failed to update habit' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const habitId = url.searchParams.get('id');
    if (!habitId) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }
    await deleteHabit(habitId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete habit:', error);
    return NextResponse.json(
      { error: 'Failed to delete habit' },
      { status: 500 }
    );
  }
}
