import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://wordunscrambler.example.com',
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
