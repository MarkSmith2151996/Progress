import { create } from 'zustand';
import { DailyLog, Task, Habit, HabitCompletion, HabitWithStatus, Goal } from '@/types';
import { enrichHabitWithStatus, isHabitActiveToday, getToday } from '@/lib/metrics';
import * as browserStorage from '@/lib/browserStorage';
import * as supabase from '@/lib/supabase';
import { processAccomplishment, GoalUpdateResult, formatUpdateMessage } from '@/lib/goalUpdater';
import { RealtimeChannel } from '@supabase/supabase-js';

export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'error';

interface LogState {
  dailyLogs: DailyLog[];
  tasks: Task[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  isLoading: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  realtimeChannels: RealtimeChannel[];

  // Goal update feedback
  lastGoalUpdate: GoalUpdateResult | null;
  goalUpdateMessage: string | null;
  clearGoalUpdateMessage: () => void;

  setDailyLogs: (logs: DailyLog[]) => void;
  setTasks: (tasks: Task[]) => void;
  setHabits: (habits: Habit[]) => void;
  setHabitCompletions: (completions: HabitCompletion[]) => void;
  setSyncStatus: (status: SyncStatus) => void;

  saveDailyLog: (log: DailyLog, goals?: Goal[], onGoalUpdate?: (goal: Goal) => Promise<void>) => Promise<GoalUpdateResult | null>;
  saveTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
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

  // Real-time subscriptions
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
}

export const useLogStore = create<LogState>((set, get) => ({
  dailyLogs: [],
  tasks: [],
  habits: [],
  habitCompletions: [],
  isLoading: false,
  error: null,
  syncStatus: 'synced' as SyncStatus,
  realtimeChannels: [],

  lastGoalUpdate: null,
  goalUpdateMessage: null,

  clearGoalUpdateMessage: () => set({ goalUpdateMessage: null, lastGoalUpdate: null }),

  setDailyLogs: (dailyLogs) => set({ dailyLogs }),
  setTasks: (tasks) => set({ tasks }),
  setHabits: (habits) => set({ habits }),
  setHabitCompletions: (habitCompletions) => set({ habitCompletions }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),

  saveDailyLog: async (log, goals, onGoalUpdate) => {
    set({ syncStatus: 'syncing' });
    let goalUpdateResult: GoalUpdateResult | null = null;

    try {
      // Get existing log to find new accomplishments
      const existingLog = get().dailyLogs.find((l) => l.date === log.date);
      const existingAccomplishments = existingLog?.accomplishments || [];
      const newAccomplishments = (log.accomplishments || []).filter(
        (acc) => !existingAccomplishments.includes(acc)
      );

      // Optimistically update local state
      set((state) => {
        const idx = state.dailyLogs.findIndex((l) => l.date === log.date);
        if (idx >= 0) {
          const updated = [...state.dailyLogs];
          updated[idx] = log;
          return { dailyLogs: updated };
        }
        return { dailyLogs: [...state.dailyLogs, log] };
      });

      // Save to browser storage as cache
      browserStorage.saveDailyLog(log);

      // Save to Supabase if configured
      if (supabase.isSupabaseConfigured()) {
        await supabase.upsertDailyLog(log);
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'offline' });
      }

      // Process new accomplishments for smart goal updates
      if (newAccomplishments.length > 0 && goals && onGoalUpdate) {
        for (const accomplishment of newAccomplishments) {
          const result = await processAccomplishment(accomplishment, goals);
          if (result) {
            goalUpdateResult = result;
            // Save the updated goal
            await onGoalUpdate(result.goal);
            // Set feedback message
            const message = formatUpdateMessage(result);
            set({ lastGoalUpdate: result, goalUpdateMessage: message });
            break; // Only show one update at a time
          }
        }
      }
    } catch (error: any) {
      console.error('Error saving daily log:', error);
      set({ error: error.message, syncStatus: 'error' });
    }

    return goalUpdateResult;
  },

  saveTask: async (task) => {
    set({ syncStatus: 'syncing' });
    try {
      // Optimistically update local state
      set((state) => {
        const idx = state.tasks.findIndex((t) => t.task_id === task.task_id);
        if (idx >= 0) {
          const updated = [...state.tasks];
          updated[idx] = task;
          return { tasks: updated };
        }
        return { tasks: [...state.tasks, task] };
      });

      // Save to browser storage as cache
      browserStorage.saveTask(task);

      // Save to Supabase if configured
      if (supabase.isSupabaseConfigured()) {
        await supabase.upsertTask(task);
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'offline' });
      }
    } catch (error: any) {
      console.error('Error saving task:', error);
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  deleteTask: async (taskId) => {
    set({ syncStatus: 'syncing' });
    try {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.task_id !== taskId),
      }));

      browserStorage.deleteTask(taskId);

      if (supabase.isSupabaseConfigured()) {
        await supabase.deleteTask(taskId);
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'offline' });
      }
    } catch (error: any) {
      console.error('Error deleting task:', error);
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  toggleTask: async (taskId) => {
    const { tasks, saveTask } = get();
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task) return;

    const today = getToday();
    const updatedTask: Task = {
      ...task,
      status: task.status === 'completed' ? 'planned' : 'completed',
      completed_date: task.status === 'completed' ? null : today,
    };

    await saveTask(updatedTask);
  },

  saveHabitCompletion: async (completion) => {
    set({ syncStatus: 'syncing' });
    try {
      // Optimistically update local state
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

      // Save to browser storage as cache
      browserStorage.saveHabitCompletion(completion);

      // Save to Supabase if configured
      if (supabase.isSupabaseConfigured()) {
        await supabase.upsertHabitCompletion(completion);
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'offline' });
      }
    } catch (error: any) {
      console.error('Error saving habit completion:', error);
      set({ error: error.message, syncStatus: 'error' });
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
    set({ syncStatus: 'syncing' });
    try {
      // Optimistically update local state
      set((state) => ({ habits: [...state.habits, habit] }));

      // Save to browser storage as cache
      browserStorage.saveHabit(habit);

      // Save to Supabase if configured
      if (supabase.isSupabaseConfigured()) {
        await supabase.upsertHabit(habit);
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'offline' });
      }
    } catch (error: any) {
      console.error('Error adding habit:', error);
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  updateHabit: async (habit) => {
    set({ syncStatus: 'syncing' });
    try {
      // Optimistically update local state
      set((state) => ({
        habits: state.habits.map((h) => h.habit_id === habit.habit_id ? habit : h),
      }));

      // Save to browser storage as cache
      browserStorage.saveHabit(habit);

      // Save to Supabase if configured
      if (supabase.isSupabaseConfigured()) {
        await supabase.upsertHabit(habit);
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'offline' });
      }
    } catch (error: any) {
      console.error('Error updating habit:', error);
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  deleteHabit: async (habitId) => {
    set({ syncStatus: 'syncing' });
    try {
      // Optimistically update local state
      set((state) => ({
        habits: state.habits.filter((h) => h.habit_id !== habitId),
      }));

      // Delete from browser storage
      browserStorage.deleteHabit(habitId);

      // Delete from Supabase if configured
      if (supabase.isSupabaseConfigured()) {
        await supabase.deleteHabit(habitId);
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'offline' });
      }
    } catch (error: any) {
      console.error('Error deleting habit:', error);
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  fetchData: async () => {
    set({ isLoading: true, error: null, syncStatus: 'syncing' });
    try {
      // Try Supabase first
      if (supabase.isSupabaseConfigured()) {
        const [dailyLogs, tasks, habits, habitCompletions] = await Promise.all([
          supabase.fetchDailyLogs(),
          supabase.fetchTasks(),
          supabase.fetchHabits(),
          supabase.fetchHabitCompletions(),
        ]);

        set({
          dailyLogs,
          tasks,
          habits,
          habitCompletions,
          isLoading: false,
          syncStatus: 'synced',
        });

        // Update browser storage as cache
        dailyLogs.forEach((log) => browserStorage.saveDailyLog(log));
        tasks.forEach((task) => browserStorage.saveTask(task));
        habits.forEach((habit) => browserStorage.saveHabit(habit));
        habitCompletions.forEach((c) => browserStorage.saveHabitCompletion(c));
        return;
      }

      // Fallback to browser storage
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
        syncStatus: 'offline',
      });
    } catch (error: any) {
      console.error('Error fetching data:', error);
      // Fallback to browser storage on error
      const dailyLogs = browserStorage.getDailyLogs();
      const tasks = browserStorage.getTasks();
      const habits = browserStorage.getHabits();
      const habitCompletions = browserStorage.getHabitCompletions();

      set({
        dailyLogs,
        tasks,
        habits,
        habitCompletions,
        error: error.message,
        isLoading: false,
        syncStatus: 'error',
      });
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

  subscribeToRealtime: () => {
    if (!supabase.isSupabaseConfigured()) return;

    const channels: RealtimeChannel[] = [];

    // Subscribe to daily_logs changes
    const logsChannel = supabase.subscribeToDailyLogs((payload) => {
      const { eventType, new: newLog } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (newLog) {
          set((state) => {
            const idx = state.dailyLogs.findIndex((l) => l.date === newLog.date);
            if (idx >= 0) {
              const updated = [...state.dailyLogs];
              updated[idx] = newLog;
              return { dailyLogs: updated };
            }
            return { dailyLogs: [...state.dailyLogs, newLog] };
          });
        }
      }
    });
    if (logsChannel) channels.push(logsChannel);

    // Subscribe to habits changes
    const habitsChannel = supabase.subscribeToHabits((payload) => {
      const { eventType, new: newHabit, old: oldHabit } = payload;
      set((state) => {
        let habits = [...state.habits];
        switch (eventType) {
          case 'INSERT':
            if (newHabit && !habits.find((h) => h.habit_id === newHabit.habit_id)) {
              habits = [...habits, newHabit];
            }
            break;
          case 'UPDATE':
            if (newHabit) {
              const idx = habits.findIndex((h) => h.habit_id === newHabit.habit_id);
              if (idx >= 0) habits[idx] = newHabit;
            }
            break;
          case 'DELETE':
            if (oldHabit) {
              habits = habits.filter((h) => h.habit_id !== oldHabit.habit_id);
            }
            break;
        }
        return { habits };
      });
    });
    if (habitsChannel) channels.push(habitsChannel);

    // Subscribe to habit_completions changes
    const completionsChannel = supabase.subscribeToHabitCompletions((payload) => {
      const { eventType, new: newCompletion, old: oldCompletion } = payload;
      set((state) => {
        let completions = [...state.habitCompletions];
        switch (eventType) {
          case 'INSERT':
            if (newCompletion && !completions.find((c) => c.completion_id === newCompletion.completion_id)) {
              completions = [...completions, newCompletion];
            }
            break;
          case 'UPDATE':
            if (newCompletion) {
              const idx = completions.findIndex((c) => c.completion_id === newCompletion.completion_id);
              if (idx >= 0) completions[idx] = newCompletion;
            }
            break;
          case 'DELETE':
            if (oldCompletion) {
              completions = completions.filter((c) => c.completion_id !== oldCompletion.completion_id);
            }
            break;
        }
        return { habitCompletions: completions };
      });
    });
    if (completionsChannel) channels.push(completionsChannel);

    set({ realtimeChannels: channels });
  },

  unsubscribeFromRealtime: () => {
    const { realtimeChannels } = get();
    realtimeChannels.forEach((channel) => supabase.unsubscribe(channel));
    set({ realtimeChannels: [] });
  },
}));
