import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// whatismyip is the trust play for the portfolio — the no-logs claim
// is non-negotiable. SSR/Edge mode is required so the IP is detected
// server-side at request time (no JS required for accessibility).
// See ../../../strategy/tech-stack.md for the rationale.

export default defineConfig({
  site: 'https://whatismyip.example.com',
  output: 'hybrid',
  adapter: vercel({
    edgeMiddleware: false,
    imageService: false,
  }),
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap(),
  ],
  vite: {
    resolve: {
      alias: {
        '@boring-sites/design': new URL('../../packages/design/src', import.meta.url).pathname,
        '@boring-sites/legal': new URL('../../packages/legal/src', import.meta.url).pathname,
        '@boring-sites/analytics': new URL('../../packages/analytics/src', import.meta.url).pathname,
      },
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
