import {
  Goal,
  Task,
  DailyLog,
  Habit,
  HabitCompletion,
  WeeklySnapshot,
  DailyMetrics,
  AlertLevel,
} from '@/types';
import {
  differenceInDays,
  parseISO,
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from 'date-fns';
import { calculateGoalProgress, getExpectedProgress, calculateDailyMetrics } from './metrics';

// ============================================
// TYPES
// ============================================

export interface CorrelationResult {
  factor1: string;
  factor2: string;
  correlation: number;
  sampleSize: number;
  insight: string;
  confidence: 'high' | 'medium' | 'low';
  recommendation?: string;
}

export interface PredictiveAlert {
  id: string;
  level: AlertLevel;
  type: 'pace' | 'trend' | 'deadline' | 'pattern' | 'correlation';
  goalId?: string;
  message: string;
  prediction: string;
  confidence: number;
  actionable: string;
  timestamp: string;
}

export interface PatternInsight {
  id: string;
  type: 'time_of_day' | 'day_of_week' | 'energy' | 'sleep' | 'work_load' | 'habit_chain' | 'goal_neglect';
  insight: string;
  confidence: 'high' | 'medium' | 'low';
  dataPoints: number;
  recommendation: string;
}

// ============================================
// CORRELATION ANALYSIS
// ============================================

export function analyzeAllCorrelations(
  dailyLogs: DailyLog[],
  tasks: Task[],
  goals: Goal[],
  sessions: { date: string; focus_quality: number; duration_minutes: number }[]
): CorrelationResult[] {
  const results: CorrelationResult[] = [];

  // Calculate daily metrics for correlation
  const dailyMetrics = dailyLogs.map((log) => {
    const metrics = calculateDailyMetrics(tasks, sessions as any, goals, log.date);
    return {
      ...metrics,
      logDate: log.date,
      energy: log.energy_level,
      sleep: log.hours_slept,
      workHours: log.work_hours,
      schoolHours: log.school_hours,
      rating: log.overall_rating,
    };
  });

  // Sleep vs Completion Rate
  const sleepCorrelation = calculateCorrelationWithInsight(
    dailyMetrics.filter((d) => d.sleep !== null && d.completion_rate !== undefined),
    'sleep',
    'completion_rate',
    'Sleep Hours',
    'Completion Rate'
  );
  if (sleepCorrelation) results.push(sleepCorrelation);

  // Energy vs Completion Rate
  const energyCorrelation = calculateCorrelationWithInsight(
    dailyMetrics.filter((d) => d.energy !== null && d.completion_rate !== undefined),
    'energy',
    'completion_rate',
    'Energy Level',
    'Completion Rate'
  );
  if (energyCorrelation) results.push(energyCorrelation);

  // Work Hours vs Completion Rate (inverse expected)
  const workCorrelation = calculateCorrelationWithInsight(
    dailyMetrics.filter((d) => d.workHours !== null && d.completion_rate !== undefined),
    'workHours',
    'completion_rate',
    'Work Hours',
    'Completion Rate'
  );
  if (workCorrelation) results.push(workCorrelation);

  // Sleep vs Energy
  const sleepEnergyCorrelation = calculateCorrelationWithInsight(
    dailyMetrics.filter((d) => d.sleep !== null && d.energy !== null),
    'sleep',
    'energy',
    'Sleep Hours',
    'Energy Level'
  );
  if (sleepEnergyCorrelation) results.push(sleepEnergyCorrelation);

  // Energy vs Overall Rating
  const energyRatingCorrelation = calculateCorrelationWithInsight(
    dailyMetrics.filter((d) => d.energy !== null && d.rating !== null),
    'energy',
    'rating',
    'Energy Level',
    'Day Rating'
  );
  if (energyRatingCorrelation) results.push(energyRatingCorrelation);

  return results;
}

function calculateCorrelationWithInsight(
  data: Record<string, any>[],
  key1: string,
  key2: string,
  label1: string,
  label2: string
): CorrelationResult | null {
  if (data.length < 7) return null;

  const x = data.map((d) => Number(d[key1]));
  const y = data.map((d) => Number(d[key2]));

  const correlation = pearsonCorrelation(x, y);
  const confidence = data.length >= 30 ? 'high' : data.length >= 14 ? 'medium' : 'low';

  let insight = '';
  let recommendation = '';

  if (Math.abs(correlation) >= 0.7) {
    insight = `Strong ${correlation > 0 ? 'positive' : 'negative'} correlation between ${label1} and ${label2}`;
    recommendation = correlation > 0
      ? `Increasing ${label1} significantly improves ${label2}`
      : `Higher ${label1} is associated with lower ${label2}`;
  } else if (Math.abs(correlation) >= 0.4) {
    insight = `Moderate ${correlation > 0 ? 'positive' : 'negative'} correlation between ${label1} and ${label2}`;
    recommendation = `${label1} has a noticeable impact on ${label2}`;
  } else if (Math.abs(correlation) >= 0.2) {
    insight = `Weak correlation between ${label1} and ${label2}`;
  } else {
    insight = `No significant correlation between ${label1} and ${label2}`;
  }

  // Generate specific recommendations
  if (key1 === 'sleep' && key2 === 'completion_rate' && correlation > 0.3) {
    const avgSleepHigh = data.filter((d) => d.sleep >= 7).map((d) => d.completion_rate);
    const avgSleepLow = data.filter((d) => d.sleep < 7).map((d) => d.completion_rate);

    if (avgSleepHigh.length > 0 && avgSleepLow.length > 0) {
      const highAvg = avgSleepHigh.reduce((a, b) => a + b, 0) / avgSleepHigh.length;
      const lowAvg = avgSleepLow.reduce((a, b) => a + b, 0) / avgSleepLow.length;
      const diff = Math.round((highAvg - lowAvg) * 100);

      if (diff > 10) {
        recommendation = `With 7+ hours of sleep, your completion rate is ${diff}% higher. Prioritize sleep.`;
      }
    }
  }

  return {
    factor1: label1,
    factor2: label2,
    correlation: Math.round(correlation * 100) / 100,
    sampleSize: data.length,
    insight,
    confidence,
    recommendation: recommendation || undefined,
  };
}

function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// ============================================
// PREDICTIVE ALERTS
// ============================================

export function generatePredictiveAlerts(
  goals: Goal[],
  tasks: Task[],
  dailyLogs: DailyLog[],
  weeklySnapshots: WeeklySnapshot[]
): PredictiveAlert[] {
  const alerts: PredictiveAlert[] = [];
  const now = new Date();

  // Analyze each active goal for pace predictions
  goals
    .filter((g) => g.status === 'active')
    .forEach((goal) => {
      const paceAlert = analyzePace(goal);
      if (paceAlert) alerts.push(paceAlert);

      const neglectAlert = analyzeNeglect(goal, tasks);
      if (neglectAlert) alerts.push(neglectAlert);
    });

  // Analyze trend alerts
  const trendAlert = analyzeTrend(weeklySnapshots);
  if (trendAlert) alerts.push(trendAlert);

  // Analyze consistency alerts
  const consistencyAlert = analyzeConsistency(dailyLogs);
  if (consistencyAlert) alerts.push(consistencyAlert);

  return alerts;
}

function analyzePace(goal: Goal): PredictiveAlert | null {
  const progress = calculateGoalProgress(goal);
  const expected = getExpectedProgress(goal.start_date, goal.deadline) * 100;
  const daysRemaining = differenceInDays(parseISO(goal.deadline), new Date());

  if (daysRemaining <= 0) return null;

  // Calculate current velocity (progress per day)
  const daysElapsed = differenceInDays(new Date(), parseISO(goal.start_date));
  if (daysElapsed <= 0) return null;

  const velocity = progress / daysElapsed;
  const projectedFinal = progress + velocity * daysRemaining;
  const shortfall = 100 - projectedFinal;

  if (shortfall > 10 && progress < expected - 10) {
    // Significantly behind
    const requiredVelocity = (100 - progress) / daysRemaining;
    const velocityIncrease = Math.round((requiredVelocity / velocity - 1) * 100);

    return {
      id: `pace_${goal.goal_id}_${Date.now()}`,
      level: shortfall > 30 ? 'critical' : 'warning',
      type: 'pace',
      goalId: goal.goal_id,
      message: `"${goal.title}" is at risk of being missed`,
      prediction: `At current pace, you'll reach ${Math.round(projectedFinal)}% by deadline (need 100%)`,
      confidence: daysElapsed >= 7 ? 0.8 : 0.6,
      actionable: velocityIncrease > 0
        ? `Need to increase pace by ${velocityIncrease}% to hit target`
        : 'Maintain current pace to hit target',
      timestamp: new Date().toISOString(),
    };
  }

  // Positive alert if ahead
  if (progress > expected + 15 && daysRemaining > 7) {
    return {
      id: `pace_ahead_${goal.goal_id}_${Date.now()}`,
      level: 'positive',
      type: 'pace',
      goalId: goal.goal_id,
      message: `"${goal.title}" is ahead of schedule`,
      prediction: `On track to complete ${Math.round(projectedFinal)}% by deadline`,
      confidence: 0.7,
      actionable: 'Consider raising the target or reallocating time to other goals',
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

function analyzeNeglect(goal: Goal, tasks: Task[]): PredictiveAlert | null {
  const goalTasks = tasks.filter((t) => t.goal_id === goal.goal_id);
  const recentTasks = goalTasks.filter((t) => {
    const date = parseISO(t.planned_date);
    return differenceInDays(new Date(), date) <= 7;
  });

  const olderTasks = goalTasks.filter((t) => {
    const date = parseISO(t.planned_date);
    const daysDiff = differenceInDays(new Date(), date);
    return daysDiff > 7 && daysDiff <= 14;
  });

  // Check if goal hasn't been worked on in 5+ days
  const lastWorkedTask = goalTasks
    .filter((t) => t.status === 'completed')
    .sort((a, b) => parseISO(b.completed_date || b.planned_date).getTime() - parseISO(a.completed_date || a.planned_date).getTime())[0];

  if (lastWorkedTask) {
    const daysSinceWork = differenceInDays(
      new Date(),
      parseISO(lastWorkedTask.completed_date || lastWorkedTask.planned_date)
    );

    if (daysSinceWork >= 5) {
      return {
        id: `neglect_${goal.goal_id}_${Date.now()}`,
        level: daysSinceWork >= 7 ? 'warning' : 'info',
        type: 'pattern',
        goalId: goal.goal_id,
        message: `"${goal.title}" hasn't been touched in ${daysSinceWork} days`,
        prediction: 'Continued neglect may cause goal to fall behind',
        confidence: 0.9,
        actionable: 'Schedule at least one task for this goal this week',
        timestamp: new Date().toISOString(),
      };
    }
  }

  return null;
}

function analyzeTrend(snapshots: WeeklySnapshot[]): PredictiveAlert | null {
  if (snapshots.length < 3) return null;

  const recent = snapshots.slice(-4);
  const scores = recent.map((s) => s.score);

  // Check for consistent decline
  let declining = true;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] >= scores[i - 1]) {
      declining = false;
      break;
    }
  }

  if (declining && scores.length >= 3) {
    const totalDrop = scores[0] - scores[scores.length - 1];

    return {
      id: `trend_decline_${Date.now()}`,
      level: totalDrop > 20 ? 'critical' : 'warning',
      type: 'trend',
      message: `Weekly scores have declined for ${scores.length} consecutive weeks`,
      prediction: `Score dropped from ${scores[0]} to ${scores[scores.length - 1]} (-${totalDrop} points)`,
      confidence: 0.85,
      actionable: 'Review what changed and identify blockers',
      timestamp: new Date().toISOString(),
    };
  }

  // Check for improvement
  let improving = true;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] <= scores[i - 1]) {
      improving = false;
      break;
    }
  }

  if (improving && scores.length >= 3) {
    const totalGain = scores[scores.length - 1] - scores[0];

    return {
      id: `trend_improve_${Date.now()}`,
      level: 'positive',
      type: 'trend',
      message: `Weekly scores have improved for ${scores.length} consecutive weeks`,
      prediction: `Score increased from ${scores[0]} to ${scores[scores.length - 1]} (+${totalGain} points)`,
      confidence: 0.85,
      actionable: 'Great momentum! Keep doing what\'s working',
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

function analyzeConsistency(dailyLogs: DailyLog[]): PredictiveAlert | null {
  const recent = dailyLogs.filter((l) => differenceInDays(new Date(), parseISO(l.date)) <= 7);

  if (recent.length < 4) {
    return {
      id: `consistency_${Date.now()}`,
      level: 'warning',
      type: 'pattern',
      message: `Only ${recent.length} days logged this week`,
      prediction: 'Inconsistent logging makes it hard to track patterns',
      confidence: 0.9,
      actionable: 'Try to log daily, even briefly, to build the habit',
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

// ============================================
// ADVANCED PATTERN DETECTION
// ============================================

export function detectAdvancedPatterns(
  dailyLogs: DailyLog[],
  tasks: Task[],
  habits: Habit[],
  habitCompletions: HabitCompletion[],
  goals: Goal[]
): PatternInsight[] {
  const patterns: PatternInsight[] = [];

  // Day of week patterns
  const dayOfWeekPattern = analyzeDayOfWeek(dailyLogs, tasks);
  if (dayOfWeekPattern) patterns.push(dayOfWeekPattern);

  // Best/worst day pattern
  const bestWorstPattern = analyzeBestWorstDays(dailyLogs);
  if (bestWorstPattern) patterns.push(bestWorstPattern);

  // Energy pattern
  const energyPattern = analyzeEnergyPattern(dailyLogs, tasks);
  if (energyPattern) patterns.push(energyPattern);

  // Work load impact
  const workLoadPattern = analyzeWorkLoadImpact(dailyLogs, tasks);
  if (workLoadPattern) patterns.push(workLoadPattern);

  // Habit chain pattern
  const habitChainPattern = analyzeHabitChains(habitCompletions, habits);
  if (habitChainPattern) patterns.push(habitChainPattern);

  // Goal balance pattern
  const goalBalancePattern = analyzeGoalBalance(tasks, goals);
  if (goalBalancePattern) patterns.push(goalBalancePattern);

  return patterns;
}

function analyzeDayOfWeek(dailyLogs: DailyLog[], tasks: Task[]): PatternInsight | null {
  const dayStats: Record<string, { completionRates: number[]; ratings: number[] }> = {};

  dailyLogs.forEach((log) => {
    const dayName = format(parseISO(log.date), 'EEEE');
    if (!dayStats[dayName]) {
      dayStats[dayName] = { completionRates: [], ratings: [] };
    }

    const dayTasks = tasks.filter((t) => t.planned_date === log.date);
    const completed = dayTasks.filter((t) => t.status === 'completed').length;
    const rate = dayTasks.length > 0 ? completed / dayTasks.length : null;

    if (rate !== null) dayStats[dayName].completionRates.push(rate);
    if (log.overall_rating !== null) dayStats[dayName].ratings.push(log.overall_rating);
  });

  const dayAverages = Object.entries(dayStats)
    .filter(([_, stats]) => stats.completionRates.length >= 3)
    .map(([day, stats]) => ({
      day,
      avgCompletion: stats.completionRates.reduce((a, b) => a + b, 0) / stats.completionRates.length,
      avgRating: stats.ratings.length > 0 ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length : null,
      count: stats.completionRates.length,
    }))
    .sort((a, b) => b.avgCompletion - a.avgCompletion);

  if (dayAverages.length >= 4) {
    const best = dayAverages[0];
    const worst = dayAverages[dayAverages.length - 1];

    if (best.avgCompletion - worst.avgCompletion > 0.2) {
      return {
        id: `day_pattern_${Date.now()}`,
        type: 'day_of_week',
        insight: `${best.day}s are your most productive day (${Math.round(best.avgCompletion * 100)}% completion), ${worst.day}s are lowest (${Math.round(worst.avgCompletion * 100)}%)`,
        confidence: Math.min(best.count, worst.count) >= 5 ? 'high' : 'medium',
        dataPoints: dayAverages.reduce((sum, d) => sum + d.count, 0),
        recommendation: `Schedule important tasks on ${best.day}s. Consider lighter goals on ${worst.day}s.`,
      };
    }
  }

  return null;
}

function analyzeBestWorstDays(dailyLogs: DailyLog[]): PatternInsight | null {
  const rated = dailyLogs.filter((l) => l.overall_rating !== null);
  if (rated.length < 10) return null;

  const bestDays = rated.filter((l) => (l.overall_rating || 0) >= 4);
  const worstDays = rated.filter((l) => (l.overall_rating || 0) <= 2);

  if (bestDays.length < 3 || worstDays.length < 3) return null;

  // Analyze what's different
  const bestAvgSleep = bestDays.filter((d) => d.hours_slept).reduce((sum, d) => sum + (d.hours_slept || 0), 0) / bestDays.length;
  const worstAvgSleep = worstDays.filter((d) => d.hours_slept).reduce((sum, d) => sum + (d.hours_slept || 0), 0) / worstDays.length;

  const bestAvgWork = bestDays.filter((d) => d.work_hours !== null).reduce((sum, d) => sum + (d.work_hours || 0), 0) / bestDays.length;
  const worstAvgWork = worstDays.filter((d) => d.work_hours !== null).reduce((sum, d) => sum + (d.work_hours || 0), 0) / worstDays.length;

  const factors: string[] = [];

  if (bestAvgSleep - worstAvgSleep > 0.5) {
    factors.push(`${Math.round((bestAvgSleep - worstAvgSleep) * 10) / 10} more hours of sleep`);
  }

  if (worstAvgWork - bestAvgWork > 1) {
    factors.push(`${Math.round(worstAvgWork - bestAvgWork)} fewer work hours`);
  }

  if (factors.length > 0) {
    return {
      id: `best_worst_${Date.now()}`,
      type: 'energy',
      insight: `Your best days have: ${factors.join(', ')}`,
      confidence: 'medium',
      dataPoints: bestDays.length + worstDays.length,
      recommendation: 'Try to replicate the conditions of your best days',
    };
  }

  return null;
}

function analyzeEnergyPattern(dailyLogs: DailyLog[], tasks: Task[]): PatternInsight | null {
  const withEnergy = dailyLogs.filter((l) => l.energy_level !== null);
  if (withEnergy.length < 14) return null;

  const highEnergy = withEnergy.filter((l) => (l.energy_level || 0) >= 4);
  const lowEnergy = withEnergy.filter((l) => (l.energy_level || 0) <= 2);

  if (highEnergy.length < 5 || lowEnergy.length < 5) return null;

  // Calculate completion rates
  const highEnergyCompletion = highEnergy.map((log) => {
    const dayTasks = tasks.filter((t) => t.planned_date === log.date);
    const completed = dayTasks.filter((t) => t.status === 'completed').length;
    return dayTasks.length > 0 ? completed / dayTasks.length : null;
  }).filter((r) => r !== null) as number[];

  const lowEnergyCompletion = lowEnergy.map((log) => {
    const dayTasks = tasks.filter((t) => t.planned_date === log.date);
    const completed = dayTasks.filter((t) => t.status === 'completed').length;
    return dayTasks.length > 0 ? completed / dayTasks.length : null;
  }).filter((r) => r !== null) as number[];

  if (highEnergyCompletion.length < 3 || lowEnergyCompletion.length < 3) return null;

  const highAvg = highEnergyCompletion.reduce((a, b) => a + b, 0) / highEnergyCompletion.length;
  const lowAvg = lowEnergyCompletion.reduce((a, b) => a + b, 0) / lowEnergyCompletion.length;

  const diff = Math.round((highAvg - lowAvg) * 100);

  if (diff > 15) {
    return {
      id: `energy_${Date.now()}`,
      type: 'energy',
      insight: `High energy days have ${diff}% higher completion rate`,
      confidence: 'high',
      dataPoints: highEnergyCompletion.length + lowEnergyCompletion.length,
      recommendation: 'Track what gives you energy and prioritize those factors',
    };
  }

  return null;
}

function analyzeWorkLoadImpact(dailyLogs: DailyLog[], tasks: Task[]): PatternInsight | null {
  const withWork = dailyLogs.filter((l) => l.work_hours !== null && (l.work_hours || 0) > 0);
  if (withWork.length < 10) return null;

  const heavyWork = withWork.filter((l) => (l.work_hours || 0) >= 6);
  const lightWork = withWork.filter((l) => (l.work_hours || 0) < 4);

  if (heavyWork.length < 4 || lightWork.length < 4) return null;

  const heavyCompletion = heavyWork.map((log) => {
    const dayTasks = tasks.filter((t) => t.planned_date === log.date);
    const completed = dayTasks.filter((t) => t.status === 'completed').length;
    return dayTasks.length > 0 ? completed / dayTasks.length : null;
  }).filter((r) => r !== null) as number[];

  const lightCompletion = lightWork.map((log) => {
    const dayTasks = tasks.filter((t) => t.planned_date === log.date);
    const completed = dayTasks.filter((t) => t.status === 'completed').length;
    return dayTasks.length > 0 ? completed / dayTasks.length : null;
  }).filter((r) => r !== null) as number[];

  if (heavyCompletion.length < 3 || lightCompletion.length < 3) return null;

  const heavyAvg = heavyCompletion.reduce((a, b) => a + b, 0) / heavyCompletion.length;
  const lightAvg = lightCompletion.reduce((a, b) => a + b, 0) / lightCompletion.length;

  const diff = Math.round((lightAvg - heavyAvg) * 100);

  if (diff > 15) {
    return {
      id: `workload_${Date.now()}`,
      type: 'work_load',
      insight: `Days with 6+ work hours have ${diff}% lower goal completion`,
      confidence: 'high',
      dataPoints: heavyCompletion.length + lightCompletion.length,
      recommendation: 'Plan fewer goal tasks on heavy work days, or front-load them',
    };
  }

  return null;
}

function analyzeHabitChains(completions: HabitCompletion[], habits: Habit[]): PatternInsight | null {
  if (completions.length < 30) return null;

  // Group completions by date
  const byDate: Record<string, Set<string>> = {};
  completions.forEach((c) => {
    if (c.completed) {
      if (!byDate[c.date]) byDate[c.date] = new Set();
      byDate[c.date].add(c.habit_id);
    }
  });

  // Find habit pairs that often complete together
  const pairs: Record<string, number> = {};
  const habitIds = habits.map((h) => h.habit_id);

  Object.values(byDate).forEach((completedSet) => {
    const completed = Array.from(completedSet);
    for (let i = 0; i < completed.length; i++) {
      for (let j = i + 1; j < completed.length; j++) {
        const key = [completed[i], completed[j]].sort().join('_');
        pairs[key] = (pairs[key] || 0) + 1;
      }
    }
  });

  // Find strongest chain
  const sortedPairs = Object.entries(pairs).sort((a, b) => b[1] - a[1]);
  if (sortedPairs.length > 0 && sortedPairs[0][1] >= 10) {
    const [pairKey, count] = sortedPairs[0];
    const [id1, id2] = pairKey.split('_');
    const habit1 = habits.find((h) => h.habit_id === id1);
    const habit2 = habits.find((h) => h.habit_id === id2);

    if (habit1 && habit2) {
      return {
        id: `habit_chain_${Date.now()}`,
        type: 'habit_chain',
        insight: `"${habit1.name}" and "${habit2.name}" are often completed together (${count} times)`,
        confidence: count >= 20 ? 'high' : 'medium',
        dataPoints: count,
        recommendation: 'Consider linking these habits - completing one can trigger the other',
      };
    }
  }

  return null;
}

function analyzeGoalBalance(tasks: Task[], goals: Goal[]): PatternInsight | null {
  const activeGoals = goals.filter((g) => g.status === 'active');
  if (activeGoals.length < 2) return null;

  const recentTasks = tasks.filter((t) => {
    const daysDiff = differenceInDays(new Date(), parseISO(t.planned_date));
    return daysDiff >= 0 && daysDiff <= 14;
  });

  if (recentTasks.length < 10) return null;

  // Count tasks per goal
  const tasksByGoal: Record<string, number> = {};
  activeGoals.forEach((g) => {
    tasksByGoal[g.goal_id] = 0;
  });

  recentTasks.forEach((t) => {
    if (t.goal_id && tasksByGoal[t.goal_id] !== undefined) {
      tasksByGoal[t.goal_id]++;
    }
  });

  // Find neglected goals
  const neglected = activeGoals.filter((g) => tasksByGoal[g.goal_id] === 0);
  const overFocused = activeGoals
    .map((g) => ({ goal: g, count: tasksByGoal[g.goal_id] }))
    .sort((a, b) => b.count - a.count);

  if (neglected.length > 0) {
    return {
      id: `goal_balance_${Date.now()}`,
      type: 'goal_neglect',
      insight: `${neglected.length} goal(s) had no tasks in the past 2 weeks: ${neglected.map((g) => g.title).join(', ')}`,
      confidence: 'high',
      dataPoints: recentTasks.length,
      recommendation: 'Schedule at least one task per active goal each week',
    };
  }

  // Check for over-concentration
  if (overFocused.length >= 2) {
    const total = overFocused.reduce((sum, o) => sum + o.count, 0);
    const topPct = (overFocused[0].count / total) * 100;

    if (topPct > 60) {
      return {
        id: `goal_concentrate_${Date.now()}`,
        type: 'goal_neglect',
        insight: `${Math.round(topPct)}% of tasks focused on "${overFocused[0].goal.title}", other goals may be neglected`,
        confidence: 'medium',
        dataPoints: recentTasks.length,
        recommendation: 'Consider distributing effort more evenly across goals',
      };
    }
  }

  return null;
}

// ============================================
// EXPORT ANALYSIS SUMMARY
// ============================================

export interface AnalysisSummary {
  correlations: CorrelationResult[];
  predictiveAlerts: PredictiveAlert[];
  patterns: PatternInsight[];
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs_attention';
  keyInsight: string;
}

export function generateAnalysisSummary(
  goals: Goal[],
  tasks: Task[],
  dailyLogs: DailyLog[],
  habits: Habit[],
  habitCompletions: HabitCompletion[],
  weeklySnapshots: WeeklySnapshot[],
  sessions: { date: string; focus_quality: number; duration_minutes: number }[] = []
): AnalysisSummary {
  const correlations = analyzeAllCorrelations(dailyLogs, tasks, goals, sessions);
  const predictiveAlerts = generatePredictiveAlerts(goals, tasks, dailyLogs, weeklySnapshots);
  const patterns = detectAdvancedPatterns(dailyLogs, tasks, habits, habitCompletions, goals);

  // Determine overall health
  const criticalAlerts = predictiveAlerts.filter((a) => a.level === 'critical').length;
  const warningAlerts = predictiveAlerts.filter((a) => a.level === 'warning').length;
  const positiveAlerts = predictiveAlerts.filter((a) => a.level === 'positive').length;

  let overallHealth: 'excellent' | 'good' | 'fair' | 'needs_attention';
  if (criticalAlerts > 0) {
    overallHealth = 'needs_attention';
  } else if (warningAlerts > 2) {
    overallHealth = 'fair';
  } else if (positiveAlerts > warningAlerts) {
    overallHealth = 'excellent';
  } else {
    overallHealth = 'good';
  }

  // Generate key insight
  let keyInsight = '';
  const strongCorrelations = correlations.filter((c) => Math.abs(c.correlation) >= 0.5 && c.recommendation);
  const highConfidencePatterns = patterns.filter((p) => p.confidence === 'high');

  if (criticalAlerts > 0) {
    const critical = predictiveAlerts.find((a) => a.level === 'critical');
    keyInsight = critical?.actionable || 'Address critical alerts immediately';
  } else if (strongCorrelations.length > 0) {
    keyInsight = strongCorrelations[0].recommendation!;
  } else if (highConfidencePatterns.length > 0) {
    keyInsight = highConfidencePatterns[0].recommendation;
  } else {
    keyInsight = 'Keep logging consistently to unlock more insights';
  }

  return {
    correlations,
    predictiveAlerts,
    patterns,
    overallHealth,
    keyInsight,
  };
}
