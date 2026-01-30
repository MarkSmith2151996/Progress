/**
 * Storage abstraction layer
 * Uses Google Sheets if configured, otherwise falls back to local JSON storage
 */

import * as sheets from './sheets';
import * as local from './localStorage';

// Check if Google Sheets is configured
const useGoogleSheets = !!(
  process.env.GOOGLE_SPREADSHEET_ID &&
  process.env.GOOGLE_CREDENTIALS
);

// Log which storage backend is being used (once on first import)
if (typeof window === 'undefined') {
  console.log(`[Storage] Using ${useGoogleSheets ? 'Google Sheets' : 'local JSON files'}`);
}

// Export the appropriate implementation
const storage = useGoogleSheets ? sheets : local;

export const {
  getGoals,
  getTasks,
  getDailyLogs,
  getHabits,
  getHabitCompletions,
  getSessions,
  getWeeklySnapshots,
  getMonthlyReviews,
  getSettings,
  saveGoal,
  saveTask,
  saveDailyLog,
  saveHabit,
  saveHabitCompletion,
  saveSession,
  saveWeeklySnapshot,
  saveMonthlyReview,
  saveSetting,
  getGoalById,
  getTasksByDate,
  getDailyLogByDate,
  getActiveGoals,
  getActiveHabits,
  getAllData,
} = storage;

// Re-export delete functions (only in local storage for now)
export const deleteGoal = useGoogleSheets
  ? async (goalId: string) => { await sheets.deleteRow('Goals', 'goal_id', goalId); }
  : local.deleteGoal;

export const deleteTask = useGoogleSheets
  ? async (taskId: string) => { await sheets.deleteRow('Tasks', 'task_id', taskId); }
  : local.deleteTask;

export const deleteHabit = useGoogleSheets
  ? async (habitId: string) => { await sheets.deleteRow('Habits', 'habit_id', habitId); }
  : local.deleteHabit;

// Helper to check storage type
export function getStorageType(): 'sheets' | 'local' {
  return useGoogleSheets ? 'sheets' : 'local';
}
