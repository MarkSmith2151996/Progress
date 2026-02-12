import allThemes from 'react95/dist/themes';

export type React95ThemeName = keyof typeof allThemes;

export interface ThemeOption {
  name: React95ThemeName;
  label: string;
}

export const CURATED_THEMES: ThemeOption[] = [
  // Classic
  { name: 'original', label: 'Original' },
  { name: 'ash', label: 'Ash' },
  { name: 'shelbiTeal', label: 'Teal' },
  { name: 'white', label: 'White' },
  { name: 'millenium', label: 'Millenium' },
  // Dark
  { name: 'modernDark', label: 'Dark' },
  { name: 'tokyoDark', label: 'Tokyo' },
  { name: 'matrix', label: 'Matrix' },
  { name: 'solarizedDark', label: 'Solarized' },
  { name: 'violetDark', label: 'Violet' },
  { name: 'vistaesqueMidnight', label: 'Midnight' },
  // Colorful
  { name: 'candy', label: 'Candy' },
  { name: 'vaporTeal', label: 'Vapor' },
  { name: 'cherry', label: 'Cherry' },
  { name: 'azureOrange', label: 'Azure' },
  { name: 'hotdogStand', label: 'Hotdog' },
  { name: 'raspberry', label: 'Raspberry' },
  // Muted
  { name: 'coldGray', label: 'Gray' },
  { name: 'olive', label: 'Olive' },
  { name: 'rainyDay', label: 'Rainy' },
];

export function getThemeByName(name: string) {
  return allThemes[name as React95ThemeName] || allThemes.original;
}

export function deriveAccentColor(theme: ReturnType<typeof getThemeByName>): string {
  return theme.desktopBackground;
}
