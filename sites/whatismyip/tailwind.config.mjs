import { tokens } from '@boring-sites/design/tokens';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    '../../packages/design/src/**/*.{astro,html,js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: tokens.color.primary,
        accent: tokens.color.accent,
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: tokens.font.sans.split(',').map((s) => s.trim().replace(/^"|"$/g, '')),
        mono: tokens.font.mono.split(',').map((s) => s.trim().replace(/^"|"$/g, '')),
      },
      fontSize: tokens.fontSize,
      borderRadius: tokens.radius,
      boxShadow: tokens.shadow,
    },
  },
  plugins: [],
};
