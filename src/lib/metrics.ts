import {
  Goal,
  Task,
  DailyLog,
  Habit,
  HabitCompletion,
  Session,
  DailyMetrics,
  WeeklyMetrics,
  GoalWithProgress,
  HabitWithStatus,
} from '@/types';
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  differenceInDays,
  parseISO,
  format,
  subDays,
  isSameDay,
} from 'date-fns';

// ============================================
// DATE HELPERS
// ============================================

export function getWeekId(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

export function isThisWeek(dateStr: string): boolean {
  const date = parseISO(dateStr);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  return isWithinInterval(date, { start: weekStart, end: weekEnd });
}

export function isWithinDays(dateStr: string, days: number): boolean {
  const date = parseISO(dateStr);
  const now = new Date();
  const cutoff = subDays(now, days);

  return date >= cutoff;
}

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ============================================
// GOAL CALCULATIONS
// ============================================

export function calculateGoalProgress(goal: Goal): number {
  if (goal.target_value === goal.starting_value) return 0;
  const progress =
    ((goal.current_value - goal.starting_value) /
      (goal.target_value - goal.starting_value)) *
    100;
  return Math.max(0, Math.min(100, progress));
}

export function getExpectedProgress(startDate: string, deadline: string): number {
  const start = parseISO(startDate);
  const end = parseISO(deadline);
  const now = new Date();

  const totalDays = differenceInDays(end, start);
  const elapsedDays = differenceInDays(now, start);

  if (totalDays <= 0) return 1;
  return Math.min(elapsedDays / totalDays, 1);
}

export function determineGoalStatus(
  goal: Goal
): 'ahead' | 'on_track' | 'behind' {
  const actualProgress = calculateGoalProgress(goal) / 100;
  const expectedProgress = getExpectedProgress(goal.start_date, goal.deadline);

  if (actualProgress >= expectedProgress * 1.1) return 'ahead';
  if (actualProgress >= expectedProgress * 0.9) return 'on_track';
  return 'behind';
}

export function enrichGoalWithProgress(goal: Goal): GoalWithProgress {
  const deadline = parseISO(goal.deadline);
  const now = new Date();

  return {
    ...goal,
    progress: calculateGoalProgress(goal),
    daysRemaining: Math.max(0, differenceInDays(deadline, now)),
    statusIndicator: determineGoalStatus(goal),
  };
}

// ============================================
// DAILY METRICS
// ============================================

export function calculateDailyMetrics(
  tasks: Task[],
  sessions: Session[],
  goals: Goal[],
  date: string
): DailyMetrics {
  const dayTasks = tasks.filter((t) => t.planned_date === date);
  const completed = dayTasks.filter((t) => t.status === 'completed');
  const daySessions = sessions.filter((s) => s.date === date);

  // Productive hours (sessions with focus >= 3)
  const productiveMinutes = daySessions
    .filter((s) => (s.focus_quality ?? 0) >= 3)
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  // Goal touch rate
  const activeGoals = goals.filter((g) => g.status === 'active');
  const touchedGoalIds = new Set(
    dayTasks.filter((t) => t.goal_id).map((t) => t.goal_id)
  );
  const goalTouchRate =
    activeGoals.length > 0 ? touchedGoalIds.size / activeGoals.length : 0;

  return {
    date,
    completion_rate: dayTasks.length > 0 ? completed.length / dayTasks.length : 0,
    tasks_planned: dayTasks.length,
    tasks_completed: completed.length,
    time_estimated: dayTasks.reduce((sum, t) => sum + (t.time_estimated || 0), 0),
    time_actual: completed.reduce((sum, t) => sum + (t.time_actual || 0), 0),
    productive_hours: productiveMinutes / 60,
    goal_touch_rate: goalTouchRate,
  };
}

// ============================================
// WEEKLY METRICS
// ============================================

export function calculateWeeklyScore(
  tasks: Task[],
  goals: Goal[],
  habitCompletions: HabitCompletion[],
  habits: Habit[],
  dailyLogs: DailyLog[]
): number {
  // Filter to this week's data
  const weekTasks = tasks.filter((t) => isThisWeek(t.planned_date));
  const completedTasks = weekTasks.filter((t) => t.status === 'completed');

  // Completion rate (40%)
  const completionRate =
    weekTasks.length > 0 ? completedTasks.length / weekTasks.length : 0;

  // Goal velocity (35%)
  const activeGoals = goals.filter(
    (g) => g.status === 'active' && g.type === 'monthly'
  );
  const velocities = activeGoals.map((g) => {
    const progress = calculateGoalProgress(g) / 100;
    const expected = getExpectedProgress(g.start_date, g.deadline);
    if (expected === 0) return 1;
    return Math.min(progress / expected, 1.5);
  });
  const avgVelocity =
    velocities.length > 0
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length
      : 0;

  // Bonus rate (15%)
  const bonusGoals = goals.filter(
    (g) => g.type === 'bonus' && isThisWeek(g.deadline)
  );
  const completedBonus = bonusGoals.filter((g) => g.status === 'completed');
  const bonusRate =
    bonusGoals.length > 0 ? completedBonus.length / bonusGoals.length : 1;

  // Consistency (10%) - days logged this week
  const weekLogs = dailyLogs.filter((l) => isThisWeek(l.date));
  const consistency = weekLogs.length / 7;

  // Weighted score
  const score =
    completionRate * 0.4 +
    avgVelocity * 0.35 +
    bonusRate * 0.15 +
    consistency * 0.1;

  return Math.round(Math.min(score * 100, 100));
}

export function calculateWeeklyMetrics(
  tasks: Task[],
  goals: Goal[],
  habitCompletions: HabitCompletion[],
  habits: Habit[],
  dailyLogs: DailyLog[],
  previousScore: number | null
): WeeklyMetrics {
  const weekTasks = tasks.filter((t) => isThisWeek(t.planned_date));
  const completedTasks = weekTasks.filter((t) => t.status === 'completed');

  const completionRate =
    weekTasks.length > 0 ? completedTasks.length / weekTasks.length : 0;

  const activeGoals = goals.filter(
    (g) => g.status === 'active' && g.type === 'monthly'
  );
  const velocities = activeGoals.map((g) => {
    const progress = calculateGoalProgress(g) / 100;
    const expected = getExpectedProgress(g.start_date, g.deadline);
    if (expected === 0) return 1;
    return Math.min(progress / expected, 1.5);
  });
  const goalVelocity =
    velocities.length > 0
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length
      : 0;

  const bonusGoals = goals.filter(
    (g) => g.type === 'bonus' && isThisWeek(g.deadline)
  );
  const completedBonus = bonusGoals.filter((g) => g.status === 'completed');
  const bonusRate =
    bonusGoals.length > 0 ? completedBonus.length / bonusGoals.length : 1;

  const weekLogs = dailyLogs.filter((l) => isThisWeek(l.date));
  const consistency = weekLogs.length / 7;

  const weeklyScore = calculateWeeklyScore(
    tasks,
    goals,
    habitCompletions,
    habits,
    dailyLogs
  );

  return {
    week_id: getWeekId(new Date()),
    weekly_score: weeklyScore,
    completion_rate: completionRate,
    goal_velocity: goalVelocity,
    bonus_rate: bonusRate,
    consistency,
    trend: previousScore !== null ? weeklyScore - previousScore : 0,
  };
}

// ============================================
// STREAK CALCULATIONS
// ============================================

export function calculateHabitStreak(
  habitId: string,
  completions: HabitCompletion[]
): number {
  const habitCompletions = completions
    .filter((c) => c.habit_id === habitId && c.completed)
    .map((c) => parseISO(c.date))
    .sort((a, b) => b.getTime() - a.getTime());

  if (habitCompletions.length === 0) return 0;

  let streak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  for (const completionDate of habitCompletions) {
    const diffDays = differenceInDays(expectedDate, completionDate);

    if (diffDays <= 1) {
      streak++;
      expectedDate = completionDate;
    } else {
      break;
    }
  }

  return streak;
}

export function calculateLoggingStreak(dailyLogs: DailyLog[]): number {
  const sortedLogs = dailyLogs
    .map((l) => parseISO(l.date))
    .sort((a, b) => b.getTime() - a.getTime());

  if (sortedLogs.length === 0) return 0;

  let streak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  for (const logDate of sortedLogs) {
    const diffDays = differenceInDays(expectedDate, logDate);

    if (diffDays <= 1) {
      streak++;
      expectedDate = logDate;
    } else {
      break;
    }
  }

  return streak;
}

// ============================================
// HABIT STATUS
// ============================================

export function enrichHabitWithStatus(
  habit: Habit,
  completions: HabitCompletion[],
  date: string
): HabitWithStatus {
  const todayCompletion = completions.find(
    (c) => c.habit_id === habit.habit_id && c.date === date
  );

  return {
    ...habit,
    completed: todayCompletion?.completed ?? false,
    streak: calculateHabitStreak(habit.habit_id, completions),
  };
}

export function isHabitActiveToday(habit: Habit): boolean {
  // If days_active is undefined or empty, assume habit is active every day
  if (!habit.days_active || habit.days_active.length === 0) {
    return true;
  }
  const today = format(new Date(), 'EEE').toLowerCase().slice(0, 3);
  const daysActive = habit.days_active.map((d) => d.toLowerCase().slice(0, 3));
  return daysActive.includes(today);
}

export function getHabitCompletionRate(
  habitCompletions: HabitCompletion[],
  habits: Habit[]
): number {
  const weekCompletions = habitCompletions.filter((c) => isThisWeek(c.date));
  if (weekCompletions.length === 0) return 0;

  const completed = weekCompletions.filter((c) => c.completed).length;
  const total = weekCompletions.length;

  return total > 0 ? completed / total : 0;
}

// ============================================
// ROLLING CALCULATIONS
// ============================================

export function calculate7DayAverage(dailyMetrics: DailyMetrics[]): number {
  const recent = dailyMetrics
    .filter((m) => isWithinDays(m.date, 7))
    .map((m) => m.completion_rate);

  if (recent.length === 0) return 0;
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

export function calculate30DayTrend(weeklyMetrics: WeeklyMetrics[]): number {
  if (weeklyMetrics.length < 2) return 0;

  const recent = weeklyMetrics.slice(-4);
  if (recent.length < 2) return 0;

  const firstScore = recent[0].weekly_score;
  const lastScore = recent[recent.length - 1].weekly_score;

  return lastScore - firstScore;
}

// ============================================
// CORRELATION ANALYSIS
// ============================================

export interface CorrelationResult {
  factor: string;
  correlation: number;
  insight: string;
}

export function analyzeSleepCorrelation(
  dailyLogs: DailyLog[],
  dailyMetrics: DailyMetrics[]
): CorrelationResult | null {
  const dataPoints: { sleep: number; completion: number }[] = [];

  for (const log of dailyLogs) {
    if (log.hours_slept === null) continue;

    const metric = dailyMetrics.find((m) => m.date === log.date);
    if (!metric) continue;

    dataPoints.push({
      sleep: log.hours_slept,
      completion: metric.completion_rate,
    });
  }

  if (dataPoints.length < 7) return null;

  const correlation = calculateCorrelation(
    dataPoints.map((d) => d.sleep),
    dataPoints.map((d) => d.completion)
  );

  const avgSleepHigh = dataPoints
    .filter((d) => d.sleep >= 7)
    .map((d) => d.completion);
  const avgSleepLow = dataPoints
    .filter((d) => d.sleep < 7)
    .map((d) => d.completion);

  const highAvg =
    avgSleepHigh.length > 0
      ? avgSleepHigh.reduce((a, b) => a + b, 0) / avgSleepHigh.length
      : 0;
  const lowAvg =
    avgSleepLow.length > 0
      ? avgSleepLow.reduce((a, b) => a + b, 0) / avgSleepLow.length
      : 0;

  const diff = Math.round((highAvg - lowAvg) * 100);

  return {
    factor: 'sleep',
    correlation,
    insight:
      diff > 10
        ? `When you sleep 7+ hours, completion rate is ${diff}% higher`
        : 'No strong correlation between sleep and completion rate found',
  };
}

export function analyzeEnergyCorrelation(
  dailyLogs: DailyLog[],
  dailyMetrics: DailyMetrics[]
): CorrelationResult | null {
  const dataPoints: { energy: number; completion: number }[] = [];

  for (const log of dailyLogs) {
    if (log.energy_level === null) continue;

    const metric = dailyMetrics.find((m) => m.date === log.date);
    if (!metric) continue;

    dataPoints.push({
      energy: log.energy_level,
      completion: metric.completion_rate,
    });
  }

  if (dataPoints.length < 7) return null;

  const correlation = calculateCorrelation(
    dataPoints.map((d) => d.energy),
    dataPoints.map((d) => d.completion)
  );

  return {
    factor: 'energy',
    correlation,
    insight:
      correlation > 0.5
        ? 'Higher energy days strongly correlate with better completion'
        : correlation > 0.3
        ? 'Energy level has moderate impact on completion rate'
        : 'Energy tracking may not be useful for predictions',
  };
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ============================================
// PATTERN DETECTION
// ============================================

export interface Pattern {
  insight: string;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================
// PERSONAL RECORDS
// ============================================

export interface PersonalRecords {
  bestWeeklyScore: { score: number; weekId: string } | null;
  longestLoggingStreak: number;
  longestHabitStreak: { habitName: string; days: number } | null;
  highestDailyCompletion: { rate: number; date: string } | null;
  mostProductiveDay: { tasks: number; date: string } | null;
  bestHabitWeek: { rate: number; weekId: string } | null;
}

export function calculatePersonalRecords(
  dailyLogs: DailyLog[],
  tasks: Task[],
  habits: Habit[],
  habitCompletions: HabitCompletion[],
  weeklySnapshots: { week_id: string; score: number }[]
): PersonalRecords {
  // Best weekly score
  const bestWeeklyScore = weeklySnapshots.length > 0
    ? weeklySnapshots.reduce((best, w) =>
        w.score > (best?.score ?? 0) ? { score: w.score, weekId: w.week_id } : best,
        null as { score: number; weekId: string } | null
      )
    : null;

  // Longest logging streak (all-time)
  const longestLoggingStreak = calculateAllTimeLoggingStreak(dailyLogs);

  // Longest habit streak
  let longestHabitStreak: { habitName: string; days: number } | null = null;
  for (const habit of habits) {
    const streak = calculateAllTimeHabitStreak(habit.habit_id, habitCompletions);
    if (!longestHabitStreak || streak > longestHabitStreak.days) {
      longestHabitStreak = { habitName: habit.name, days: streak };
    }
  }

  // Highest daily completion rate
  const tasksByDate: Record<string, { planned: number; completed: number }> = {};
  for (const task of tasks) {
    if (!task.planned_date) continue;
    if (!tasksByDate[task.planned_date]) {
      tasksByDate[task.planned_date] = { planned: 0, completed: 0 };
    }
    tasksByDate[task.planned_date].planned++;
    if (task.status === 'completed') {
      tasksByDate[task.planned_date].completed++;
    }
  }

  let highestDailyCompletion: { rate: number; date: string } | null = null;
  for (const [date, stats] of Object.entries(tasksByDate)) {
    if (stats.planned >= 3) { // Only count days with at least 3 tasks
      const rate = stats.completed / stats.planned;
      if (!highestDailyCompletion || rate > highestDailyCompletion.rate) {
        highestDailyCompletion = { rate, date };
      }
    }
  }

  // Most productive day (most tasks completed)
  let mostProductiveDay: { tasks: number; date: string } | null = null;
  for (const [date, stats] of Object.entries(tasksByDate)) {
    if (!mostProductiveDay || stats.completed > mostProductiveDay.tasks) {
      mostProductiveDay = { tasks: stats.completed, date };
    }
  }

  // Best habit week
  const habitWeeks: Record<string, { completed: number; total: number }> = {};
  for (const completion of habitCompletions) {
    const weekId = getWeekId(parseISO(completion.date));
    if (!habitWeeks[weekId]) {
      habitWeeks[weekId] = { completed: 0, total: 0 };
    }
    habitWeeks[weekId].total++;
    if (completion.completed) {
      habitWeeks[weekId].completed++;
    }
  }

  let bestHabitWeek: { rate: number; weekId: string } | null = null;
  for (const [weekId, stats] of Object.entries(habitWeeks)) {
    if (stats.total >= 5) { // Only count weeks with at least 5 habit entries
      const rate = stats.completed / stats.total;
      if (!bestHabitWeek || rate > bestHabitWeek.rate) {
        bestHabitWeek = { rate, weekId };
      }
    }
  }

  return {
    bestWeeklyScore,
    longestLoggingStreak,
    longestHabitStreak,
    highestDailyCompletion,
    mostProductiveDay,
    bestHabitWeek,
  };
}

function calculateAllTimeLoggingStreak(dailyLogs: DailyLog[]): number {
  if (dailyLogs.length === 0) return 0;

  const sortedDates = dailyLogs
    .map((l) => parseISO(l.date))
    .sort((a, b) => a.getTime() - b.getTime());

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = differenceInDays(sortedDates[i], sortedDates[i - 1]);
    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diff > 1) {
      currentStreak = 1;
    }
    // diff === 0 means same day, don't change streak
  }

  return maxStreak;
}

function calculateAllTimeHabitStreak(
  habitId: string,
  completions: HabitCompletion[]
): number {
  const habitCompletions = completions
    .filter((c) => c.habit_id === habitId && c.completed)
    .map((c) => parseISO(c.date))
    .sort((a, b) => a.getTime() - b.getTime());

  if (habitCompletions.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < habitCompletions.length; i++) {
    const diff = differenceInDays(habitCompletions[i], habitCompletions[i - 1]);
    if (diff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else if (diff > 1) {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

// ============================================
// STREAK MILESTONES
// ============================================

export const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100, 150, 200, 365];

export interface StreakMilestone {
  days: number;
  label: string;
  message: string;
}

export function getStreakMilestone(streak: number): StreakMilestone | null {
  const milestones: Record<number, StreakMilestone> = {
    7: { days: 7, label: '1 Week', message: 'One week strong! Keep building!' },
    14: { days: 14, label: '2 Weeks', message: 'Two weeks! Habits are forming.' },
    21: { days: 21, label: '3 Weeks', message: '21 days - the habit threshold!' },
    30: { days: 30, label: '1 Month', message: 'A full month! Incredible consistency.' },
    60: { days: 60, label: '2 Months', message: '60 days! This is who you are now.' },
    90: { days: 90, label: '3 Months', message: '90 days! A quarter of discipline.' },
    100: { days: 100, label: 'Century', message: '100 days! Triple digits!' },
    150: { days: 150, label: '150 Days', message: '150 days! Legendary consistency.' },
    200: { days: 200, label: '200 Days', message: '200 days! Unstoppable.' },
    365: { days: 365, label: '1 Year', message: 'A FULL YEAR! You are the 1%.' },
  };

  // Find the highest milestone reached
  let reached: StreakMilestone | null = null;
  for (const milestone of STREAK_MILESTONES) {
    if (streak >= milestone) {
      reached = milestones[milestone];
    }
  }

  return reached;
}

export function getNextStreakMilestone(streak: number): StreakMilestone | null {
  for (const milestone of STREAK_MILESTONES) {
    if (streak < milestone) {
      return {
        days: milestone,
        label: milestone === 7 ? '1 Week' :
               milestone === 14 ? '2 Weeks' :
               milestone === 21 ? '3 Weeks' :
               milestone === 30 ? '1 Month' :
               milestone === 60 ? '2 Months' :
               milestone === 90 ? '3 Months' :
               milestone === 100 ? 'Century' :
               milestone === 365 ? '1 Year' : `${milestone} Days`,
        message: `${milestone - streak} days to go!`,
      };
    }
  }
  return null;
}

export function detectPatterns(
  dailyLogs: DailyLog[],
  tasks: Task[],
  habits: Habit[],
  habitCompletions: HabitCompletion[]
): Pattern[] {
  const patterns: Pattern[] = [];

  // Detect worst day of week
  const dayScores: Record<string, number[]> = {};
  for (const log of dailyLogs) {
    if (log.overall_rating === null) continue;
    const dayOfWeek = format(parseISO(log.date), 'EEEE');
    if (!dayScores[dayOfWeek]) dayScores[dayOfWeek] = [];
    dayScores[dayOfWeek].push(log.overall_rating);
  }

  const avgByDay = Object.entries(dayScores)
    .map(([day, scores]) => ({
      day,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }))
    .filter((d) => d.count >= 3);

  if (avgByDay.length > 0) {
    const worst = avgByDay.reduce((min, d) => (d.avg < min.avg ? d : min));
    const best = avgByDay.reduce((max, d) => (d.avg > max.avg ? d : max));

    if (best.avg - worst.avg > 0.5) {
      patterns.push({
        insight: `${worst.day}s are consistently your worst day (avg ${worst.avg.toFixed(1)}/5)`,
        confidence: worst.count >= 5 ? 'high' : 'medium',
      });
    }
  }

  // Detect post-work productivity drop
  const longWorkDays = dailyLogs.filter(
    (l) => l.work_hours !== null && l.work_hours >= 6
  );
  if (longWorkDays.length >= 5) {
    const longWorkAvg =
      longWorkDays
        .filter((l) => l.overall_rating !== null)
        .reduce((sum, l) => sum + (l.overall_rating ?? 0), 0) /
      longWorkDays.length;

    const shortWorkDays = dailyLogs.filter(
      (l) => l.work_hours !== null && l.work_hours < 6 && l.work_hours > 0
    );
    const shortWorkAvg =
      shortWorkDays.length > 0
        ? shortWorkDays
            .filter((l) => l.overall_rating !== null)
            .reduce((sum, l) => sum + (l.overall_rating ?? 0), 0) /
          shortWorkDays.length
        : 0;

    if (shortWorkAvg - longWorkAvg > 0.5) {
      patterns.push({
        insight: `Productivity drops after 6+ hour work days`,
        confidence: longWorkDays.length >= 10 ? 'high' : 'medium',
      });
    }
  }

  return patterns;
}
