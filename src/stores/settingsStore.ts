import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings } from '@/types';
import * as supabase from '@/lib/supabase';

interface SettingsState extends UserSettings {
  isLoading: boolean;
  error: string | null;
  coach_context: string; // Custom context for the AI coach

  // Actions
  setTheme: (theme: string) => void;
  setCoachMinimized: (minimized: boolean) => void;
  setWeekColor: (weekId: string, color: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setCoachContext: (context: string) => void;
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
      coach_context: '',
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

      setCoachContext: async (coach_context) => {
        set({ coach_context });
        // Sync to Supabase
        if (supabase.isSupabaseConfigured()) {
          try {
            await supabase.updateCoachContext(coach_context);
          } catch (error) {
            console.error('Failed to sync coach context to Supabase:', error);
          }
        }
      },

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          // First try to fetch coach_context from Supabase
          let supabaseContext = '';
          if (supabase.isSupabaseConfigured()) {
            try {
              const userSettings = await supabase.fetchUserSettings();
              if (userSettings?.coach_context) {
                supabaseContext = userSettings.coach_context;
              }
            } catch (e) {
              console.warn('Could not fetch settings from Supabase:', e);
            }
          }

          // Then fetch other settings from API
          const response = await fetch('/api/settings');
          if (!response.ok) throw new Error('Failed to fetch settings');

          const data = await response.json();
          if (data.settings) {
            set({
              theme: data.settings.theme || 'terminal-classic',
              coach_minimized: data.settings.coach_minimized || false,
              week_colors: data.settings.week_colors || DEFAULT_WEEK_COLORS,
              notifications_enabled: data.settings.notifications_enabled ?? true,
              // Prefer Supabase context over API/local
              coach_context: supabaseContext || data.settings.coach_context || '',
              isLoading: false,
            });

            // Apply theme
            document.documentElement.setAttribute(
              'data-theme',
              data.settings.theme || 'terminal-classic'
            );
          } else {
            // No API settings, just use Supabase context
            set({
              coach_context: supabaseContext,
              isLoading: false,
            });
          }
        } catch (error) {
          // Try Supabase-only fallback
          if (supabase.isSupabaseConfigured()) {
            try {
              const userSettings = await supabase.fetchUserSettings();
              if (userSettings?.coach_context) {
                set({ coach_context: userSettings.coach_context });
              }
            } catch (e) {
              console.warn('Supabase fallback failed:', e);
            }
          }
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      saveSettings: async () => {
        const { theme, coach_minimized, week_colors, notifications_enabled, coach_context } =
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
              coach_context,
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
        coach_context: state.coach_context,
      }),
    }
  )
);
