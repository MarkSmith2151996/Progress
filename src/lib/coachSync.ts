/**
 * Coach Sync - Syncs Progress Tracker data to the Claude proxy
 * for Clawdbot/Telegram coach integration
 */

import { debug, debugError, debugSuccess, debugWarn } from './debug';

const PROXY_URL = 'http://localhost:3457';

// ============================================
// HEALTH CHECK
// ============================================

export async function checkProxyHealth(): Promise<boolean> {
  debug('CoachSync', 'Checking proxy health...');

  try {
    const response = await fetch(`${PROXY_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    const healthy = response.ok;
    if (healthy) {
      debugSuccess('CoachSync', 'Proxy is healthy');
    } else {
      debugWarn('CoachSync', 'Proxy returned non-OK status', { status: response.status });
    }
    return healthy;
  } catch (err: any) {
    debugWarn('CoachSync', 'Proxy not reachable', err.message);
    return false;
  }
}

// Alias for backwards compatibility
export async function isProxyAvailable(): Promise<boolean> {
  return checkProxyHealth();
}

// ============================================
// GOAL SYNCING
// ============================================

export async function syncGoal(goal: {
  goal_id: string;
  title: string;
  type: string;
  target_value: number;
  current_value: number;
  status?: string;
  deadline?: string;
}): Promise<boolean> {
  debug('CoachSync', 'Syncing goal to coach', { goalId: goal.goal_id, title: goal.title });

  try {
    const response = await fetch(`${PROXY_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal)
    });

    if (response.ok) {
      debugSuccess('CoachSync', 'Goal synced', goal.title);
      return true;
    }
    debugWarn('CoachSync', 'Goal sync failed', { status: response.status });
    return false;
  } catch (err: any) {
    debugWarn('CoachSync', 'Goal sync error', err.message);
    return false;
  }
}

export async function deleteGoalFromCoach(goalId: string): Promise<boolean> {
  debug('CoachSync', 'Deleting goal from coach', { goalId });

  try {
    const response = await fetch(`${PROXY_URL}/goals/${goalId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      debugSuccess('CoachSync', 'Goal deleted from coach', goalId);
      return true;
    }
    debugWarn('CoachSync', 'Goal delete failed', { status: response.status });
    return false;
  } catch (err: any) {
    debugWarn('CoachSync', 'Goal delete error', err.message);
    return false;
  }
}

// ============================================
// PROGRESS SYNCING
// ============================================

export async function syncProgress(progress: {
  satScore?: number;
  savings?: number;
  workHoursThisMonth?: number;
}): Promise<boolean> {
  debug('CoachSync', 'Syncing progress', progress);

  try {
    const response = await fetch(`${PROXY_URL}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress)
    });

    if (response.ok) {
      debugSuccess('CoachSync', 'Progress synced');
      return true;
    }
    debugWarn('CoachSync', 'Progress sync failed', { status: response.status });
    return false;
  } catch (err: any) {
    debugWarn('CoachSync', 'Progress sync error', err.message);
    return false;
  }
}

// ============================================
// ACTIVITY LOGGING
// ============================================

export async function logActivity(
  type: string,
  description: string,
  value?: number
): Promise<boolean> {
  debug('CoachSync', 'Logging activity', { type, description, value });

  try {
    const response = await fetch(`${PROXY_URL}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        description,
        value,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      debugSuccess('CoachSync', 'Activity logged successfully');
      return true;
    }
    debugWarn('CoachSync', 'Activity log failed', { status: response.status });
    return false;
  } catch (err: any) {
    debugWarn('CoachSync', 'Failed to log activity', err.message);
    return false;
  }
}

// ============================================
// HABIT SYNCING
// ============================================

export async function syncHabit(habit: {
  habit_id: string;
  name: string;
  active: boolean;
}): Promise<boolean> {
  debug('CoachSync', 'Syncing habit', { habitId: habit.habit_id, name: habit.name });

  try {
    const response = await fetch(`${PROXY_URL}/habits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habit)
    });

    if (response.ok) {
      debugSuccess('CoachSync', 'Habit synced', habit.name);
      return true;
    }
    return false;
  } catch (err: any) {
    debugWarn('CoachSync', 'Habit sync error', err.message);
    return false;
  }
}

export async function syncHabitComplete(habitName: string, completed: boolean): Promise<void> {
  debug('CoachSync', 'syncHabitComplete called', { habitName, completed });

  await logActivity(
    'habit',
    completed ? `Completed habit: ${habitName}` : `Unchecked habit: ${habitName}`
  );
}

// ============================================
// CONTEXT SYNCING
// ============================================

interface CoachContext {
  personality?: string;
  goals?: Array<{
    name: string;
    type: string;
    target: number;
    current: number;
    deadline?: string;
  }>;
  currentProgress?: {
    satScore?: number;
    savings?: number;
    workHoursThisMonth?: number;
    satPracticeThisWeek?: number;
  };
  recentActivity?: Array<{
    type: string;
    description: string;
    timestamp: string;
    value?: number;
  }>;
}

export async function syncToProxy(context: Partial<CoachContext>): Promise<boolean> {
  debug('CoachSync', 'syncToProxy called', context);

  try {
    const response = await fetch(`${PROXY_URL}/context`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });

    if (!response.ok) {
      debugWarn('CoachSync', 'Failed to sync context', { status: response.status });
      return false;
    }

    debugSuccess('CoachSync', 'Context synced successfully');
    return true;
  } catch (error: any) {
    debugWarn('CoachSync', 'Proxy not available', error.message);
    return false;
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export async function syncSATScore(score: number): Promise<void> {
  debug('CoachSync', 'syncSATScore called', { score });

  await Promise.all([
    syncProgress({ satScore: score }),
    logActivity('sat_update', `SAT score updated to ${score}`, score)
  ]);
}

export async function syncSavings(amount: number, isAddition = false): Promise<void> {
  debug('CoachSync', 'syncSavings called', { amount, isAddition });

  const description = isAddition
    ? `Added $${amount} to savings`
    : `Savings updated to $${amount}`;

  await Promise.all([
    syncProgress({ savings: amount }),
    logActivity('savings_update', description, amount)
  ]);
}

export async function syncWorkHours(hours: number): Promise<void> {
  debug('CoachSync', 'syncWorkHours called', { hours });

  await Promise.all([
    syncProgress({ workHoursThisMonth: hours }),
    logActivity('work_hours', `Logged ${hours} work hours this month`, hours)
  ]);
}

export async function syncGoalUpdate(
  goalName: string,
  currentValue: number,
  targetValue: number
): Promise<void> {
  debug('CoachSync', 'syncGoalUpdate called', { goalName, currentValue, targetValue });

  const progress = Math.round((currentValue / targetValue) * 100);
  await logActivity(
    'goal_update',
    `${goalName}: ${currentValue}/${targetValue} (${progress}%)`,
    currentValue
  );
}

export async function fullContextSync(data: {
  goals?: Array<{ title: string; type: string; target_value: number; current_value: number; deadline?: string }>;
  satScore?: number;
  savings?: number;
  workHours?: number;
}): Promise<void> {
  debug('CoachSync', 'fullContextSync called', data);

  const context: Partial<CoachContext> = {
    currentProgress: {}
  };

  if (data.goals) {
    context.goals = data.goals.map(g => ({
      name: g.title,
      type: g.type,
      target: g.target_value,
      current: g.current_value,
      deadline: g.deadline
    }));
  }

  if (data.satScore !== undefined) {
    context.currentProgress!.satScore = data.satScore;
  }
  if (data.savings !== undefined) {
    context.currentProgress!.savings = data.savings;
  }
  if (data.workHours !== undefined) {
    context.currentProgress!.workHoursThisMonth = data.workHours;
  }

  await syncToProxy(context);
}

// Debounced sync for frequent updates
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 2000;

export function debouncedSync(context: Partial<CoachContext>): void {
  debug('CoachSync', 'debouncedSync queued', context);

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    syncToProxy(context);
    syncTimeout = null;
  }, SYNC_DEBOUNCE_MS);
}
