# LexJolt

Free real-estate calculators, a measured niche finder, and a video per calculator. Static Astro
output: no server, no database, no accounts. Every number on the site is computed in the browser by
the same TypeScript engine the gates grade.

```
src/lib/cre/          the calculator engine (72 calculators, ported from a Python reference)
src/lib/niches.ts     the niche scorer (six weighted dimensions, rules from data/niche-rules.yaml)
src/lib/ideas.ts      the idea generator (every idea names its calculator or niche)
src/pages/            /calculators, /niches, /ideas, /videos, legal pages
tools/                exporters, video renderer, and the two gates
```

## The three data pipelines

All three write into `src/data/`, and all three are deterministic: re-run them on unchanged inputs and
the JSON is byte-identical, so a diff means something actually changed.

```bash
pnpm data     # 1. calc-golden.json (golden vectors) + niches.json (measured niches)
pnpm videos   # 2. manifests + one 1080x1920 MP4 per calculator -> public/videos/
```

1. **Golden vectors.** `tools/export_from_engine.py` runs each calculator at three deterministic input
   sets through the Python engine and records the answer. `tools/parity.mjs` replays them through the
   TypeScript port and fails on any difference beyond 1e-9. This is why a formula edit cannot ship
   silently.
2. **Niche measurements.** `tools/export_niches.py` reads the scan output, applies
   `data/niche-rules.yaml`, and writes the numbers *and* the editorial verdicts into `src/data/niches.json`.
   The page-side scorer (`src/lib/niches.ts`) must reproduce the scan's scores exactly — the gate
   checks all ten.
3. **Videos.** `tools/make_calc_videos.py` builds a five-scene manifest per calculator (hook, formula,
   inputs, answer, call to action), times each narration with `say`, trims the script until the
   measured spoken time fits under 30 seconds, then renders via
   `~/projects/1019-faceless-network/src/assemble_reel.py`. A per-manifest SHA-1 stamps the output, so
   re-running re-renders only what changed.

## The gates

```bash
pnpm build     # static build; fails on a broken page or a missing calculator route
pnpm verify    # seven checks: parity, defaults, pages, printed answers, niche scores, videos, ideas
pnpm smoke     # real Chromium over CDP: types in a calculator, reads the answer, checks every page
pnpm gate      # all three, in order
```

`pnpm smoke` needs a running server (`pnpm dev`, port 3000) and Google Chrome installed. It asserts
behaviour, not markup: it changes an input and requires the number on screen to move, and it requires
the capital-gains page to headline the *total* tax rather than the first key in the breakdown.

## Deploy

Vercel project with **Root Directory = `sites/lexjolt`**, build `pnpm build`, output `dist`. Then:

| Setting | Value |
|---|---|
| Domain | `lexjolt.com` (set in `astro.config.mjs`) |
| Env | `PUBLIC_PLAUSIBLE_DOMAIN=lexjolt.com`, `PUBLIC_PLAUSIBLE_SRC=https://plausible.io` |
| Vercel Web Analytics | **off** — the site claims cookieless analytics, so the cookie-less Plausible counter is the only one allowed |

Build output is ~95 pages plus ~61 MB of video. Videos are static files under `/videos/`, served by
the CDN; nothing streams through a function, so there is no bandwidth bill beyond static hosting.

## Things that are deliberately not here

- No signup, no email capture, no paywall: the legal pages say the tools are free and carry no
  advice, and a gate that requires an account would contradict them.
- No client-side analytics beyond the env-gated Plausible counter.
- No server routes: the calculators are pure functions of their inputs, so there is nothing to keep
  in sync between a server render and a client recompute.
