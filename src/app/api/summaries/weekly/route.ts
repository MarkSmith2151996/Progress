import { NextResponse } from 'next/server';
import {
  getGoals,
  getTasks,
  getDailyLogs,
  getHabits,
  getHabitCompletions,
  saveWeeklySnapshot,
} from '@/lib/storage';
import {
  generateWeeklySummary,
  weeklyResultToSnapshot,
} from '@/lib/summaryGenerator';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekOffset = parseInt(searchParams.get('weekOffset') || '0', 10);

    // Get the target week
    const now = new Date();
    const targetDate = subWeeks(now, weekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });

    // Fetch all data
    const [goals, tasks, dailyLogs, habits, habitCompletions] = await Promise.all([
      getGoals(),
      getTasks(),
      getDailyLogs(),
      getHabits(),
      getHabitCompletions(),
    ]);

    // Generate summary
    const result = await generateWeeklySummary(
      weekStart,
      goals,
      tasks,
      dailyLogs,
      habits,
      habitCompletions
    );

    return NextResponse.json({
      success: true,
      summary: result,
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
    });
  } catch (error) {
    console.error('Failed to generate weekly summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly summary' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { weekOffset = 0, save = true } = await request.json();

    // Get the target week
    const now = new Date();
    const targetDate = subWeeks(now, weekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 0 });

    // Fetch all data
    const [goals, tasks, dailyLogs, habits, habitCompletions] = await Promise.all([
      getGoals(),
      getTasks(),
      getDailyLogs(),
      getHabits(),
      getHabitCompletions(),
    ]);

    // Generate summary
    const result = await generateWeeklySummary(
      weekStart,
      goals,
      tasks,
      dailyLogs,
      habits,
      habitCompletions
    );

    // Save to sheet if requested
    if (save) {
      const snapshot = weeklyResultToSnapshot(
        result,
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd')
      );
      await saveWeeklySnapshot(snapshot);
    }

    return NextResponse.json({
      success: true,
      summary: result,
      saved: save,
    });
  } catch (error) {
    console.error('Failed to generate/save weekly summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate/save weekly summary' },
      { status: 500 }
    );
  }
}
