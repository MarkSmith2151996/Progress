import { NextResponse } from 'next/server';
import { getGoals, saveGoal, deleteGoal } from '@/lib/storage';
import { Goal } from '@/types';

export async function GET() {
  try {
    const goals = await getGoals();
    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Failed to fetch goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const goal: Goal = await request.json();
    await saveGoal(goal);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save goal:', error);
    return NextResponse.json(
      { error: 'Failed to save goal' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { goal_id } = await request.json();
    if (!goal_id) {
      return NextResponse.json(
        { error: 'goal_id is required' },
        { status: 400 }
      );
    }
    await deleteGoal(goal_id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
