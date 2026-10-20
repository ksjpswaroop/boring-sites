import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Canonicals and the sitemap are built from this, so it must be the domain the site is actually
  // served from. The default is the brand domain; override per deployment with PUBLIC_SITE_URL
  // (Vercel preview builds, a subdomain, or a rename) instead of editing code.
  site: process.env.PUBLIC_SITE_URL ?? 'https://lexjolt.com',
  output: 'static',
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
