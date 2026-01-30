'use client';

import { ThemeProvider } from 'styled-components';
import original from 'react95/dist/themes/original';
import { styleReset } from 'react95';
import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
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
    background: ${original.desktopBackground};
    min-height: 100vh;
    margin: 0;
    padding: 0;
  }
`;

interface React95ProviderProps {
  children: React.ReactNode;
}

export function React95Provider({ children }: React95ProviderProps) {
  return (
    <ThemeProvider theme={original}>
      <GlobalStyles />
      {children}
    </ThemeProvider>
  );
}
