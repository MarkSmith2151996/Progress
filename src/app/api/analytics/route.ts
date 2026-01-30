import { NextResponse } from 'next/server';
import {
  getGoals,
  getTasks,
  getDailyLogs,
  getHabits,
  getHabitCompletions,
  getWeeklySnapshots,
} from '@/lib/storage';
import { generateAnalysisSummary } from '@/lib/analytics';
import {
  calculatePersonalRecords,
  calculateLoggingStreak,
  getStreakMilestone,
  getNextStreakMilestone,
} from '@/lib/metrics';

export async function GET() {
  try {
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

    // Generate analysis
    const analysis = generateAnalysisSummary(
      goals,
      tasks,
      dailyLogs,
      habits,
      habitCompletions,
      weeklySnapshots
    );

    // Calculate personal records
    const personalRecords = calculatePersonalRecords(
      dailyLogs,
      tasks,
      habits,
      habitCompletions,
      weeklySnapshots
    );

    // Calculate current streak and milestones
    const currentStreak = calculateLoggingStreak(dailyLogs);
    const streakMilestone = getStreakMilestone(currentStreak);
    const nextMilestone = getNextStreakMilestone(currentStreak);

    return NextResponse.json({
      success: true,
      analysis,
      personalRecords,
      currentStreak,
      streakMilestone,
      nextMilestone,
    });
  } catch (error) {
    console.error('Failed to generate analytics:', error);
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}
