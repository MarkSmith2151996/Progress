/**
 * Browser localStorage for Vercel deployment
 * This stores data in the user's browser when server-side storage isn't available
 */

import {
  Goal,
  Task,
  DailyLog,
  Habit,
  HabitCompletion,
} from '@/types';

const STORAGE_PREFIX = 'progress95_';

function getStorageKey(collection: string): string {
  return `${STORAGE_PREFIX}${collection}`;
}

function readCollection<T>(collection: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(getStorageKey(collection));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function writeCollection<T>(collection: string, data: T[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(getStorageKey(collection), JSON.stringify(data));
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
  }
}

// ============================================
// GOALS
// ============================================

export function getGoals(): Goal[] {
  return readCollection<Goal>('goals');
}

export function saveGoal(goal: Goal): void {
  const goals = getGoals();
  const index = goals.findIndex((g) => g.goal_id === goal.goal_id);

  if (index >= 0) {
    goals[index] = goal;
  } else {
    goals.push(goal);
  }

  writeCollection('goals', goals);
}

export function deleteGoal(goalId: string): void {
  const goals = getGoals();
  writeCollection('goals', goals.filter((g) => g.goal_id !== goalId));
}

// ============================================
// HABITS
// ============================================

export function getHabits(): Habit[] {
  return readCollection<Habit>('habits');
}

export function saveHabit(habit: Habit): void {
  const habits = getHabits();
  const index = habits.findIndex((h) => h.habit_id === habit.habit_id);

  if (index >= 0) {
    habits[index] = habit;
  } else {
    habits.push(habit);
  }

  writeCollection('habits', habits);
}

export function deleteHabit(habitId: string): void {
  const habits = getHabits();
  writeCollection('habits', habits.filter((h) => h.habit_id !== habitId));
}

// ============================================
// HABIT COMPLETIONS
// ============================================

export function getHabitCompletions(): HabitCompletion[] {
  return readCollection<HabitCompletion>('habitCompletions');
}

export function saveHabitCompletion(completion: HabitCompletion): void {
  const completions = getHabitCompletions();
  const index = completions.findIndex(
    (c) => c.habit_id === completion.habit_id && c.date === completion.date
  );

  if (index >= 0) {
    completions[index] = completion;
  } else {
    completions.push(completion);
  }

  writeCollection('habitCompletions', completions);
}

// ============================================
// DAILY LOGS
// ============================================

export function getDailyLogs(): DailyLog[] {
  return readCollection<DailyLog>('dailyLogs');
}

export function saveDailyLog(log: DailyLog): void {
  const logs = getDailyLogs();
  const index = logs.findIndex((l) => l.date === log.date);

  if (index >= 0) {
    logs[index] = log;
  } else {
    logs.push(log);
  }

  writeCollection('dailyLogs', logs);
}

// ============================================
// TASKS
// ============================================

export function getTasks(): Task[] {
  return readCollection<Task>('tasks');
}

export function saveTask(task: Task): void {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.task_id === task.task_id);

  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }

  writeCollection('tasks', tasks);
}

// ============================================
// CHECK IF VERCEL WITHOUT BACKEND
// ============================================

export function isVercelWithoutBackend(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if we're on Vercel by looking at the hostname
  const hostname = window.location.hostname;
  return hostname.includes('vercel.app') || hostname.includes('.vercel.app');
}
