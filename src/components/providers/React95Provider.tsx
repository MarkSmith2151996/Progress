'use client';

import { useMemo, useEffect } from 'react';
import { ThemeProvider } from 'styled-components';
import { styleReset } from 'react95';
import { createGlobalStyle } from 'styled-components';
import { useSettingsStore } from '@/stores/settingsStore';
import { getThemeByName, deriveAccentColor } from '@/lib/themes';

const GlobalStyles = createGlobalStyle<{ $bgColor: string }>`
  ${styleReset}
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('/fonts/ms_sans_serif.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'ms_sans_serif';
    src: url('/fonts/ms_sans_serif_bold.woff2') format('woff2');
    font-weight: bold;
    font-style: normal;
  }
  body, input, select, textarea {
    font-family: 'ms_sans_serif', sans-serif;
  }
  body {
    background: ${props => props.$bgColor};
    min-height: 100vh;
    margin: 0;
    padding: 0;
  }
`;

interface React95ProviderProps {
  children: React.ReactNode;
}

export function React95Provider({ children }: React95ProviderProps) {
  const react95_theme = useSettingsStore((s) => s.react95_theme);

  const theme = useMemo(() => getThemeByName(react95_theme), [react95_theme]);

  useEffect(() => {
    const accentColor = deriveAccentColor(theme);
    document.documentElement.style.setProperty('--accent-color', accentColor);
  }, [theme]);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles $bgColor={theme.desktopBackground} />
      {children}
    </ThemeProvider>
  );
}
