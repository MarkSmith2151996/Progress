import { create } from 'zustand';
import { DailyLog, Task, Habit, HabitCompletion, HabitWithStatus } from '@/types';
import { enrichHabitWithStatus, isHabitActiveToday, getToday } from '@/lib/metrics';
import * as browserStorage from '@/lib/browserStorage';

export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'error';

interface LogState {
  dailyLogs: DailyLog[];
  tasks: Task[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  isLoading: boolean;
  error: string | null;
  syncStatus: SyncStatus;

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

  getTodayLog: () => DailyLog | null;
  getLogByDate: (date: string) => DailyLog | null;
  getTasksByDate: (date: string) => Task[];
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

  setDailyLogs: (dailyLogs) => set({ dailyLogs }),
  setTasks: (tasks) => set({ tasks }),
  setHabits: (habits) => set({ habits }),
  setHabitCompletions: (habitCompletions) => set({ habitCompletions }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),

  saveDailyLog: async (log) => {
    try {
      browserStorage.saveDailyLog(log);
      set((state) => {
        const idx = state.dailyLogs.findIndex((l) => l.date === log.date);
        if (idx >= 0) {
          const updated = [...state.dailyLogs];
          updated[idx] = log;
          return { dailyLogs: updated };
        }
        return { dailyLogs: [...state.dailyLogs, log] };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  saveTask: async (task) => {
    try {
      browserStorage.saveTask(task);
      set((state) => {
        const idx = state.tasks.findIndex((t) => t.task_id === task.task_id);
        if (idx >= 0) {
          const updated = [...state.tasks];
          updated[idx] = task;
          return { tasks: updated };
        }
        return { tasks: [...state.tasks, task] };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  saveHabitCompletion: async (completion) => {
    try {
      browserStorage.saveHabitCompletion(completion);
      set((state) => {
        const idx = state.habitCompletions.findIndex(
          (c) => c.habit_id === completion.habit_id && c.date === completion.date
        );
        if (idx >= 0) {
          const updated = [...state.habitCompletions];
          updated[idx] = completion;
          return { habitCompletions: updated };
        }
        return { habitCompletions: [...state.habitCompletions, completion] };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  toggleHabit: async (habitId, date) => {
    const { habitCompletions, saveHabitCompletion } = get();
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

    await saveHabitCompletion(completion);
  },

  addHabit: async (habit) => {
    try {
      browserStorage.saveHabit(habit);
      set((state) => ({ habits: [...state.habits, habit] }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updateHabit: async (habit) => {
    try {
      browserStorage.saveHabit(habit);
      set((state) => ({
        habits: state.habits.map((h) => h.habit_id === habit.habit_id ? habit : h),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteHabit: async (habitId) => {
    try {
      browserStorage.deleteHabit(habitId);
      set((state) => ({
        habits: state.habits.filter((h) => h.habit_id !== habitId),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const dailyLogs = browserStorage.getDailyLogs();
      const tasks = browserStorage.getTasks();
      const habits = browserStorage.getHabits();
      const habitCompletions = browserStorage.getHabitCompletions();

      set({
        dailyLogs,
        tasks,
        habits,
        habitCompletions,
        isLoading: false,
        syncStatus: 'synced',
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false, syncStatus: 'error' });
    }
  },

  getTodayLog: () => {
    const { dailyLogs } = get();
    const today = getToday();
    return dailyLogs.find((l) => l.date === today) || null;
  },

  getLogByDate: (date) => {
    const { dailyLogs } = get();
    return dailyLogs.find((l) => l.date === date) || null;
  },

  getTasksByDate: (date) => {
    const { tasks } = get();
    return tasks.filter((t) => t.planned_date === date);
  },

  getTodayHabits: () => {
    const { habits, habitCompletions } = get();
    const today = getToday();
    return habits
      .filter((h) => h.active && isHabitActiveToday(h))
      .map((h) => enrichHabitWithStatus(h, habitCompletions, today));
  },

  getHabitsByDate: (date) => {
    const { habits, habitCompletions } = get();
    return habits
      .filter((h) => h.active)
      .map((h) => enrichHabitWithStatus(h, habitCompletions, date));
  },
}));
