import {
  getGoals,
  getTasks,
  getDailyLogs,
  getHabits,
  getHabitCompletions,
  getWeeklySnapshots,
} from './storage';
import {
  calculateWeeklyScore,
  calculateLoggingStreak,
  calculateHabitStreak,
  isThisWeek,
  isWithinDays,
  getToday,
  calculateGoalProgress,
  getExpectedProgress,
  determineGoalStatus,
  detectPatterns,
  getHabitCompletionRate,
} from './metrics';
import { ContextPackage } from '@/types';
import { format } from 'date-fns';

export async function buildContextPackage(): Promise<ContextPackage> {
  const today = getToday();

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

  // Today's log
  const todayLog = dailyLogs.find((l) => l.date === today);

  // Active goals with progress
  const activeGoals = goals
    .filter((g) => g.status === 'active')
    .map((g) => ({
      id: g.goal_id,
      title: g.title,
      type: g.type,
      progress: calculateGoalProgress(g),
      daysRemaining: Math.max(
        0,
        Math.ceil(
          (new Date(g.deadline).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      ),
      status: determineGoalStatus(g),
    }));

  // This week's tasks
  const weekTasks = tasks.filter((t) => isThisWeek(t.planned_date));
  const tasksPlanned = weekTasks.length;
  const tasksCompleted = weekTasks.filter((t) => t.status === 'completed').length;

  // Today's habits
  const todayDay = format(new Date(), 'EEE').toLowerCase().slice(0, 3);
  const habitsToday = habits
    .filter((h) => h.active && (!h.days_active || h.days_active.length === 0 || h.days_active.map((d) => d.toLowerCase().slice(0, 3)).includes(todayDay)))
    .map((h) => {
      const completion = habitCompletions.find(
        (c) => c.habit_id === h.habit_id && c.date === today
      );
      return {
        name: h.name,
        completed: completion?.completed || false,
        streak: calculateHabitStreak(h.habit_id, habitCompletions),
      };
    });

  // Habit completion rate
  const habitCompletionRate = getHabitCompletionRate(habitCompletions, habits);

  // Logging streak
  const streak = calculateLoggingStreak(dailyLogs);

  // Weekly score
  const weeklyScore = calculateWeeklyScore(
    tasks,
    goals,
    habitCompletions,
    habits,
    dailyLogs
  );

  // Recent logs
  const recentLogs = dailyLogs
    .filter((l) => isWithinDays(l.date, 7))
    .map((l) => ({
      date: l.date,
      energy: l.energy_level,
      hoursSlept: l.hours_slept,
      tasksCompleted: tasks.filter(
        (t) => t.completed_date === l.date && t.status === 'completed'
      ).length,
      overallRating: l.overall_rating,
    }));

  // Recent weeks
  const recentWeeks = weeklySnapshots.slice(-4).map((w, i, arr) => ({
    weekId: w.week_id,
    score: w.score,
    trend: i > 0 ? w.score - arr[i - 1].score : 0,
  }));

  // Detect patterns
  const patterns = detectPatterns(dailyLogs, tasks, habits, habitCompletions);

  // Build alerts
  const alerts: { level: 'critical' | 'warning' | 'info' | 'positive'; message: string }[] = [];

  // Check for goals behind pace
  activeGoals.forEach((g) => {
    if (g.status === 'behind' && g.daysRemaining < 30) {
      alerts.push({
        level: 'warning',
        message: `${g.title} is behind pace with ${g.daysRemaining} days left`,
      });
    }
  });

  // Check completion rate
  if (tasksPlanned > 0 && tasksCompleted / tasksPlanned < 0.5) {
    alerts.push({
      level: 'warning',
      message: 'Task completion rate is below 50% this week',
    });
  }

  // Positive alerts
  if (streak >= 7) {
    alerts.push({
      level: 'positive',
      message: `${streak} day logging streak!`,
    });
  }

  return {
    currentDate: today,
    dayType: todayLog?.day_type || null,
    energy: todayLog?.energy_level || null,
    activeGoals,
    tasksPlanned,
    tasksCompleted,
    weeklyScore,
    habitsToday,
    habitCompletionRate,
    streak,
    alerts,
    recentLogs,
    recentWeeks,
    patterns,
    customFields: [],
    pendingProposals: [],
  };
}
