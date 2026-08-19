# @boring-sites/design

Shared design system for the boring-sites portfolio. Used by every site in `sites/`.

## What's here

- `src/tokens.ts` — design tokens (colors, type, spacing, radii, shadows) — imported by Tailwind config
- `src/styles.css` — Tailwind base + component classes (`btn`, `card`, `container-prose`, etc.)
- `src/Layout.astro` — base layout (HTML head, meta, OG, JSON-LD, Header, Footer, theme)
- `src/Header.astro` — site header with nav and dark-mode toggle
- `src/Footer.astro` — site footer with portfolio cross-links
- `src/JsonLd.astro` — schema.org structured data component

## How sites consume it

Each site imports the Layout directly:

```astro
---
import Layout from '@boring-sites/design/Layout.astro';
---
<Layout
  title="Dragonborn Name Generator"
  description="Generate 10 random Dragonborn names at a time."
  siteName="Dragonborn Names"
>
  <!-- page content -->
</Layout>
```

Tailwind config in each site references the tokens:

```js
// sites/<site>/tailwind.config.mjs
import { tokens } from '@boring-sites/design/tokens';
export default {
  theme: { extend: { ... } },
  // ...
};
```

## Why this lives in `packages/`

It's the portfolio moat. Every site looks like one family because they share this layer. Update a token here, every site reflects the change. That's the design-system leverage that individual boring sites (calculator.net, whatismyip.com) can't replicate.
