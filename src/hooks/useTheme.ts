'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

const THEMES = [
  'terminal-classic',
  'cyberpunk',
  'synthwave',
  'obsidian',
  'scandinavian',
  'paper-notebook',
] as const;

export type ThemeName = typeof THEMES[number];

export function useTheme() {
  const { theme, setTheme } = useSettingsStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return {
    theme: theme as ThemeName,
    setTheme,
    availableThemes: THEMES,
  };
}
