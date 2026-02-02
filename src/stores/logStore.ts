import { create } from 'zustand';
import {
  DailyLog,
  Task,
  Habit,
  HabitCompletion,
  HabitWithStatus,
} from '@/types';
import { enrichHabitWithStatus, isHabitActiveToday, getToday } from '@/lib/metrics';
import { syncHabitComplete, logActivity } from '@/lib/coachSync';
import { debug, debugError, debugSuccess, debugWarn } from '@/lib/debug';
import * as browserStorage from '@/lib/browserStorage';

// Sync status type for tracking data source
export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'error';

interface LogState {
  dailyLogs: DailyLog[];
  tasks: Task[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  isLoading: boolean;
  error: string | null;
  syncStatus: SyncStatus;

  // Actions
  setDailyLogs: (logs: DailyLog[]) => void;
  setTasks: (tasks: Task[]) => void;
  setHabits: (habits: Habit[]) => void;
  setHabitCompletions: (completions: HabitCompletion[]) => void;
  setSyncStatus: (status: SyncStatus) => void;

  saveDailyLog: (log: DailyLog) => Promise<void>;
  saveTask: (task: Task) => Promise<void>;
  saveHabitCompletion: (completion: HabitCompletion) => Promise<void>;
  toggleHabit: (habitId: string, date: string) => Promise<void>;
  addHabit: (habit: Habit) => Promise<void>;
  updateHabit: (habit: Habit) => Promise<void>;
  deleteHabit: (habitId: string) => Promise<void>;

  fetchData: () => Promise<void>;

  // Selectors
  getTodayLog: () => DailyLog | null;
  getLogByDate: (date: string) => DailyLog | null;
  getTasksByDate: (date: string) => Task[];
  getTasksByWeek: (weekStart: string, weekEnd: string) => Task[];
  getTodayHabits: () => HabitWithStatus[];
  getHabitsByDate: (date: string) => HabitWithStatus[];
}

export const useLogStore = create<LogState>((set, get) => ({
  dailyLogs: [],
  tasks: [],
  habits: [],
  habitCompletions: [],
  isLoading: false,
  error: null,
  syncStatus: 'synced' as SyncStatus,

  setDailyLogs: (dailyLogs) => {
    debug('LogStore', 'setDailyLogs called', { count: dailyLogs.length });
    set({ dailyLogs });
  },

  setTasks: (tasks) => {
    debug('LogStore', 'setTasks called', { count: tasks.length });
    set({ tasks });
  },

  setHabits: (habits) => {
    debug('LogStore', 'setHabits called', { count: habits.length });
    set({ habits });
  },

  setHabitCompletions: (habitCompletions) => {
    debug('LogStore', 'setHabitCompletions called', { count: habitCompletions.length });
    set({ habitCompletions });
  },

  setSyncStatus: (syncStatus) => {
    debug('LogStore', 'setSyncStatus called', { syncStatus });
    set({ syncStatus });
  },

  saveDailyLog: async (log) => {
    debug('LogStore', 'saveDailyLog called', { date: log.date, energy: log.energy_level });

    try {
      // Try API first, fall back to browser storage on failure
      try {
        debug('LogStore', 'Calling /api/daily-logs POST...');
        const response = await fetch('/api/daily-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log),
        });

        if (!response.ok) {
          const errorText = await response.text();
          debugError('LogStore', 'API returned error', { status: response.status, body: errorText });
          throw new Error(`Failed to save daily log: ${response.status}`);
        }

        debugSuccess('LogStore', 'Daily log saved via API (cloud sync)');
        set({ syncStatus: 'synced' });
      } catch (apiError: any) {
        debugWarn('LogStore', 'API save failed, using browser storage', apiError.message);
        browserStorage.saveDailyLog(log);
        set({ syncStatus: 'offline' });
        debugSuccess('LogStore', 'Daily log saved to browser storage (offline fallback)');
      }

      set((state) => {
        const existingIndex = state.dailyLogs.findIndex(
          (l) => l.date === log.date
        );
        if (existingIndex >= 0) {
          debug('LogStore', 'Updating existing log', { index: existingIndex });
          const updated = [...state.dailyLogs];
          updated[existingIndex] = log;
          return { dailyLogs: updated, error: null };
        }
        debug('LogStore', 'Adding new log', { newTotal: state.dailyLogs.length + 1 });
        return { dailyLogs: [...state.dailyLogs, log], error: null };
      });

      // Sync to coach proxy (non-blocking)
      debug('LogStore', 'Syncing to coach proxy...');
      logActivity('daily_log', `Logged ${log.date}: energy ${log.energy_level}/10, ${log.hours_slept}h sleep`)
        .then(() => debugSuccess('LogStore', 'Coach sync completed'))
        .catch((err) => debugWarn('LogStore', 'Coach sync failed (non-critical)', err));

      debugSuccess('LogStore', 'saveDailyLog completed');
    } catch (error: any) {
      debugError('LogStore', 'saveDailyLog failed', error);
      set({ error: error.message });
      throw error;
    }
  },

  saveTask: async (task) => {
    debug('LogStore', 'saveTask called', { taskId: task.task_id, description: task.description });

    try {
      // Try API first, fall back to browser storage on failure
      try {
        debug('LogStore', 'Calling /api/tasks POST...');
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        });

        if (!response.ok) {
          const errorText = await response.text();
          debugError('LogStore', 'Task API returned error', { status: response.status, body: errorText });
          throw new Error(`Failed to save task: ${response.status}`);
        }

        debugSuccess('LogStore', 'Task saved via API (cloud sync)');
        set({ syncStatus: 'synced' });
      } catch (apiError: any) {
        debugWarn('LogStore', 'API save failed, using browser storage', apiError.message);
        browserStorage.saveTask(task);
        set({ syncStatus: 'offline' });
        debugSuccess('LogStore', 'Task saved to browser storage (offline fallback)');
      }

      set((state) => {
        const existingIndex = state.tasks.findIndex(
          (t) => t.task_id === task.task_id
        );
        if (existingIndex >= 0) {
          debug('LogStore', 'Updating existing task', { index: existingIndex });
          const updated = [...state.tasks];
          updated[existingIndex] = task;
          return { tasks: updated, error: null };
        }
        debug('LogStore', 'Adding new task', { newTotal: state.tasks.length + 1 });
        return { tasks: [...state.tasks, task], error: null };
      });

      debugSuccess('LogStore', 'saveTask completed');
    } catch (error: any) {
      debugError('LogStore', 'saveTask failed', error);
      set({ error: error.message });
      throw error;
    }
  },

  saveHabitCompletion: async (completion) => {
    debug('LogStore', 'saveHabitCompletion called', { habitId: completion.habit_id, completed: completion.completed });

    try {
      // Try API first, fall back to browser storage on failure
      try {
        debug('LogStore', 'Calling /api/habit-completions POST...');
        const response = await fetch('/api/habit-completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(completion),
        });

        if (!response.ok) {
          const errorText = await response.text();
          debugError('LogStore', 'Habit completion API returned error', { status: response.status, body: errorText });
          throw new Error(`Failed to save habit completion: ${response.status}`);
        }

        debugSuccess('LogStore', 'Habit completion saved via API (cloud sync)');
        set({ syncStatus: 'synced' });
      } catch (apiError: any) {
        debugWarn('LogStore', 'API save failed, using browser storage', apiError.message);
        browserStorage.saveHabitCompletion(completion);
        set({ syncStatus: 'offline' });
        debugSuccess('LogStore', 'Habit completion saved to browser storage (offline fallback)');
      }

      set((state) => {
        const existingIndex = state.habitCompletions.findIndex(
          (c) =>
            c.habit_id === completion.habit_id && c.date === completion.date
        );
        if (existingIndex >= 0) {
          debug('LogStore', 'Updating existing habit completion', { index: existingIndex });
          const updated = [...state.habitCompletions];
          updated[existingIndex] = completion;
          return { habitCompletions: updated, error: null };
        }
        debug('LogStore', 'Adding new habit completion', { newTotal: state.habitCompletions.length + 1 });
        return { habitCompletions: [...state.habitCompletions, completion], error: null };
      });

      debugSuccess('LogStore', 'saveHabitCompletion completed');
    } catch (error: any) {
      debugError('LogStore', 'saveHabitCompletion failed', error);
      set({ error: error.message });
      throw error;
    }
  },

  toggleHabit: async (habitId, date) => {
    debug('LogStore', 'toggleHabit called', { habitId, date });

    const { habitCompletions, habits, saveHabitCompletion } = get();

    const existing = habitCompletions.find(
      (c) => c.habit_id === habitId && c.date === date
    );

    const completion: HabitCompletion = {
      completion_id: existing?.completion_id || `hc_${Date.now()}`,
      habit_id: habitId,
      date,
      completed: !existing?.completed,
      created_at: existing?.created_at || new Date().toISOString(),
    };

    debug('LogStore', 'Toggling habit', { wasCompleted: existing?.completed, nowCompleted: completion.completed });

    await saveHabitCompletion(completion);

    // Sync to coach proxy (non-blocking)
    const habit = habits.find(h => h.habit_id === habitId);
    if (habit) {
      debug('LogStore', 'Syncing habit to coach...', { habitName: habit.name });
      syncHabitComplete(habit.name, completion.completed)
        .then(() => debugSuccess('LogStore', 'Habit coach sync completed'))
        .catch((err) => debugWarn('LogStore', 'Habit coach sync failed (non-critical)', err));
    }

    debugSuccess('LogStore', 'toggleHabit completed');
  },

  addHabit: async (habit) => {
    debug('LogStore', 'addHabit called', { habitId: habit.habit_id, name: habit.name });

    try {
      // Try API first, fall back to browser storage on failure
      try {
        debug('LogStore', 'Calling /api/habits POST...');
        const response = await fetch('/api/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habit),
        });

        if (!response.ok) {
          const errorText = await response.text();
          debugError('LogStore', 'Habits API returned error', { status: response.status, body: errorText });
          throw new Error(`Failed to save habit: ${response.status}`);
        }

        debugSuccess('LogStore', 'Habit saved via API (cloud sync)');
        set({ syncStatus: 'synced' });
      } catch (apiError: any) {
        debugWarn('LogStore', 'API save failed, using browser storage', apiError.message);
        browserStorage.saveHabit(habit);
        set({ syncStatus: 'offline' });
        debugSuccess('LogStore', 'Habit saved to browser storage (offline fallback)');
      }

      set((state) => ({
        habits: [...state.habits, habit],
        error: null,
      }));

      debugSuccess('LogStore', 'addHabit completed');
    } catch (error: any) {
      debugError('LogStore', 'addHabit failed', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateHabit: async (habit) => {
    debug('LogStore', 'updateHabit called', { habitId: habit.habit_id, name: habit.name });

    try {
      // Try API first, fall back to browser storage on failure
      try {
        debug('LogStore', 'Calling /api/habits PUT...');
        const response = await fetch('/api/habits', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habit),
        });

        if (!response.ok) {
          const errorText = await response.text();
          debugError('LogStore', 'Habits API update returned error', { status: response.status, body: errorText });
          throw new Error(`Failed to update habit: ${response.status}`);
        }

        debugSuccess('LogStore', 'Habit updated via API (cloud sync)');
        set({ syncStatus: 'synced' });
      } catch (apiError: any) {
        debugWarn('LogStore', 'API update failed, using browser storage', apiError.message);
        browserStorage.saveHabit(habit);
        set({ syncStatus: 'offline' });
        debugSuccess('LogStore', 'Habit updated in browser storage (offline fallback)');
      }

      set((state) => ({
        habits: state.habits.map((h) =>
          h.habit_id === habit.habit_id ? habit : h
        ),
        error: null,
      }));

      debugSuccess('LogStore', 'updateHabit completed');
    } catch (error: any) {
      debugError('LogStore', 'updateHabit failed', error);
      set({ error: error.message });
      throw error;
    }
  },

  deleteHabit: async (habitId) => {
    debug('LogStore', 'deleteHabit called', { habitId });

    try {
      // Try API first, fall back to browser storage on failure
      try {
        debug('LogStore', 'Calling /api/habits DELETE...');
        const response = await fetch(`/api/habits?id=${habitId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        debugSuccess('LogStore', 'Habit deleted via API (cloud sync)');
        set({ syncStatus: 'synced' });
      } catch (apiError: any) {
        debugWarn('LogStore', 'API delete failed, using browser storage', apiError.message);
        browserStorage.deleteHabit(habitId);
        set({ syncStatus: 'offline' });
        debugSuccess('LogStore', 'Habit deleted from browser storage (offline fallback)');
      }

      set((state) => ({
        habits: state.habits.filter((h) => h.habit_id !== habitId),
        error: null,
      }));

      debugSuccess('LogStore', 'deleteHabit completed');
    } catch (error: any) {
      debugError('LogStore', 'deleteHabit failed', error);
      set({ error: error.message });
    }
  },

  fetchData: async () => {
    debug('LogStore', 'fetchData called');
    set({ isLoading: true, error: null, syncStatus: 'syncing' });

    try {
      let dailyLogs: DailyLog[] = [];
      let tasks: Task[] = [];
      let habits: Habit[] = [];
      let habitCompletions: HabitCompletion[] = [];
      let usedBrowserStorage = false;

      // Try API first, fall back to browser storage on failure
      try {
        debug('LogStore', 'Fetching all data from APIs...');
        const [logsRes, tasksRes, habitsRes, completionsRes] = await Promise.all([
          fetch('/api/daily-logs'),
          fetch('/api/tasks'),
          fetch('/api/habits'),
          fetch('/api/habit-completions'),
        ]);

        debug('LogStore', 'API responses received', {
          logsOk: logsRes.ok,
          tasksOk: tasksRes.ok,
          habitsOk: habitsRes.ok,
          completionsOk: completionsRes.ok
        });

        if (!logsRes.ok || !tasksRes.ok || !habitsRes.ok || !completionsRes.ok) {
          const errors = [];
          if (!logsRes.ok) errors.push(`logs: ${logsRes.status}`);
          if (!tasksRes.ok) errors.push(`tasks: ${tasksRes.status}`);
          if (!habitsRes.ok) errors.push(`habits: ${habitsRes.status}`);
          if (!completionsRes.ok) errors.push(`completions: ${completionsRes.status}`);
          debugError('LogStore', 'Some APIs failed', errors);
          throw new Error(`Failed to fetch data: ${errors.join(', ')}`);
        }

        const [logsData, tasksData, habitsData, completionsData] =
          await Promise.all([
            logsRes.json(),
            tasksRes.json(),
            habitsRes.json(),
            completionsRes.json(),
          ]);

        dailyLogs = logsData.logs || [];
        tasks = tasksData.tasks || [];
        habits = habitsData.habits || [];
        habitCompletions = completionsData.completions || [];
        debugSuccess('LogStore', 'Data fetched from API (cloud sync)');
      } catch (apiError: any) {
        debugWarn('LogStore', 'API fetch failed, falling back to browser storage', apiError.message);
        dailyLogs = browserStorage.getDailyLogs();
        tasks = browserStorage.getTasks();
        habits = browserStorage.getHabits();
        habitCompletions = browserStorage.getHabitCompletions();
        usedBrowserStorage = true;
        debug('LogStore', 'Using browser storage (offline mode)');
      }

      debug('LogStore', 'Data loaded', {
        logs: dailyLogs.length,
        tasks: tasks.length,
        habits: habits.length,
        completions: habitCompletions.length,
        source: usedBrowserStorage ? 'browser' : 'api'
      });

      set({
        dailyLogs,
        tasks,
        habits,
        habitCompletions,
        isLoading: false,
        error: null,
        syncStatus: usedBrowserStorage ? 'offline' : 'synced',
      });

      debugSuccess('LogStore', 'fetchData completed successfully');
    } catch (error: any) {
      debugError('LogStore', 'fetchData failed', error);
      set({ error: error.message, isLoading: false, syncStatus: 'error' });
    }
  },

  getTodayLog: () => {
    const { dailyLogs } = get();
    const today = getToday();
    const log = dailyLogs.find((l) => l.date === today) || null;
    debug('LogStore', 'getTodayLog', { today, found: !!log });
    return log;
  },

  getLogByDate: (date) => {
    const { dailyLogs } = get();
    const log = dailyLogs.find((l) => l.date === date) || null;
    debug('LogStore', 'getLogByDate', { date, found: !!log });
    return log;
  },

  getTasksByDate: (date) => {
    const { tasks } = get();
    const filtered = tasks.filter((t) => t.planned_date === date);
    debug('LogStore', 'getTasksByDate', { date, count: filtered.length });
    return filtered;
  },

  getTasksByWeek: (weekStart, weekEnd) => {
    const { tasks } = get();
    const filtered = tasks.filter(
      (t) => t.planned_date >= weekStart && t.planned_date <= weekEnd
    );
    debug('LogStore', 'getTasksByWeek', { weekStart, weekEnd, count: filtered.length });
    return filtered;
  },

  getTodayHabits: () => {
    const { habits, habitCompletions } = get();
    const today = getToday();

    const todayHabits = habits
      .filter((h) => h.active && isHabitActiveToday(h))
      .map((h) => enrichHabitWithStatus(h, habitCompletions, today));

    debug('LogStore', 'getTodayHabits', { today, count: todayHabits.length });
    return todayHabits;
  },

  getHabitsByDate: (date) => {
    const { habits, habitCompletions } = get();

    const dateHabits = habits
      .filter((h) => h.active)
      .map((h) => enrichHabitWithStatus(h, habitCompletions, date));

    debug('LogStore', 'getHabitsByDate', { date, count: dateHabits.length });
    return dateHabits;
  },
}));
