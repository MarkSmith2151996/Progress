import { google, sheets_v4 } from 'googleapis';
import {
  Goal,
  Task,
  DailyLog,
  Habit,
  HabitCompletion,
  Session,
  ExternalFactor,
  WeeklySnapshot,
  MonthlyReview,
  CustomField,
  CustomFieldValue,
  FieldProposal,
  UserSettings,
} from '@/types';

// ============================================
// CONFIGURATION
// ============================================

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

let sheetsInstance: sheets_v4.Sheets | null = null;

async function getSheets(): Promise<sheets_v4.Sheets> {
  if (sheetsInstance) return sheetsInstance;

  const credentials = process.env.GOOGLE_CREDENTIALS;
  if (!credentials) {
    throw new Error('GOOGLE_CREDENTIALS environment variable not set');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsInstance = google.sheets({ version: 'v4', auth });
  return sheetsInstance;
}

// ============================================
// GENERIC OPERATIONS
// ============================================

export async function getRows<T>(tabName: string): Promise<T[]> {
  const sheets = await getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:Z`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return [];

  const headers = rows[0] as string[];
  return rows.slice(1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      const value = row[i];
      // Parse JSON fields
      if (value && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          obj[header] = JSON.parse(value);
        } catch {
          obj[header] = value || null;
        }
      } else if (value === 'true' || value === 'false') {
        obj[header] = value === 'true';
      } else if (value && !isNaN(Number(value)) && value !== '') {
        obj[header] = Number(value);
      } else {
        obj[header] = value || null;
      }
    });
    return obj as T;
  });
}

export async function getHeaders(tabName: string): Promise<string[]> {
  const sheets = await getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!1:1`,
  });

  return (response.data.values?.[0] as string[]) || [];
}

export async function appendRow(
  tabName: string,
  data: Record<string, unknown>
): Promise<void> {
  const sheets = await getSheets();
  const headers = await getHeaders(tabName);

  const row = headers.map((h) => {
    const value = data[h];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

export async function updateRow(
  tabName: string,
  rowIndex: number,
  data: Record<string, unknown>
): Promise<void> {
  const sheets = await getSheets();
  const headers = await getHeaders(tabName);

  const row = headers.map((h) => {
    const value = data[h];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tabName}!A${rowIndex + 2}:Z${rowIndex + 2}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
}

export async function findRowIndex(
  tabName: string,
  keyField: string,
  keyValue: string
): Promise<number> {
  const rows = await getRows<Record<string, unknown>>(tabName);
  return rows.findIndex((row) => row[keyField] === keyValue);
}

export async function updateOrAppend(
  tabName: string,
  keyField: string,
  data: Record<string, unknown>
): Promise<void> {
  const keyValue = String(data[keyField]);
  const rowIndex = await findRowIndex(tabName, keyField, keyValue);

  if (rowIndex >= 0) {
    await updateRow(tabName, rowIndex, data);
  } else {
    await appendRow(tabName, data);
  }
}

export async function deleteRow(
  tabName: string,
  keyField: string,
  keyValue: string
): Promise<void> {
  const sheets = await getSheets();
  const rows = await getRows<Record<string, unknown>>(tabName);
  const rowIndex = rows.findIndex((row) => row[keyField] === keyValue);

  if (rowIndex < 0) return;

  // Get sheet ID
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === tabName
  );

  if (!sheet?.properties?.sheetId) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex + 1, // +1 for header
              endIndex: rowIndex + 2,
            },
          },
        },
      ],
    },
  });
}

// ============================================
// TYPED GETTERS
// ============================================

export async function getGoals(): Promise<Goal[]> {
  return getRows<Goal>('Goals');
}

export async function getTasks(): Promise<Task[]> {
  return getRows<Task>('Tasks');
}

export async function getDailyLogs(): Promise<DailyLog[]> {
  return getRows<DailyLog>('DailyLogs');
}

export async function getHabits(): Promise<Habit[]> {
  return getRows<Habit>('Habits');
}

export async function getHabitCompletions(): Promise<HabitCompletion[]> {
  return getRows<HabitCompletion>('HabitCompletions');
}

export async function getSessions(): Promise<Session[]> {
  return getRows<Session>('Sessions');
}

export async function getExternalFactors(): Promise<ExternalFactor[]> {
  return getRows<ExternalFactor>('ExternalFactors');
}

export async function getWeeklySnapshots(): Promise<WeeklySnapshot[]> {
  return getRows<WeeklySnapshot>('WeeklySnapshots');
}

export async function getMonthlyReviews(): Promise<MonthlyReview[]> {
  return getRows<MonthlyReview>('MonthlyReviews');
}

export async function getCustomFields(): Promise<CustomField[]> {
  return getRows<CustomField>('CustomFields');
}

export async function getCustomFieldValues(): Promise<CustomFieldValue[]> {
  return getRows<CustomFieldValue>('CustomFieldValues');
}

export async function getFieldProposals(): Promise<FieldProposal[]> {
  return getRows<FieldProposal>('FieldProposals');
}

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await getRows<{ setting_key: string; setting_value: string }>('Settings');
  const settings: Record<string, string> = {};
  rows.forEach((row) => {
    settings[row.setting_key] = row.setting_value;
  });
  return settings;
}

// ============================================
// TYPED SETTERS
// ============================================

export async function saveGoal(goal: Goal): Promise<void> {
  await updateOrAppend('Goals', 'goal_id', goal as unknown as Record<string, unknown>);
}

export async function saveTask(task: Task): Promise<void> {
  await updateOrAppend('Tasks', 'task_id', task as unknown as Record<string, unknown>);
}

export async function saveDailyLog(log: DailyLog): Promise<void> {
  await updateOrAppend('DailyLogs', 'date', log as unknown as Record<string, unknown>);
}

export async function saveHabit(habit: Habit): Promise<void> {
  await updateOrAppend('Habits', 'habit_id', habit as unknown as Record<string, unknown>);
}

export async function saveHabitCompletion(completion: HabitCompletion): Promise<void> {
  await updateOrAppend('HabitCompletions', 'completion_id', completion as unknown as Record<string, unknown>);
}

export async function saveSession(session: Session): Promise<void> {
  await updateOrAppend('Sessions', 'session_id', session as unknown as Record<string, unknown>);
}

export async function saveWeeklySnapshot(snapshot: WeeklySnapshot): Promise<void> {
  await updateOrAppend('WeeklySnapshots', 'week_id', snapshot as unknown as Record<string, unknown>);
}

export async function saveMonthlyReview(review: MonthlyReview): Promise<void> {
  await updateOrAppend('MonthlyReviews', 'month_id', review as unknown as Record<string, unknown>);
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const rows = await getRows<{ setting_key: string; setting_value: string }>('Settings');
  const rowIndex = rows.findIndex((row) => row.setting_key === key);

  if (rowIndex >= 0) {
    await updateRow('Settings', rowIndex, {
      setting_key: key,
      setting_value: value,
      updated_at: new Date().toISOString(),
    });
  } else {
    await appendRow('Settings', {
      setting_key: key,
      setting_value: value,
      updated_at: new Date().toISOString(),
    });
  }
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

export async function getTasksByGoal(goalId: string): Promise<Task[]> {
  const tasks = await getTasks();
  return tasks.filter((t) => t.goal_id === goalId);
}

export async function getDailyLogByDate(date: string): Promise<DailyLog | null> {
  const logs = await getDailyLogs();
  return logs.find((l) => l.date === date) || null;
}

export async function getHabitCompletionsByDate(date: string): Promise<HabitCompletion[]> {
  const completions = await getHabitCompletions();
  return completions.filter((c) => c.date === date);
}

export async function getWeeklySnapshotById(weekId: string): Promise<WeeklySnapshot | null> {
  const snapshots = await getWeeklySnapshots();
  return snapshots.find((s) => s.week_id === weekId) || null;
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
