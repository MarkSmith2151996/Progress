/**
 * Local JSON file storage - fallback when Google Sheets is not configured
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Goal,
  Task,
  DailyLog,
  Habit,
  HabitCompletion,
  Session,
  WeeklySnapshot,
  MonthlyReview,
} from '@/types';

// Store data in user's home directory
const DATA_DIR = process.env.PROGRESS_TRACKER_DATA_DIR ||
  path.join(process.env.USERPROFILE || process.env.HOME || '.', '.progress-tracker-data');

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(collection: string): string {
  ensureDataDir();
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection<T>(collection: string): T[] {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeCollection<T>(collection: string, data: T[]): void {
  const filePath = getFilePath(collection);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function updateOrAppendItem<T extends Record<string, unknown>>(
  collection: string,
  keyField: string,
  item: T
): void {
  const items = readCollection<T>(collection);
  const index = items.findIndex((i) => i[keyField] === item[keyField]);

  if (index >= 0) {
    items[index] = item;
  } else {
    items.push(item);
  }

  writeCollection(collection, items);
}

// ============================================
// TYPED GETTERS
// ============================================

export async function getGoals(): Promise<Goal[]> {
  return readCollection<Goal>('goals');
}

export async function getTasks(): Promise<Task[]> {
  return readCollection<Task>('tasks');
}

export async function getDailyLogs(): Promise<DailyLog[]> {
  return readCollection<DailyLog>('daily-logs');
}

export async function getHabits(): Promise<Habit[]> {
  return readCollection<Habit>('habits');
}

export async function getHabitCompletions(): Promise<HabitCompletion[]> {
  return readCollection<HabitCompletion>('habit-completions');
}

export async function getSessions(): Promise<Session[]> {
  return readCollection<Session>('sessions');
}

export async function getWeeklySnapshots(): Promise<WeeklySnapshot[]> {
  return readCollection<WeeklySnapshot>('weekly-snapshots');
}

export async function getMonthlyReviews(): Promise<MonthlyReview[]> {
  return readCollection<MonthlyReview>('monthly-reviews');
}

export async function getSettings(): Promise<Record<string, string>> {
  const items = readCollection<{ setting_key: string; setting_value: string }>('settings');
  const settings: Record<string, string> = {};
  items.forEach((row) => {
    settings[row.setting_key] = row.setting_value;
  });
  return settings;
}

// ============================================
// TYPED SETTERS
// ============================================

export async function saveGoal(goal: Goal): Promise<void> {
  updateOrAppendItem('goals', 'goal_id', goal as unknown as Record<string, unknown>);
}

export async function saveTask(task: Task): Promise<void> {
  updateOrAppendItem('tasks', 'task_id', task as unknown as Record<string, unknown>);
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  updateOrAppendItem('daily-logs', 'date', log as unknown as Record<string, unknown>);
}

export async function saveHabit(habit: Habit): Promise<void> {
  updateOrAppendItem('habits', 'habit_id', habit as unknown as Record<string, unknown>);
}

export async function saveHabitCompletion(completion: HabitCompletion): Promise<void> {
  updateOrAppendItem('habit-completions', 'completion_id', completion as unknown as Record<string, unknown>);
}

export async function saveSession(session: Session): Promise<void> {
  updateOrAppendItem('sessions', 'session_id', session as unknown as Record<string, unknown>);
}

export async function saveWeeklySnapshot(snapshot: WeeklySnapshot): Promise<void> {
  updateOrAppendItem('weekly-snapshots', 'week_id', snapshot as unknown as Record<string, unknown>);
}

export async function saveMonthlyReview(review: MonthlyReview): Promise<void> {
  updateOrAppendItem('monthly-reviews', 'month_id', review as unknown as Record<string, unknown>);
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const items = readCollection<{ setting_key: string; setting_value: string; updated_at: string }>('settings');
  const index = items.findIndex((row) => row.setting_key === key);

  const item = {
    setting_key: key,
    setting_value: value,
    updated_at: new Date().toISOString(),
  };

  if (index >= 0) {
    items[index] = item;
  } else {
    items.push(item);
  }

  writeCollection('settings', items);
}

// ============================================
// DELETE
// ============================================

export async function deleteGoal(goalId: string): Promise<void> {
  const items = readCollection<Goal>('goals');
  writeCollection('goals', items.filter((g) => g.goal_id !== goalId));
}

export async function deleteTask(taskId: string): Promise<void> {
  const items = readCollection<Task>('tasks');
  writeCollection('tasks', items.filter((t) => t.task_id !== taskId));
}

export async function deleteHabit(habitId: string): Promise<void> {
  const items = readCollection<Habit>('habits');
  writeCollection('habits', items.filter((h) => h.habit_id !== habitId));
}

// ============================================
// QUERY HELPERS
// ============================================

export async function getGoalById(goalId: string): Promise<Goal | null> {
  const goals = await getGoals();
  return goals.find((g) => g.goal_id === goalId) || null;
}

export async function getTasksByDate(date: string): Promise<Task[]> {
  const tasks = await getTasks();
  return tasks.filter((t) => t.planned_date === date);
}

export async function getDailyLogByDate(date: string): Promise<DailyLog | null> {
  const logs = await getDailyLogs();
  return logs.find((l) => l.date === date) || null;
}

export async function getActiveGoals(): Promise<Goal[]> {
  const goals = await getGoals();
  return goals.filter((g) => g.status === 'active');
}

export async function getActiveHabits(): Promise<Habit[]> {
  const habits = await getHabits();
  return habits.filter((h) => h.active);
}

// ============================================
// BATCH OPERATIONS
// ============================================

export async function getAllData(): Promise<{
  goals: Goal[];
  tasks: Task[];
  dailyLogs: DailyLog[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  sessions: Session[];
  weeklySnapshots: WeeklySnapshot[];
  settings: Record<string, string>;
}> {
  const [
    goals,
    tasks,
    dailyLogs,
    habits,
    habitCompletions,
    sessions,
    weeklySnapshots,
    settings,
  ] = await Promise.all([
    getGoals(),
    getTasks(),
    getDailyLogs(),
    getHabits(),
    getHabitCompletions(),
    getSessions(),
    getWeeklySnapshots(),
    getSettings(),
  ]);

  return {
    goals,
    tasks,
    dailyLogs,
    habits,
    habitCompletions,
    sessions,
    weeklySnapshots,
    settings,
  };
}
