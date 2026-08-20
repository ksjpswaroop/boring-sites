export const brand = {
  name: 'LexJolt',
  domain: 'lexjolt.com',
  origin: 'https://lexjolt.com',
  email: 'hello@lexjolt.com',
  tagline: 'Find it. Learn it. Play it.',
  description: 'Free word tools and games. No signup. No paywall.',
  heroDescription:
    'Unscramble letters, discover every possible word, learn what words mean, and challenge yourself with fast word games.',
  nav: [
    { label: 'Unscrambler', shortLabel: 'Unscramble', href: '/word-unscrambler', icon: 'tiles' },
    { label: 'Word Finder', shortLabel: 'Find', href: '/word-finder', icon: 'search' },
    { label: 'Anagram Rush', shortLabel: 'Rush', href: '/anagram-rush', icon: 'timer' },
    { label: 'Daily Jolt', shortLabel: 'Daily', href: '/daily', icon: 'calendar' },
  ],
  colors: {
    blue50: '#EEF7FF',
    blue100: '#D7EBFF',
    blue200: '#B8DCFF',
    blue500: '#0A66C2',
    blue600: '#0A5CAD',
    blue700: '#004F91',
    blue800: '#004182',
    canvas: '#F3F6F8',
    surface: '#FFFFFF',
    textPrimary: '#191919',
    textSecondary: '#5E5E5E',
    textMuted: '#737373',
    border: '#D9E0E6',
    success: '#057642',
    warning: '#915907',
    error: '#B24020',
  },
} as const;

export type BrandNavItem = (typeof brand.nav)[number];

