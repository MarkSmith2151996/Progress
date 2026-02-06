import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings, FontSize, CoachTone, DigestFrequency } from '@/types';
import * as supabase from '@/lib/supabase';

interface SettingsState extends UserSettings {
  isLoading: boolean;
  error: string | null;
  coach_context: string;

  // Actions — existing
  setTheme: (theme: string) => void;
  setCoachMinimized: (minimized: boolean) => void;
  setWeekColor: (weekId: string, color: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setCoachContext: (context: string) => void;
  fetchSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;

  // Actions — new
  setDisplayName: (name: string) => void;
  setDefaultTab: (tab: number) => void;
  setAccentColor: (color: string) => void;
  setFontSize: (size: FontSize) => void;
  setCoachTone: (tone: CoachTone) => void;
  setDigestEnabled: (enabled: boolean) => void;
  setDigestFrequency: (freq: DigestFrequency) => void;
  setShowStreaks: (show: boolean) => void;
  syncPreferences: () => Promise<void>;
}

const DEFAULT_WEEK_COLORS: Record<string, string> = {
  '1': '#ff6b6b',
  '2': '#4ecdc4',
  '3': '#45b7d1',
  '4': '#96ceb4',
  '5': '#ffeaa7',
};

// Debounce timer for Supabase sync
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSync(syncFn: () => Promise<void>) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncFn().catch(console.error);
  }, 1500);
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Existing defaults
      theme: 'terminal-classic',
      coach_minimized: false,
      week_colors: DEFAULT_WEEK_COLORS,
      notifications_enabled: true,
      coach_context: '',
      isLoading: false,
      error: null,

      // New defaults
      display_name: 'Antonio',
      default_tab: 3,
      accent_color: '#008080',
      font_size: 'medium' as FontSize,
      coach_tone: 'direct' as CoachTone,
      digest_enabled: true,
      digest_frequency: 'daily' as DigestFrequency,
      show_streaks: true,

      // Existing setters
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
        debouncedSync(get().syncPreferences);
      },

      setCoachMinimized: (coach_minimized) => set({ coach_minimized }),

      setWeekColor: (weekId, color) => {
        set((state) => ({
          week_colors: { ...state.week_colors, [weekId]: color },
        }));
        debouncedSync(get().syncPreferences);
      },

      setNotificationsEnabled: (notifications_enabled) => {
        set({ notifications_enabled });
        debouncedSync(get().syncPreferences);
      },

      setCoachContext: async (coach_context) => {
        set({ coach_context });
        if (supabase.isSupabaseConfigured()) {
          try {
            await supabase.updateCoachContext(coach_context);
          } catch (error) {
            console.error('Failed to sync coach context to Supabase:', error);
          }
        }
        debouncedSync(get().syncPreferences);
      },

      // New setters
      setDisplayName: (display_name) => {
        set({ display_name });
        debouncedSync(get().syncPreferences);
      },

      setDefaultTab: (default_tab) => {
        set({ default_tab });
        debouncedSync(get().syncPreferences);
      },

      setAccentColor: (accent_color) => {
        set({ accent_color });
        document.documentElement.style.setProperty('--accent-color', accent_color);
        debouncedSync(get().syncPreferences);
      },

      setFontSize: (font_size) => {
        set({ font_size });
        document.documentElement.setAttribute('data-font-size', font_size);
        debouncedSync(get().syncPreferences);
      },

      setCoachTone: (coach_tone) => {
        set({ coach_tone });
        debouncedSync(get().syncPreferences);
      },

      setDigestEnabled: (digest_enabled) => {
        set({ digest_enabled });
        debouncedSync(get().syncPreferences);
      },

      setDigestFrequency: (digest_frequency) => {
        set({ digest_frequency });
        debouncedSync(get().syncPreferences);
      },

      setShowStreaks: (show_streaks) => {
        set({ show_streaks });
        debouncedSync(get().syncPreferences);
      },

      // Sync all preferences to Supabase as JSONB
      syncPreferences: async () => {
        if (!supabase.isSupabaseConfigured()) return;
        const state = get();
        try {
          await supabase.saveUserPreferences({
            display_name: state.display_name,
            default_tab: state.default_tab,
            accent_color: state.accent_color,
            font_size: state.font_size,
            coach_tone: state.coach_tone,
            coach_context: state.coach_context,
            digest_enabled: state.digest_enabled,
            digest_frequency: state.digest_frequency,
            show_streaks: state.show_streaks,
            notifications_enabled: state.notifications_enabled,
            week_colors: state.week_colors,
          });
        } catch (error) {
          console.error('Failed to sync preferences to Supabase:', error);
        }
      },

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          if (supabase.isSupabaseConfigured()) {
            try {
              const userSettings = await supabase.fetchUserSettings();
              if (userSettings) {
                const updates: Partial<SettingsState> = {};
                if (userSettings.coach_context) updates.coach_context = userSettings.coach_context;
                // Load preferences JSONB
                const prefs = userSettings.preferences as Record<string, unknown> | undefined;
                if (prefs) {
                  if (prefs.display_name) updates.display_name = prefs.display_name as string;
                  if (prefs.default_tab !== undefined) updates.default_tab = prefs.default_tab as number;
                  if (prefs.accent_color) updates.accent_color = prefs.accent_color as string;
                  if (prefs.font_size) updates.font_size = prefs.font_size as FontSize;
                  if (prefs.coach_tone) updates.coach_tone = prefs.coach_tone as CoachTone;
                  if (prefs.coach_context) updates.coach_context = prefs.coach_context as string;
                  if (prefs.digest_enabled !== undefined) updates.digest_enabled = prefs.digest_enabled as boolean;
                  if (prefs.digest_frequency) updates.digest_frequency = prefs.digest_frequency as DigestFrequency;
                  if (prefs.show_streaks !== undefined) updates.show_streaks = prefs.show_streaks as boolean;
                  if (prefs.notifications_enabled !== undefined) updates.notifications_enabled = prefs.notifications_enabled as boolean;
                  if (prefs.week_colors) updates.week_colors = prefs.week_colors as Record<string, string>;
                }
                set({ ...updates, isLoading: false });

                // Apply visual settings
                if (updates.accent_color) {
                  document.documentElement.style.setProperty('--accent-color', updates.accent_color);
                }
                if (updates.font_size) {
                  document.documentElement.setAttribute('data-font-size', updates.font_size);
                }
                return;
              }
            } catch (e) {
              console.warn('Could not fetch settings from Supabase:', e);
            }
          }
          set({ isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      saveSettings: async () => {
        try {
          await get().syncPreferences();
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
        display_name: state.display_name,
        default_tab: state.default_tab,
        accent_color: state.accent_color,
        font_size: state.font_size,
        coach_tone: state.coach_tone,
        digest_enabled: state.digest_enabled,
        digest_frequency: state.digest_frequency,
        show_streaks: state.show_streaks,
      }),
    }
  )
);
