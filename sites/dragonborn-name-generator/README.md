# dragonborn-name-generator

**Benchmark revenue:** TBD (new build)
**Source:** Clearscope opportunity cited in the video — "dragonborn name generator" had low difficulty AND new sites ranking on page 1

## What it does

Generates fantasy character names in the Dragonborn / D&D / Skyrim style. Pure fun tool, but evergreen niche because fantasy naming never goes out of style.

## Target keywords (seed)

- dragonborn name generator
- d&d name generator
- skyrim name generator
- fantasy name generator
- dnd character name generator
- tiefling name generator
- elven name generator

## Build plan

- [ ] Validate the Clearscope signal is still good
- [ ] Pick domain (e.g., `dragonbornnames.com`, `dndnamegen.com`, `fantasynamegen.app`)
- [ ] Build with the boring-sites stack (Astro + Tailwind on Vercel) — race picker (Dragonborn / Elf / Dwarf / Tiefling / Halfling), gender picker, click-to-generate, copy button. See [tech-stack](../../strategy/tech-stack.md)
- [ ] Add About, How-to, FAQ, lore page
- [ ] Add related tools: town name generator, quest name generator, magic item generator, NPC generator
- [ ] Add legal pages (D&D / Wizards of the Coast IP — keep names transformative and non-infringing; add a "fan-made, not affiliated" disclaimer)
- [ ] Apply for AdSense, install snippet, request review
- [ ] Submit to Google Search Console

## Notes

Niche is seasonal: spikes around new D&D book releases, Baldur's Gate / Skyrim patches, and the back-to-school RPG crowd. Fun to build, easy to expand, and a good low-stakes first project to learn the loop.

---

## Development

This is the **reference implementation** for the boring-sites portfolio. The other 5 sites clone this structure.

### Run locally

```bash
# From the repo root
pnpm install
pnpm dev

# Or just this site
pnpm --filter dragonborn-name-generator dev

# Open http://localhost:4321
```

### Project layout

```
dragonborn-name-generator/
├── src/
│   ├── pages/         # Routes (index, about, contact, privacy, terms, faq, races/*)
│   ├── components/    # Generator, Disclaimer (reusable UI)
│   ├── data/          # Name pools (JSON) — 6 races × 3 genders
│   ├── lib/           # generator.ts, storage.ts (TS modules)
│   ├── env.d.ts
│   └── styles.css     # imported by the shared Layout
├── public/            # favicon, robots.txt
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── vercel.json
└── package.json
```

### Shared packages

This site consumes three workspace packages from `packages/`:

- `@boring-sites/design` — Layout, Header, Footer, JsonLd, design tokens
- `@boring-sites/legal` — Privacy, Terms, Disclaimer, Contact page components
- `@boring-sites/analytics` — Plausible include

The aliases in `astro.config.mjs` and `tsconfig.json` point to the local package source so changes propagate immediately.

### Build & deploy

```bash
# Build static output to dist/
pnpm build

# Preview the production build
pnpm preview

# Deploy to Vercel
# (one-time: vercel link, set the domain)
vercel --prod
```

### Adding a new race

1. Add a new file `src/data/<race>.json` matching the `NamePool` shape (see `src/lib/generator.ts`)
2. Add the import + entry to the `pools` object in `src/pages/index.astro` and each race page
3. Add a new page `src/pages/races/<race>.astro` (copy `dragonborn.astro` and adjust)
4. Update the footer link in `packages/design/src/Footer.astro` if this is now one of the 6 sites

### Adding to the name pool

Edit the relevant `src/data/<race>.json` file and add names to the `pools.<gender>` array. Aim for 100+ per (race, gender) for V1; the scaffold ships with 30–50 per pool as a starter.

See `../docs/prd.md` for the launch criteria and `../docs/features.md` for the full feature spec.
