import { create } from 'zustand';
import { Goal, GoalWithProgress, GoalType } from '@/types';
import { enrichGoalWithProgress } from '@/lib/metrics';
import * as browserStorage from '@/lib/browserStorage';

export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'error';

interface GoalState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  syncStatus: SyncStatus;

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
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,
  syncStatus: 'synced' as SyncStatus,

  setGoals: (goals) => set({ goals }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  fetchGoals: async () => {
    set({ isLoading: true });
    try {
      const goals = browserStorage.getGoals();
      set({ goals, isLoading: false, syncStatus: 'synced' });
    } catch (error: any) {
      set({ error: error.message, isLoading: false, syncStatus: 'error' });
    }
  },

  saveGoal: async (goal) => {
    try {
      browserStorage.saveGoal(goal);

      set((state) => {
        const existingIndex = state.goals.findIndex((g) => g.goal_id === goal.goal_id);
        if (existingIndex >= 0) {
          const updated = [...state.goals];
          updated[existingIndex] = goal;
          return { goals: updated, syncStatus: 'synced' };
        }
        return { goals: [...state.goals, goal], syncStatus: 'synced' };
      });
    } catch (error: any) {
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  addGoal: async (goal) => {
    try {
      browserStorage.saveGoal(goal);
      set((state) => ({ goals: [...state.goals, goal], syncStatus: 'synced' }));
    } catch (error: any) {
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  updateGoal: async (goal) => {
    try {
      browserStorage.saveGoal(goal);
      set((state) => ({
        goals: state.goals.map((g) => g.goal_id === goal.goal_id ? goal : g),
        syncStatus: 'synced'
      }));
    } catch (error: any) {
      set({ error: error.message, syncStatus: 'error' });
    }
  },

  deleteGoal: async (goalId) => {
    try {
      browserStorage.deleteGoal(goalId);
      set((state) => ({
        goals: state.goals.filter((g) => g.goal_id !== goalId),
        syncStatus: 'synced'
      }));
    } catch (error: any) {
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
}));
