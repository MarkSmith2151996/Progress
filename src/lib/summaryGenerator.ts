import Anthropic from '@anthropic-ai/sdk';
import {
  Goal,
  Task,
  DailyLog,
  Habit,
  HabitCompletion,
  WeeklySnapshot,
  MonthlyReview,
} from '@/types';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  differenceInDays,
  isWithinInterval,
} from 'date-fns';
import { calculateWeeklyScore, calculateGoalProgress, calculateLoggingStreak } from './metrics';
import { generateAnalysisSummary } from './analytics';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// ============================================
// TYPES
// ============================================

export interface WeeklySummaryResult {
  weekId: string;
  score: number;
  summary: string;
  lessons: string;
  wins: string[];
  improvements: string[];
  nextWeekFocus: string[];
  tasksPlanned: number;
  tasksCompleted: number;
  monthlyGoalProgress: Record<string, number>;
  bonusGoalsHit: number;
  bonusGoalsTotal: number;
  consistencyStreak: number;
}

export interface MonthlySummaryResult {
  monthId: string;
  overallScore: number;
  summary: string;
  goalsSet: string[];
  goalsCompleted: string[];
  biggestWin: string;
  biggestMiss: string;
  analysis: string;
  nextMonthRecommendations: string[];
  weeklyScores: number[];
  trends: string[];
}

// ============================================
// WEEKLY SUMMARY GENERATION
// ============================================

export async function generateWeeklySummary(
  weekStart: Date,
  goals: Goal[],
  tasks: Task[],
  dailyLogs: DailyLog[],
  habits: Habit[],
  habitCompletions: HabitCompletion[]
): Promise<WeeklySummaryResult> {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const weekId = `${format(weekStart, 'yyyy')}-W${format(weekStart, 'ww')}`;

  // Filter data to this week
  const weekTasks = tasks.filter((t) => {
    const date = parseISO(t.planned_date);
    return isWithinInterval(date, { start: weekStart, end: weekEnd });
  });

  const weekLogs = dailyLogs.filter((l) => {
    const date = parseISO(l.date);
    return isWithinInterval(date, { start: weekStart, end: weekEnd });
  });

  const weekHabitCompletions = habitCompletions.filter((c) => {
    const date = parseISO(c.date);
    return isWithinInterval(date, { start: weekStart, end: weekEnd });
  });

  // Calculate metrics
  const tasksPlanned = weekTasks.length;
  const tasksCompleted = weekTasks.filter((t) => t.status === 'completed').length;
  const completionRate = tasksPlanned > 0 ? tasksCompleted / tasksPlanned : 0;

  // Monthly goal progress this week
  const monthlyGoals = goals.filter((g) => g.type === 'monthly' && g.status === 'active');
  const monthlyGoalProgress: Record<string, number> = {};
  monthlyGoals.forEach((g) => {
    monthlyGoalProgress[g.goal_id] = calculateGoalProgress(g);
  });

  // Bonus goals
  const bonusGoals = goals.filter((g) => {
    if (g.type !== 'bonus') return false;
    const deadline = parseISO(g.deadline);
    return isWithinInterval(deadline, { start: weekStart, end: weekEnd });
  });
  const bonusGoalsHit = bonusGoals.filter((g) => g.status === 'completed').length;
  const bonusGoalsTotal = bonusGoals.length;

  // Consistency
  const consistencyStreak = calculateLoggingStreak(dailyLogs);

  // Calculate score
  const score = calculateWeeklyScore(tasks, goals, habitCompletions, habits, dailyLogs);

  // Build context for Claude
  const context = buildWeeklyContext(
    weekId,
    weekTasks,
    weekLogs,
    monthlyGoals,
    monthlyGoalProgress,
    bonusGoalsHit,
    bonusGoalsTotal,
    habits,
    weekHabitCompletions,
    score
  );

  // Generate summary with Claude
  const claudeResponse = await generateClaudeWeeklySummary(context);

  return {
    weekId,
    score,
    summary: claudeResponse.summary,
    lessons: claudeResponse.lessons,
    wins: claudeResponse.wins,
    improvements: claudeResponse.improvements,
    nextWeekFocus: claudeResponse.nextWeekFocus,
    tasksPlanned,
    tasksCompleted,
    monthlyGoalProgress,
    bonusGoalsHit,
    bonusGoalsTotal,
    consistencyStreak,
  };
}

function buildWeeklyContext(
  weekId: string,
  tasks: Task[],
  logs: DailyLog[],
  monthlyGoals: Goal[],
  goalProgress: Record<string, number>,
  bonusHit: number,
  bonusTotal: number,
  habits: Habit[],
  habitCompletions: HabitCompletion[],
  score: number
): string {
  const tasksCompleted = tasks.filter((t) => t.status === 'completed');
  const tasksSkipped = tasks.filter((t) => t.status === 'skipped');

  const avgEnergy = logs
    .filter((l) => l.energy_level !== null)
    .reduce((sum, l) => sum + (l.energy_level || 0), 0) / Math.max(logs.length, 1);

  const avgSleep = logs
    .filter((l) => l.hours_slept !== null)
    .reduce((sum, l) => sum + (l.hours_slept || 0), 0) / Math.max(logs.length, 1);

  const habitCompletionRate = habitCompletions.length > 0
    ? habitCompletions.filter((c) => c.completed).length / habitCompletions.length
    : 0;

  return `WEEK: ${weekId}
SCORE: ${score}/100

TASKS:
- Planned: ${tasks.length}
- Completed: ${tasksCompleted.length} (${Math.round((tasksCompleted.length / Math.max(tasks.length, 1)) * 100)}%)
- Skipped: ${tasksSkipped.length}
- Key completions: ${tasksCompleted.slice(0, 5).map((t) => t.description).join(', ') || 'none'}

MONTHLY GOALS PROGRESS:
${monthlyGoals.map((g) => `- ${g.title}: ${Math.round(goalProgress[g.goal_id] || 0)}%`).join('\n')}

BONUS GOALS: ${bonusHit}/${bonusTotal} completed

DAILY METRICS (averages):
- Days logged: ${logs.length}/7
- Energy: ${avgEnergy.toFixed(1)}/5
- Sleep: ${avgSleep.toFixed(1)} hours
- Habit completion: ${Math.round(habitCompletionRate * 100)}%

NOTES FROM THE WEEK:
${logs.filter((l) => l.notes).map((l) => `[${l.date}] ${l.notes}`).join('\n') || 'No notes'}`;
}

async function generateClaudeWeeklySummary(context: string): Promise<{
  summary: string;
  lessons: string;
  wins: string[];
  improvements: string[];
  nextWeekFocus: string[];
}> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You generate weekly review summaries for a personal progress tracking system.
Be specific, reference actual data, and provide actionable insights.

Respond with JSON only:
{
  "summary": "3-4 sentence overview of the week",
  "lessons": "1-2 key lessons learned",
  "wins": ["win 1", "win 2", "win 3"],
  "improvements": ["improvement 1", "improvement 2"],
  "nextWeekFocus": ["focus 1", "focus 2", "focus 3"]
}`,
      messages: [{
        role: 'user',
        content: `Generate a weekly summary for this data:\n\n${context}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

    try {
      return JSON.parse(text);
    } catch {
      return {
        summary: 'Unable to generate detailed summary',
        lessons: '',
        wins: [],
        improvements: [],
        nextWeekFocus: [],
      };
    }
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      summary: 'Summary generation failed',
      lessons: '',
      wins: [],
      improvements: [],
      nextWeekFocus: [],
    };
  }
}

// ============================================
// MONTHLY SUMMARY GENERATION
// ============================================

export async function generateMonthlySummary(
  month: Date,
  goals: Goal[],
  tasks: Task[],
  dailyLogs: DailyLog[],
  habits: Habit[],
  habitCompletions: HabitCompletion[],
  weeklySnapshots: WeeklySnapshot[]
): Promise<MonthlySummaryResult> {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const monthId = format(month, 'yyyy-MM');

  // Filter data to this month
  const monthTasks = tasks.filter((t) => {
    const date = parseISO(t.planned_date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  });

  const monthLogs = dailyLogs.filter((l) => {
    const date = parseISO(l.date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  });

  const monthSnapshots = weeklySnapshots.filter((s) => s.week_id.startsWith(format(month, 'yyyy')));
  const weeklyScores = monthSnapshots.map((s) => s.score);

  // Monthly goals
  const monthlyGoals = goals.filter((g) => {
    if (g.type !== 'monthly') return false;
    return g.start_date.startsWith(monthId) || g.deadline.startsWith(monthId);
  });

  const goalsSet = monthlyGoals.map((g) => g.title);
  const goalsCompleted = monthlyGoals.filter((g) => g.status === 'completed').map((g) => g.title);

  // Calculate overall score
  const overallScore = weeklyScores.length > 0
    ? Math.round(weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length)
    : 0;

  // Build context for Claude
  const context = buildMonthlyContext(
    monthId,
    monthTasks,
    monthLogs,
    monthlyGoals,
    goalsCompleted,
    weeklyScores,
    monthSnapshots
  );

  // Generate summary with Claude
  const claudeResponse = await generateClaudeMonthlySummary(context);

  // Identify trends
  const trends: string[] = [];
  if (weeklyScores.length >= 2) {
    const trend = weeklyScores[weeklyScores.length - 1] - weeklyScores[0];
    if (trend > 10) trends.push(`Score improved by ${trend} points over the month`);
    if (trend < -10) trends.push(`Score declined by ${Math.abs(trend)} points over the month`);
  }

  return {
    monthId,
    overallScore,
    summary: claudeResponse.summary,
    goalsSet,
    goalsCompleted,
    biggestWin: claudeResponse.biggestWin,
    biggestMiss: claudeResponse.biggestMiss,
    analysis: claudeResponse.analysis,
    nextMonthRecommendations: claudeResponse.recommendations,
    weeklyScores,
    trends,
  };
}

function buildMonthlyContext(
  monthId: string,
  tasks: Task[],
  logs: DailyLog[],
  goals: Goal[],
  completedGoals: string[],
  weeklyScores: number[],
  snapshots: WeeklySnapshot[]
): string {
  const tasksCompleted = tasks.filter((t) => t.status === 'completed');

  return `MONTH: ${monthId}

GOALS:
- Set: ${goals.length}
- Completed: ${completedGoals.length}
${goals.map((g) => `- ${g.title}: ${calculateGoalProgress(g).toFixed(0)}% (${g.status})`).join('\n')}

WEEKLY SCORES: ${weeklyScores.join(', ') || 'N/A'}
AVERAGE SCORE: ${weeklyScores.length > 0 ? Math.round(weeklyScores.reduce((a, b) => a + b, 0) / weeklyScores.length) : 'N/A'}

TASKS:
- Total planned: ${tasks.length}
- Completed: ${tasksCompleted.length} (${Math.round((tasksCompleted.length / Math.max(tasks.length, 1)) * 100)}%)

DAYS LOGGED: ${logs.length}

WEEKLY SUMMARIES:
${snapshots.map((s) => `${s.week_id}: Score ${s.score} - ${s.coach_summary || 'No summary'}`).join('\n')}`;
}

async function generateClaudeMonthlySummary(context: string): Promise<{
  summary: string;
  biggestWin: string;
  biggestMiss: string;
  analysis: string;
  recommendations: string[];
}> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: `You generate monthly review summaries for a personal progress tracking system.
Provide thoughtful analysis of the month's progress, identify the biggest achievements and setbacks,
and give actionable recommendations for the next month.

Respond with JSON only:
{
  "summary": "4-5 sentence overview of the month",
  "biggestWin": "the single biggest achievement",
  "biggestMiss": "the biggest miss or area that fell short",
  "analysis": "2-3 sentence deeper analysis of patterns",
  "recommendations": ["rec 1", "rec 2", "rec 3"]
}`,
      messages: [{
        role: 'user',
        content: `Generate a monthly review for:\n\n${context}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

    try {
      return JSON.parse(text);
    } catch {
      return {
        summary: 'Unable to generate detailed summary',
        biggestWin: '',
        biggestMiss: '',
        analysis: '',
        recommendations: [],
      };
    }
  } catch (error) {
    console.error('Claude API error:', error);
    return {
      summary: 'Summary generation failed',
      biggestWin: '',
      biggestMiss: '',
      analysis: '',
      recommendations: [],
    };
  }
}

// ============================================
// SAVE SNAPSHOTS
// ============================================

export function weeklyResultToSnapshot(result: WeeklySummaryResult, startDate: string, endDate: string): WeeklySnapshot {
  return {
    week_id: result.weekId,
    start_date: startDate,
    end_date: endDate,
    score: result.score,
    tasks_planned: result.tasksPlanned,
    tasks_completed: result.tasksCompleted,
    monthly_goal_progress: result.monthlyGoalProgress,
    bonus_goals_hit: result.bonusGoalsHit,
    bonus_goals_total: result.bonusGoalsTotal,
    consistency_streak: result.consistencyStreak,
    coach_summary: result.summary,
    lessons: result.lessons,
    created_at: new Date().toISOString(),
  };
}

export function monthlyResultToReview(result: MonthlySummaryResult, goals: Goal[]): MonthlyReview {
  return {
    month_id: result.monthId,
    goals_set: goals.filter((g) => result.goalsSet.includes(g.title)),
    goals_completed: goals.filter((g) => result.goalsCompleted.includes(g.title)),
    overall_score: result.overallScore,
    biggest_win: result.biggestWin,
    biggest_miss: result.biggestMiss,
    coach_analysis: result.analysis,
    next_month_recommendations: result.nextMonthRecommendations.join('\n'),
    created_at: new Date().toISOString(),
  };
}
