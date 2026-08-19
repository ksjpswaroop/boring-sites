# Strategy — Boring Sites Portfolio

The business model, selection criteria, and the keyword-to-launch pipeline.

## The model in one paragraph

Build small, single-purpose web tools that answer one high-intent search query. Show Google Display Ads. Earn per impression (RPM), not per click. No content marketing, no social, no product, no brand required. The tool *is* the product.

```
Monthly page views ÷ 1000 × RPM = Monthly revenue
55,000,000 ÷ 1000 × $9 = ~$495K/mo
```

## Selection criteria (must all be true)

| # | Criterion | Threshold |
|---|-----------|-----------|
| 1 | Search volume | 10K+ monthly searches for the seed |
| 2 | Keyword difficulty | < 10/100 in Clearscope / Ahrefs |
| 3 | New sites ranking | Page 1 of Google has low-DA sites (SERP shows blue-highlighted low-trustworthiness results) |
| 4 | Web-app solvable | The query is a tool/calc/gen job, not a how-to article |

## Keyword research workflow

1. Pick a **seed suffix** — `calculator`, `generator`, `converter`, `tracker`, `estimator`, `finder`
2. Run it through Clearscope (or Ahrefs / SEMrush / Ubersuggest)
3. Set max difficulty to 10/100
4. Sort by difficulty ascending
5. Filter for web-app queries
6. Inspect Google page 1 for each candidate — confirm new sites rank
7. Prioritize candidates with 10K+ monthly searches

## Build workflow (Astro + Tailwind on Vercel)

Hand-code using the boring-sites stack. See [`tech-stack.md`](./tech-stack.md) for the full picks and per-project specifics.

1. Scaffold the site from the shared monorepo template (or copy `dragonborn-name-generator` as the reference implementation)
2. Build the tool in TypeScript with a tiny Astro island for interactivity
3. Add About / How-to / FAQ / related tools
4. Add Privacy / Terms / Cookies / Contact (use the shared `packages/legal/` boilerplate)
5. Connect a real domain via Cloudflare Registrar (~$12/yr) — never publish on a temp subdomain
6. Deploy to Vercel (auto on push to main)
7. Apply to AdSense, install the verification snippet, request review
8. (Optional) Open-source the front-end on GitHub — differentiator for whatismyip, helps SEO for the rest

> **Why we hand-code, not Horizons:** see [`tech-stack.md`](./tech-stack.md) § "Build vs no-code". TL;DR — we get per-input SEO pages, an open-sourceable whatismyip front-end, and full control of every byte. ~1–3 days per site instead of 15 minutes.

## Risks

- **AdSense rejection** for thin single-page sites → mitigate with legal pages + 2–3 related tools + ~300–500 words of explanation
- **Algorithm shifts** → mitigate with a portfolio (one dip doesn't kill income)
- **RPM volatility** ($3–$12 range) → base projections on $5–$7, not $9
- **Niche crowding** → move fast, target underserved niches, build first-mover authority

## Source material

- `../research/transcripts/yt_transcript_nQOGK72IHx8.txt` — full 572-segment transcript
- `../research/summaries/YouTube_Summary_Boring_Website_6M.md` — structured summary with implementation guide

## Competitive play

- See [`stand-out.md`](./stand-out.md) — how each site in the portfolio beats its incumbent, and the portfolio-level moat that none of the incumbents can replicate.

## Technical stack

- See [`tech-stack.md`](./tech-stack.md) — the implementation stack: Astro + TypeScript + Tailwind on **Vercel**, Plausible analytics, GitHub Actions. Captures the picks, per-project twists, Vercel-specific config (incl. turning off Vercel Web Analytics for whatismyip's no-logs claim), cost estimate, and build order.

## Deployment

- See [`../DEPLOY.md`](../DEPLOY.md) — the full deploy walkthrough: git init, GitHub, Vercel per-site setup, Cloudflare Registrar + DNS, Plausible env vars, AdSense, Google Search Console, per-site launch checklist, and a recommended go-live order.
