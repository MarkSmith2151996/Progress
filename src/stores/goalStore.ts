import { create } from 'zustand';
import { Goal, GoalWithProgress, GoalType } from '@/types';
import { enrichGoalWithProgress } from '@/lib/metrics';
import { syncGoal, deleteGoalFromCoach, syncGoalUpdate, fullContextSync, logActivity } from '@/lib/coachSync';
import { debug, debugError, debugSuccess, debugWarn } from '@/lib/debug';
import * as browserStorage from '@/lib/browserStorage';

interface GoalState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  deleteGoal: (goalId: string) => Promise<void>;
  fetchGoals: () => Promise<void>;
  saveGoal: (goal: Goal) => Promise<void>;

  // Selectors
  getActiveGoals: () => GoalWithProgress[];
  getGoalsByType: (type: GoalType) => GoalWithProgress[];
  getGoalById: (goalId: string) => GoalWithProgress | null;
  getWeeklyChunks: (parentGoalId: string) => GoalWithProgress[];
}

// Check if we should use browser storage
function shouldUseBrowserStorage(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.includes('vercel.app') || hostname.includes('.vercel.app');
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  setGoals: (goals) => {
    debug('GoalStore', 'setGoals called', { count: goals.length });
    set({ goals });
  },

  addGoal: (goal) => {
    debug('GoalStore', 'addGoal called', { goalId: goal.goal_id, title: goal.title });
    set((state) => ({
      goals: [...state.goals, goal],
    }));
    debugSuccess('GoalStore', 'Goal added to state');
  },

  updateGoal: (goalId, updates) => {
    debug('GoalStore', 'updateGoal called', { goalId, updates });
    set((state) => ({
      goals: state.goals.map((g) =>
        g.goal_id === goalId ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
      ),
    }));
    debugSuccess('GoalStore', 'Goal updated in state');
  },

  deleteGoal: async (goalId) => {
    debug('GoalStore', 'deleteGoal called', { goalId });

    const goalToDelete = get().goals.find(g => g.goal_id === goalId);

    // Remove from local state
    set((state) => ({
      goals: state.goals.filter((g) => g.goal_id !== goalId),
    }));

    // Use browser storage on Vercel
    if (shouldUseBrowserStorage()) {
      browserStorage.deleteGoal(goalId);
      debugSuccess('GoalStore', 'Goal deleted from browser storage');
    } else {
      // Try to delete from API
      try {
        const response = await fetch('/api/goals', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal_id: goalId }),
        });

        if (!response.ok) {
          debugWarn('GoalStore', 'API delete returned non-OK', { status: response.status });
        }
      } catch (err: any) {
        debugWarn('GoalStore', 'API delete failed', err.message);
      }
    }

    // Sync deletion to coach (non-blocking)
    deleteGoalFromCoach(goalId)
      .then(() => debugSuccess('GoalStore', 'Goal deleted from coach'))
      .catch((err) => debugWarn('GoalStore', 'Coach delete failed (non-critical)', err));

    // Log the deletion
    if (goalToDelete) {
      logActivity('goal_deleted', `Deleted goal: ${goalToDelete.title}`, undefined)
        .catch(() => {});
    }

    debugSuccess('GoalStore', 'Goal deleted from state');
  },

  fetchGoals: async () => {
    debug('GoalStore', 'fetchGoals called');
    set({ isLoading: true, error: null });

    try {
      let goals: Goal[] = [];

      // Use browser storage on Vercel
      if (shouldUseBrowserStorage()) {
        debug('GoalStore', 'Using browser storage');
        goals = browserStorage.getGoals();
      } else {
        debug('GoalStore', 'Calling /api/goals GET...');
        const response = await fetch('/api/goals');

        if (!response.ok) {
          const errorText = await response.text();
          debugError('GoalStore', 'Goals API returned error', { status: response.status, body: errorText });
          throw new Error(`Failed to fetch goals: ${response.status}`);
        }

        const data = await response.json();
        goals = data.goals || [];
      }

      debug('GoalStore', 'Goals received', { count: goals.length });

      set({ goals, isLoading: false, error: null });

      // Sync all goals to coach on fetch (non-blocking)
      const activeGoals = goals.filter((g: Goal) => g.status === 'active');
      if (activeGoals.length > 0) {
        debug('GoalStore', 'Syncing all active goals to coach...');
        fullContextSync({ goals: activeGoals })
          .then(() => debugSuccess('GoalStore', 'All goals synced to coach'))
          .catch(() => debugWarn('GoalStore', 'Failed to sync goals to coach'));
      }

      debugSuccess('GoalStore', 'fetchGoals completed');
    } catch (error: any) {
      debugError('GoalStore', 'fetchGoals failed', error);
      set({ error: error.message, isLoading: false });
    }
  },

  saveGoal: async (goal) => {
    debug('GoalStore', 'saveGoal called', { goalId: goal.goal_id, title: goal.title, current: goal.current_value, target: goal.target_value });

    try {
      const isNew = !get().goals.find((g) => g.goal_id === goal.goal_id);

      // Use browser storage on Vercel
      if (shouldUseBrowserStorage()) {
        debug('GoalStore', 'Using browser storage');
        browserStorage.saveGoal(goal);
        debugSuccess('GoalStore', 'Goal saved to browser storage');
      } else {
        debug('GoalStore', 'Calling /api/goals POST...');
        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goal),
        });

        if (!response.ok) {
          const errorText = await response.text();
          debugError('GoalStore', 'Goals API save failed', { status: response.status, body: errorText });
          throw new Error(`Failed to save goal: ${response.status}`);
        }

        debugSuccess('GoalStore', 'API save successful');
      }

      // Update local state
      if (isNew) {
        debug('GoalStore', 'Adding new goal to state');
        get().addGoal(goal);
      } else {
        debug('GoalStore', 'Updating existing goal in state');
        get().updateGoal(goal.goal_id, goal);
      }

      // Sync goal directly to coach (non-blocking)
      debug('GoalStore', 'Syncing goal directly to coach...');
      syncGoal({
        goal_id: goal.goal_id,
        title: goal.title,
        type: goal.type,
        target_value: goal.target_value,
        current_value: goal.current_value,
        status: goal.status,
        deadline: goal.deadline
      })
        .then(() => debugSuccess('GoalStore', 'Goal synced to coach'))
        .catch((err) => debugWarn('GoalStore', 'Goal sync failed (non-critical)', err));

      // Log the activity
      const action = isNew ? 'created' : 'updated';
      logActivity(`goal_${action}`, `${action === 'created' ? 'Created' : 'Updated'} goal: ${goal.title}`, goal.current_value)
        .catch(() => {});

      // Also log progress update
      syncGoalUpdate(goal.title, goal.current_value, goal.target_value)
        .then(() => debugSuccess('GoalStore', 'Goal progress logged'))
        .catch((err) => debugWarn('GoalStore', 'Goal progress log failed (non-critical)', err));

      // Full context sync with all goals (non-blocking)
      const allGoals = get().goals;
      debug('GoalStore', 'Full context sync with all goals...');
      fullContextSync({
        goals: allGoals.filter(g => g.status === 'active')
      })
        .then(() => debugSuccess('GoalStore', 'Full context sync completed'))
        .catch((err) => debugWarn('GoalStore', 'Full context sync failed (non-critical)', err));

      debugSuccess('GoalStore', 'saveGoal completed');
    } catch (error: any) {
      debugError('GoalStore', 'saveGoal failed', error);
      set({ error: error.message });
      throw error;
    }
  },

  getActiveGoals: () => {
    const { goals } = get();
    const activeGoals = goals
      .filter((g) => g.status === 'active')
      .map(enrichGoalWithProgress);
    debug('GoalStore', 'getActiveGoals', { count: activeGoals.length });
    return activeGoals;
  },

  getGoalsByType: (type) => {
    const { goals } = get();
    const filtered = goals
      .filter((g) => g.type === type)
      .map(enrichGoalWithProgress);
    debug('GoalStore', 'getGoalsByType', { type, count: filtered.length });
    return filtered;
  },

  getGoalById: (goalId) => {
    const { goals } = get();
    const goal = goals.find((g) => g.goal_id === goalId);
    debug('GoalStore', 'getGoalById', { goalId, found: !!goal });
    return goal ? enrichGoalWithProgress(goal) : null;
  },

  getWeeklyChunks: (parentGoalId) => {
    const { goals } = get();
    const chunks = goals
      .filter((g) => g.parent_goal_id === parentGoalId)
      .map(enrichGoalWithProgress);
    debug('GoalStore', 'getWeeklyChunks', { parentGoalId, count: chunks.length });
    return chunks;
  },
}));
