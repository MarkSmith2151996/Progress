import { NextResponse } from 'next/server';
import {
  getGoals,
  getTasks,
  getDailyLogs,
  getHabits,
  getHabitCompletions,
  getWeeklySnapshots,
  saveMonthlyReview,
} from '@/lib/storage';
import {
  generateMonthlySummary,
  monthlyResultToReview,
} from '@/lib/summaryGenerator';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthOffset = parseInt(searchParams.get('monthOffset') || '0', 10);

    // Get the target month
    const now = new Date();
    const targetDate = subMonths(now, monthOffset);

    // Fetch all data
    const [goals, tasks, dailyLogs, habits, habitCompletions, weeklySnapshots] =
      await Promise.all([
        getGoals(),
        getTasks(),
        getDailyLogs(),
        getHabits(),
        getHabitCompletions(),
        getWeeklySnapshots(),
      ]);

    // Generate summary
    const result = await generateMonthlySummary(
      targetDate,
      goals,
      tasks,
      dailyLogs,
      habits,
      habitCompletions,
      weeklySnapshots
    );

    return NextResponse.json({
      success: true,
      summary: result,
      month: format(targetDate, 'MMMM yyyy'),
    });
  } catch (error) {
    console.error('Failed to generate monthly summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate monthly summary' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { monthOffset = 0, save = true } = await request.json();

    // Get the target month
    const now = new Date();
    const targetDate = subMonths(now, monthOffset);

    // Fetch all data
    const [goals, tasks, dailyLogs, habits, habitCompletions, weeklySnapshots] =
      await Promise.all([
        getGoals(),
        getTasks(),
        getDailyLogs(),
        getHabits(),
        getHabitCompletions(),
        getWeeklySnapshots(),
      ]);

    // Generate summary
    const result = await generateMonthlySummary(
      targetDate,
      goals,
      tasks,
      dailyLogs,
      habits,
      habitCompletions,
      weeklySnapshots
    );

    // Save to sheet if requested
    if (save) {
      const review = monthlyResultToReview(result, goals);
      await saveMonthlyReview(review);
    }

    return NextResponse.json({
      success: true,
      summary: result,
      saved: save,
    });
  } catch (error) {
    console.error('Failed to generate/save monthly summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate/save monthly summary' },
      { status: 500 }
    );
  }
}
