/**
 * Supabase client and typed CRUD helpers
 * Provides cloud sync for both Vercel (web) and Electron (desktop)
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  Goal,
  Task,
  DailyLog,
  Habit,
  HabitCompletion,
  MissReason,
  CoachMessage,
  CoachDigest,
} from '@/types';

// ============================================
// SUPABASE CLIENT
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Using local storage fallback.');
    return null;
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// ============================================
// DATABASE TYPES (match SQL schema)
// ============================================

interface DbGoal {
  goal_id: string;
  title: string;
  type: string;
  parent_goal_id: string | null;
  target_value: number;
  starting_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  deadline: string;
  status: string;
  priority: number;
  keywords: string[] | null;
  increment_type: string | null;
  created_at: string;
  updated_at: string;
}

interface DbDailyLog {
  date: string;
  day_type: string | null;
  difficulty_tier: string | null;
  energy_level: number | null;
  hours_slept: number | null;
  work_hours: number | null;
  school_hours: number | null;
  free_hours: number | null;
  overall_rating: number | null;
  notes: string | null;
  sick: boolean;
  accomplishments: string[] | null;
  primary_goal_id: string | null;
  secondary_goal_id: string | null;
  created_at: string;
}

interface DbHabit {
  habit_id: string;
  name: string;
  target_minutes: number | null;
  days_active: string[];
  active: boolean;
  sort_order: number;
  created_at: string;
}

interface DbHabitCompletion {
  completion_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  miss_reason: string | null;
  created_at: string;
}

interface DbTask {
  task_id: string;
  goal_id: string | null;
  description: string;
  planned_date: string;
  completed_date: string | null;
  status: string;
  time_estimated: number | null;
  time_actual: number | null;
  difficulty: number | null;
  notes: string | null;
  created_at: string;
}

// ============================================
// TYPE CONVERTERS
// ============================================

function dbToGoal(db: DbGoal): Goal {
  return {
    goal_id: db.goal_id,
    title: db.title,
    type: db.type as Goal['type'],
    parent_goal_id: db.parent_goal_id,
    target_value: db.target_value,
    starting_value: db.starting_value,
    current_value: db.current_value,
    unit: db.unit,
    start_date: db.start_date,
    deadline: db.deadline,
    status: db.status as Goal['status'],
    priority: db.priority,
    keywords: db.keywords ?? undefined,
    increment_type: (db.increment_type as Goal['increment_type']) ?? undefined,
    created_at: db.created_at,
    updated_at: db.updated_at,
  };
}

function goalToDb(goal: Goal): DbGoal {
  return {
    goal_id: goal.goal_id,
    title: goal.title,
    type: goal.type,
    parent_goal_id: goal.parent_goal_id,
    target_value: goal.target_value,
    starting_value: goal.starting_value,
    current_value: goal.current_value,
    unit: goal.unit,
    start_date: goal.start_date,
    deadline: goal.deadline,
    status: goal.status,
    priority: goal.priority,
    keywords: goal.keywords ?? null,
    increment_type: goal.increment_type ?? null,
    created_at: goal.created_at,
    updated_at: goal.updated_at,
  };
}

function dbToDailyLog(db: DbDailyLog): DailyLog {
  return {
    date: db.date,
    day_type: db.day_type as DailyLog['day_type'],
    difficulty_tier: (db.difficulty_tier as DailyLog['difficulty_tier']) ?? undefined,
    energy_level: db.energy_level,
    hours_slept: db.hours_slept,
    work_hours: db.work_hours,
    school_hours: db.school_hours,
    free_hours: db.free_hours,
    overall_rating: db.overall_rating,
    notes: db.notes,
    sick: db.sick,
    accomplishments: db.accomplishments ?? undefined,
    primary_goal_id: db.primary_goal_id ?? undefined,
    secondary_goal_id: db.secondary_goal_id ?? undefined,
    created_at: db.created_at,
  };
}

function dailyLogToDb(log: DailyLog): DbDailyLog {
  return {
    date: log.date,
    day_type: log.day_type,
    difficulty_tier: log.difficulty_tier ?? null,
    energy_level: log.energy_level,
    hours_slept: log.hours_slept,
    work_hours: log.work_hours,
    school_hours: log.school_hours,
    free_hours: log.free_hours,
    overall_rating: log.overall_rating,
    notes: log.notes,
    sick: log.sick,
    accomplishments: log.accomplishments ?? null,
    primary_goal_id: log.primary_goal_id ?? null,
    secondary_goal_id: log.secondary_goal_id ?? null,
    created_at: log.created_at,
  };
}

function dbToHabit(db: DbHabit): Habit {
  return {
    habit_id: db.habit_id,
    name: db.name,
    target_minutes: db.target_minutes,
    days_active: db.days_active,
    active: db.active,
    sort_order: db.sort_order,
    created_at: db.created_at,
  };
}

function habitToDb(habit: Habit): DbHabit {
  return {
    habit_id: habit.habit_id,
    name: habit.name,
    target_minutes: habit.target_minutes,
    days_active: habit.days_active,
    active: habit.active,
    sort_order: habit.sort_order,
    created_at: habit.created_at,
  };
}

function dbToHabitCompletion(db: DbHabitCompletion): HabitCompletion {
  return {
    completion_id: db.completion_id,
    habit_id: db.habit_id,
    date: db.date,
    completed: db.completed,
    miss_reason: (db.miss_reason as MissReason) ?? undefined,
    created_at: db.created_at,
  };
}

function habitCompletionToDb(completion: HabitCompletion): DbHabitCompletion {
  return {
    completion_id: completion.completion_id,
    habit_id: completion.habit_id,
    date: completion.date,
    completed: completion.completed,
    miss_reason: completion.miss_reason ?? null,
    created_at: completion.created_at,
  };
}

function dbToTask(db: DbTask): Task {
  return {
    task_id: db.task_id,
    goal_id: db.goal_id,
    description: db.description,
    planned_date: db.planned_date,
    completed_date: db.completed_date,
    status: db.status as Task['status'],
    time_estimated: db.time_estimated,
    time_actual: db.time_actual,
    difficulty: db.difficulty,
    notes: db.notes,
    created_at: db.created_at,
  };
}

function taskToDb(task: Task): DbTask {
  return {
    task_id: task.task_id,
    goal_id: task.goal_id,
    description: task.description,
    planned_date: task.planned_date,
    completed_date: task.completed_date,
    status: task.status,
    time_estimated: task.time_estimated,
    time_actual: task.time_actual,
    difficulty: task.difficulty,
    notes: task.notes,
    created_at: task.created_at,
  };
}

// ============================================
// GOALS CRUD
// ============================================

export async function fetchGoals(): Promise<Goal[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals:', error);
    throw error;
  }

  return (data as DbGoal[]).map(dbToGoal);
}

export async function upsertGoal(goal: Goal): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('goals')
    .upsert(goalToDb(goal), { onConflict: 'goal_id' });

  if (error) {
    console.error('Error upserting goal:', error);
    throw error;
  }
}

export async function deleteGoal(goalId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('goals')
    .delete()
    .eq('goal_id', goalId);

  if (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
}

// ============================================
// DAILY LOGS CRUD
// ============================================

export async function fetchDailyLogs(): Promise<DailyLog[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('daily_logs')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching daily logs:', error);
    throw error;
  }

  return (data as DbDailyLog[]).map(dbToDailyLog);
}

export async function upsertDailyLog(log: DailyLog): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('daily_logs')
    .upsert(dailyLogToDb(log), { onConflict: 'date' });

  if (error) {
    console.error('Error upserting daily log:', error);
    throw error;
  }
}

// ============================================
// HABITS CRUD
// ============================================

export async function fetchHabits(): Promise<Habit[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('habits')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching habits:', error);
    throw error;
  }

  return (data as DbHabit[]).map(dbToHabit);
}

export async function upsertHabit(habit: Habit): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('habits')
    .upsert(habitToDb(habit), { onConflict: 'habit_id' });

  if (error) {
    console.error('Error upserting habit:', error);
    throw error;
  }
}

export async function deleteHabit(habitId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('habits')
    .delete()
    .eq('habit_id', habitId);

  if (error) {
    console.error('Error deleting habit:', error);
    throw error;
  }
}

// ============================================
// HABIT COMPLETIONS CRUD
// ============================================

export async function fetchHabitCompletions(): Promise<HabitCompletion[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('habit_completions')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching habit completions:', error);
    throw error;
  }

  return (data as DbHabitCompletion[]).map(dbToHabitCompletion);
}

export async function upsertHabitCompletion(completion: HabitCompletion): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('habit_completions')
    .upsert(habitCompletionToDb(completion), { onConflict: 'completion_id' });

  if (error) {
    console.error('Error upserting habit completion:', error);
    throw error;
  }
}

// ============================================
// TASKS CRUD
// ============================================

export async function fetchTasks(): Promise<Task[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('tasks')
    .select('*')
    .order('planned_date', { ascending: false });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return (data as DbTask[]).map(dbToTask);
}

export async function upsertTask(task: Task): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('tasks')
    .upsert(taskToDb(task), { onConflict: 'task_id' });

  if (error) {
    console.error('Error upserting task:', error);
    throw error;
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('tasks')
    .delete()
    .eq('task_id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

type SubscriptionCallback<T> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
}) => void;

export function subscribeToGoals(callback: SubscriptionCallback<Goal>): RealtimeChannel | null {
  const client = getSupabaseClient();
  if (!client) return null;

  return client
    .channel('goals-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'goals' },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new ? dbToGoal(payload.new as DbGoal) : null,
          old: payload.old ? dbToGoal(payload.old as DbGoal) : null,
        });
      }
    )
    .subscribe();
}

export function subscribeToDailyLogs(callback: SubscriptionCallback<DailyLog>): RealtimeChannel | null {
  const client = getSupabaseClient();
  if (!client) return null;

  return client
    .channel('daily-logs-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'daily_logs' },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new ? dbToDailyLog(payload.new as DbDailyLog) : null,
          old: payload.old ? dbToDailyLog(payload.old as DbDailyLog) : null,
        });
      }
    )
    .subscribe();
}

export function subscribeToHabits(callback: SubscriptionCallback<Habit>): RealtimeChannel | null {
  const client = getSupabaseClient();
  if (!client) return null;

  return client
    .channel('habits-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'habits' },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new ? dbToHabit(payload.new as DbHabit) : null,
          old: payload.old ? dbToHabit(payload.old as DbHabit) : null,
        });
      }
    )
    .subscribe();
}

export function subscribeToHabitCompletions(callback: SubscriptionCallback<HabitCompletion>): RealtimeChannel | null {
  const client = getSupabaseClient();
  if (!client) return null;

  return client
    .channel('habit-completions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'habit_completions' },
      (payload) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new ? dbToHabitCompletion(payload.new as DbHabitCompletion) : null,
          old: payload.old ? dbToHabitCompletion(payload.old as DbHabitCompletion) : null,
        });
      }
    )
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel | null): void {
  if (channel) {
    const client = getSupabaseClient();
    if (client) {
      client.removeChannel(channel);
    }
  }
}

// ============================================
// USER SETTINGS (for coach context, etc.)
// ============================================

export interface UserSettingsDb {
  id: string;
  coach_context: string | null;
  theme: string | null;
  preferences: Record<string, unknown> | null;
  updated_at: string;
}

const DEFAULT_SETTINGS_ID = 'default_user';

export async function fetchUserSettings(): Promise<UserSettingsDb | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('user_settings')
    .select('*')
    .eq('id', DEFAULT_SETTINGS_ID)
    .single();

  if (error) {
    // Not found is okay - will create on first save
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching user settings:', error);
    return null;
  }

  return data as UserSettingsDb;
}

export async function upsertUserSettings(settings: Partial<UserSettingsDb>): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('user_settings')
    .upsert({
      id: DEFAULT_SETTINGS_ID,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error upserting user settings:', error);
    throw error;
  }
}

export async function updateCoachContext(context: string): Promise<void> {
  await upsertUserSettings({ coach_context: context });
}

export async function saveUserPreferences(prefs: Record<string, unknown>): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const { error } = await client
    .from('user_settings')
    .upsert({
      id: DEFAULT_SETTINGS_ID,
      preferences: prefs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error saving user preferences:', error);
    throw error;
  }
}

// ============================================
// COACH MESSAGES (relay for Claude CLI)
// ============================================

export async function getCoachMessages(sessionId: string): Promise<CoachMessage[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('coach_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching coach messages:', error);
    return [];
  }

  return (data || []) as CoachMessage[];
}

export async function sendCoachMessage(
  sessionId: string,
  content: string,
  platform: 'mobile' | 'desktop' = 'mobile'
): Promise<CoachMessage | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const message = {
    session_id: sessionId,
    role: 'user',
    content,
    platform,
    status: 'pending',
  };

  const { data, error } = await client
    .from('coach_messages')
    .insert(message)
    .select()
    .single();

  if (error) {
    console.error('Error sending coach message:', error);
    throw error;
  }

  return data as CoachMessage;
}

export function subscribeToCoachMessages(
  sessionId: string,
  callback: (message: CoachMessage) => void
): RealtimeChannel | null {
  const client = getSupabaseClient();
  if (!client) return null;

  return client
    .channel(`coach-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'coach_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        callback(payload.new as CoachMessage);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'coach_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        callback(payload.new as CoachMessage);
      }
    )
    .subscribe();
}

// ============================================
// COACH DIGESTS
// ============================================

export async function getLatestDigest(digestType: 'daily' | 'weekly' = 'daily'): Promise<CoachDigest | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('coach_digests')
    .select('*')
    .eq('digest_type', digestType)
    .order('digest_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching digest:', error);
    return null;
  }

  return data as CoachDigest;
}

export async function getDigestHistory(
  digestType: 'daily' | 'weekly' = 'daily',
  limit: number = 7
): Promise<CoachDigest[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('coach_digests')
    .select('*')
    .eq('digest_type', digestType)
    .order('digest_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching digest history:', error);
    return [];
  }

  return (data || []) as CoachDigest[];
}
