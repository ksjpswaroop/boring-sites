export const brand = {
  name: 'LexJolt',
  domain: 'lexjolt.com',
  origin: 'https://lexjolt.com',
  email: 'hello@lexjolt.com',
  tagline: 'Free tools that answer a question with a number.',
  description:
    'Seventy-two real-estate calculators, a measured niche finder, and a video studio. No signup, no paywall, no sales call.',
  heroDescription:
    'Underwrite a deal, find a niche worth entering, and see the video idea for it — all with the arithmetic shown, not asserted.',
  nav: [
    { label: 'Calculators', shortLabel: 'Calc', href: '/calculators', icon: 'tiles' },
    { label: 'Niche Lab', shortLabel: 'Niches', href: '/niches', icon: 'search' },
    { label: 'Ideas', shortLabel: 'Ideas', href: '/ideas', icon: 'timer' },
    { label: 'Videos', shortLabel: 'Videos', href: '/videos', icon: 'calendar' },
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
