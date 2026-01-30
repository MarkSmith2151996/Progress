import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings } from '@/types';

interface SettingsState extends UserSettings {
  isLoading: boolean;
  error: string | null;

  // Actions
  setTheme: (theme: string) => void;
  setCoachMinimized: (minimized: boolean) => void;
  setWeekColor: (weekId: string, color: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  fetchSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const DEFAULT_WEEK_COLORS: Record<string, string> = {
  '1': '#ff6b6b',
  '2': '#4ecdc4',
  '3': '#45b7d1',
  '4': '#96ceb4',
  '5': '#ffeaa7',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'terminal-classic',
      coach_minimized: false,
      week_colors: DEFAULT_WEEK_COLORS,
      notifications_enabled: true,
      isLoading: false,
      error: null,

      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },

      setCoachMinimized: (coach_minimized) => set({ coach_minimized }),

      setWeekColor: (weekId, color) =>
        set((state) => ({
          week_colors: { ...state.week_colors, [weekId]: color },
        })),

      setNotificationsEnabled: (notifications_enabled) =>
        set({ notifications_enabled }),

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/settings');
          if (!response.ok) throw new Error('Failed to fetch settings');

          const data = await response.json();
          if (data.settings) {
            set({
              theme: data.settings.theme || 'terminal-classic',
              coach_minimized: data.settings.coach_minimized || false,
              week_colors: data.settings.week_colors || DEFAULT_WEEK_COLORS,
              notifications_enabled: data.settings.notifications_enabled ?? true,
              isLoading: false,
            });

            // Apply theme
            document.documentElement.setAttribute(
              'data-theme',
              data.settings.theme || 'terminal-classic'
            );
          }
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      saveSettings: async () => {
        const { theme, coach_minimized, week_colors, notifications_enabled } =
          get();

        try {
          const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              theme,
              coach_minimized,
              week_colors,
              notifications_enabled,
            }),
          });

          if (!response.ok) throw new Error('Failed to save settings');
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },
    }),
    {
      name: 'progress-tracker-settings',
      partialize: (state) => ({
        theme: state.theme,
        coach_minimized: state.coach_minimized,
        week_colors: state.week_colors,
        notifications_enabled: state.notifications_enabled,
      }),
    }
  )
);
