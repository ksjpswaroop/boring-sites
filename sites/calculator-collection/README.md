# calculator-collection

**Benchmark revenue:** ~$825K/month
**Reference:** `calculator.net` — a portfolio of 100+ calculator tools on one domain

## What it does

Hosts a **collection of independent calculator tools** (mortgage, BMI, tip, age, percentage, GPA, calorie, loan, tax, retirement, etc.) on a single domain, each page ranking for its own query and showing its own ads.

## Target keywords (seed list of calculator suffixes)

- mortgage calculator
- BMI calculator
- tip calculator
- age calculator
- percentage calculator
- GPA calculator
- calorie calculator
- loan calculator
- tax calculator
- retirement calculator
- date calculator / time calculator
- word counter

## Build plan

- [ ] Pick domain (`calculatorhub.com`, `quickcalculator.app`, etc.)
- [ ] Design a shared layout (header / footer / sidebar with related tools) — keep it consistent across all 100+ pages
- [ ] Build the first 10 calculators with the boring-sites stack (Astro + Tailwind on Vercel) — see [tech-stack](../../strategy/tech-stack.md)
- [ ] Add About, How-to, FAQ per calculator
- [ ] Cross-link calculators from each page ("Related tools" sidebar)
- [ ] Add legal pages
- [ ] Apply for AdSense — multi-tool domains have higher approval odds than single-page tools
- [ ] Submit sitemap to Google Search Console
- [ ] Ship 5–10 new calculators/week; aim for 30+ before monetizing seriously

## Notes

This is the **portfolio-of-tools-on-one-domain** play. It's slower to launch (need many tools) but the compounder: each new tool is a new entry point for organic traffic and a new ad unit. The DOMAIN compounds authority over time, not the individual tools.

---

## Development

This is the **compounder** in the boring-sites portfolio. 20 calculators on one domain, all powered by a single generic `Calculator.astro` component. Adding a new calculator is a 5-minute registry edit.

### Run locally

```bash
# From the repo root
pnpm install
pnpm --filter calculator-collection dev

# Open http://localhost:4321
```

### The architecture: one component, 20 calculators

```
calculator-collection/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Home — all 20 calculators, grouped by category
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── privacy.astro
│   │   ├── terms.astro
│   │   ├── faq.astro
│   │   └── calc/
│   │       └── [slug].astro     # Dynamic route — renders ANY of the 20 calculators
│   ├── components/
│   │   ├── Calculator.astro     # ⭐ Generic form + result + URL state — handles all 20
│   │   ├── RelatedCalculators.astro  # Sidebar — pulls from registry
│   │   └── Disclaimer.astro
│   ├── data/
│   │   └── calculators.ts       # ⭐ Single source of truth for all 20 configs
│   ├── lib/
│   │   ├── calc.ts              # ⭐ 20 pure compute functions in one file
│   │   ├── format.ts            # Currency, percent, number formatters
│   │   └── url-state.ts         # Encode/decode inputs in URL
│   └── env.d.ts
├── public/
├── astro.config.mjs             # static output
├── tailwind.config.mjs
├── vercel.json
├── tsconfig.json
└── package.json
```

### The data flow

1. **`src/data/calculators.ts`** holds the registry — every calculator's metadata, inputs, compute function, related slugs, how-it-works content, disclaimer
2. **`src/pages/calc/[slug].astro`** is one dynamic route. `getStaticPaths()` returns all 20 slugs; at build time Astro generates one HTML file per calculator
3. **`src/components/Calculator.astro`** is the generic UI. It receives a `Calculator` config, renders the form, handles URL state, runs the compute function client-side
4. **`src/lib/calc.ts`** holds the 20 pure compute functions. The client-side script does `import('/src/lib/calc.ts')` and picks the right one by slug

### Adding a new calculator

5-minute change:

1. Add a new compute function to `src/lib/calc.ts`
2. Add a new entry to the `calculators` array in `src/data/calculators.ts` with the slug, title, inputs (form field definitions), related slugs, and how-it-works content
3. The dynamic route picks it up automatically. The home page lists it. The sitemap includes it.

That's it. No new page file. No new component.

### What the URL state does

Every input is encoded in the query string. Bookmark or share a URL like:
```
https://calculator.example.com/calc/mortgage?principal=350000&rate=6.75&years=30
```

The page restores the inputs from the URL on load. Useful for sharing results with a partner, advisor, or forum.

### V1.1 backlog

- **Chart.js integration** for amortization, compound interest, retirement projections (dep is already in package.json)
- **Embeddable widgets** (`<iframe src="https://calculator.example.com/embed/mortgage?...">`)
- **Real-time data feeds** (mortgage rates from FRED API, inflation from BLS API)
- **Per-calculator "how it's calculated" pages** at `/how-it-works/<slug>` (200-400 words each)
- **i18n** (Spanish, French, Portuguese — calculator.net is English-only)
- **PDF export** of amortization schedules

See `../docs/prd.md` for the full launch criteria and `../docs/features.md` for the complete feature spec.
