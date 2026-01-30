import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          popup: 'var(--bg-popup)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          warning: 'var(--accent-warning)',
          error: 'var(--accent-error)',
          success: 'var(--accent-success)',
        },
        border: 'var(--border-color)',
      },
      fontFamily: {
        primary: 'var(--font-primary)',
        heading: 'var(--font-heading)',
      },
      borderRadius: {
        theme: 'var(--border-radius)',
      },
      boxShadow: {
        theme: 'var(--shadow)',
        glow: 'var(--glow)',
      },
    },
  },
  plugins: [],
};

export default config;
