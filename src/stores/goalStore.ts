import { create } from 'zustand';
import { Goal, GoalWithProgress, GoalType } from '@/types';
import { enrichGoalWithProgress } from '@/lib/metrics';
import * as browserStorage from '@/lib/browserStorage';
import * as supabase from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'error';

interface GoalState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  syncStatus: SyncStatus;
  realtimeChannel: RealtimeChannel | null;

  setGoals: (goals: Goal[]) => void;
  fetchGoals: () => Promise<void>;
  saveGoal: (goal: Goal) => Promise<void>;
  addGoal: (goal: Goal) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  setSyncStatus: (status: SyncStatus) => void;

  getActiveGoals: () => GoalWithProgress[];
  getGoalsByType: (type: GoalType) => GoalWithProgress[];
  getGoalById: (goalId: string) => GoalWithProgress | null;
  getAllGoals: () => Goal[];

  // Real-time subscriptions
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,
  syncStatus: 'synced' as SyncStatus,
  realtimeChannel: null,

  setGoals: (goals) => set({ goals }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  fetchGoals: async () => {
    set({ isLoading: true, syncStatus: 'syncing' });
    try {
      // Try Supabase first
      if (supabase.isSupabaseConfigured()) {
        const goals = await supabase.fetchGoals();
        set({ goals, isLoading: false, syncStatus: 'synced' });

        // Also update browser storage as cache
        goals.forEach((goal) => browserStorage.saveGoal(goal));
        return;
      }

      // Fallback to browser storage
      const goals = browserStorage.getGoals();
      set({ goals, isLoading: false, syncStatus: 'offline' });
    } catch (error: any) {
      console.error('Error fetching goals:', error);
      // Fallback to browser storage on error
      const goals = browserStorage.getGoals();
      set({ goals, error: error.message, isLoading: false, syncStatus: 'error' });
    }
  },

  saveGoal: async (goal) => {
    set({ syncStatus: 'syncing' });
    try {
      // Optimistically update local state
      set((state) => {
        const existingIndex = state.goals.findIndex((g) => g.goal_id === goal.goal_id);
        if (existingIndex >= 0) {
          const updated = [...state.goals];
          updated[existingIndex] = goal;
          return { goals: updated };
        }
        return { goals: [...state.goals, goal] };
      });

      // Save to browser storage as cache
      browserStorage.saveGoal(goal);

      // Save to Supabase if configured
      if (supabase.isSupabaseConfigured()) {
        await supabase.upsertGoal(goal);
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'offline' });
      }
    } catch (error: any) {
      console.error('Error saving goal:', error);
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  addGoal: async (goal) => {
    await get().saveGoal(goal);
  },

  updateGoal: async (goal) => {
    await get().saveGoal(goal);
  },

  deleteGoal: async (goalId) => {
    set({ syncStatus: 'syncing' });
    try {
      // Optimistically remove from local state
      set((state) => ({
        goals: state.goals.filter((g) => g.goal_id !== goalId),
      }));

      // Delete from browser storage
      browserStorage.deleteGoal(goalId);

      // Delete from Supabase if configured
      if (supabase.isSupabaseConfigured()) {
        await supabase.deleteGoal(goalId);
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'offline' });
      }
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  getActiveGoals: () => {
    const { goals } = get();
    return goals
      .filter((g) => g.status === 'active')
      .map((g) => enrichGoalWithProgress(g));
  },

  getGoalsByType: (type) => {
    const { goals } = get();
    return goals
      .filter((g) => g.type === type && g.status === 'active')
      .map((g) => enrichGoalWithProgress(g));
  },

  getGoalById: (goalId) => {
    const { goals } = get();
    const goal = goals.find((g) => g.goal_id === goalId);
    return goal ? enrichGoalWithProgress(goal) : null;
  },

  getAllGoals: () => {
    return get().goals;
  },

  subscribeToRealtime: () => {
    if (!supabase.isSupabaseConfigured()) return;

    const channel = supabase.subscribeToGoals((payload) => {
      const { eventType, new: newGoal, old: oldGoal } = payload;

      set((state) => {
        let goals = [...state.goals];

        switch (eventType) {
          case 'INSERT':
            if (newGoal && !goals.find((g) => g.goal_id === newGoal.goal_id)) {
              goals = [...goals, newGoal];
            }
            break;
          case 'UPDATE':
            if (newGoal) {
              const index = goals.findIndex((g) => g.goal_id === newGoal.goal_id);
              if (index >= 0) {
                goals[index] = newGoal;
              }
            }
            break;
          case 'DELETE':
            if (oldGoal) {
              goals = goals.filter((g) => g.goal_id !== oldGoal.goal_id);
            }
            break;
        }

        return { goals };
      });
    });

    set({ realtimeChannel: channel });
  },

  unsubscribeFromRealtime: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.unsubscribe(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },
}));
