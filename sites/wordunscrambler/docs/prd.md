# PRD — Word Unscrambler

**Project:** `sites/wordunscrambler`
**Source:** Jonathan's Jam `nQOGK72IHx8` — main case study
**Benchmark revenue:** ~$500K/mo (top of market) · $20–$200/mo realistic Y1
**Owner:** TBD
**Status:** 🔲 not started

---

## 1. Overview

A single-purpose web tool that takes a jumble of letters and returns all valid English words that can be formed from them. No login, no fluff, fast. The reference site (`wordunscrambler.me`) earns ~$500K/mo; the clone the video walks through picks the domain `wordunscrambled.com`.

## 2. Problem & users

Word-game players (Scrabble, Words With Friends, anagram puzzles) get stuck mid-game, can't see the words hiding in their rack, and search Google for a solver. Crossword puzzlers, ESL learners, and teachers run similar queries.

**Primary users:** Scrabble / WWF players, anagram puzzlers, ESL learners, teachers building word games.
**Not for:** etymology researchers (they want a corpus, not a solver).

## 3. Goals & success metrics

| Metric              | 3-month target | 12-month target |
| ------------------- | -------------- | --------------- |
| Monthly visitors    | 500            | 10K             |
| AdSense approval    | Yes            | —               |
| Monthly revenue     | $5–$50         | $50–$500        |
| Bounce rate         | < 60%          | < 50%           |
| Pages / session     | 3+             | 4+              |
| Avg. session        | 30s+           | 45s+            |

## 4. Non-goals (V1)

- Account system / saved lists across devices
- Multi-language (English only V1)
- Native mobile app for the web V1. This is superseded for the Apple product by [`apple-app-roadmap.md`](./apple-app-roadmap.md).
- Direct Scrabble / WWF integration
- User-generated content or comments
- Premium tier

## 5. User stories

1. As a Scrabble player, I want to type my 7 tiles and see all valid words in < 1s so I can pick the best one mid-game.
2. As a casual user, I want word length next to each result so I can prioritize longer words.
3. As a phone user, I want the input to be big and results readable without zooming.
4. As a deep-searcher, I want to filter by min length and "must contain letter X".
5. As a writer, I want to click a word and see its definition.
6. As a sharer, I want a URL I can text a friend that re-runs the same scramble.
7. As a returner, I want my last 10 scrambles remembered in the browser.

## 6. Differentiation

What beats `wordunscrambler.me` (and the other long-tail unscramblers that have copied it):

1. **Real-time solve as you type** — debounce the input, show results live. Incumbent is click-to-submit. *(Features F1, F3)*
2. **Inline definitions on click** — tap a word, see its meaning. wordunscrambler.me has zero definitions. *(Feature F10)*
3. **Scrabble tile-score badges** — official NA tile values per word. Shows competitive value the incumbent ignores. *(Feature F9)*
4. **Per-letter SEO landing pages** — `/unscramble/aetprs`, `/unscramble/retina`, etc. Captures millions of long-tail "unscramble X" queries the incumbent has no pages for. *(Feature F11)*
5. **"Did you mean" with semantic awareness** — if the input returns no results, suggest near-misses using letter-distance heuristics. Incumbent returns an empty list. *(Feature F13)*
6. **Open solver API** — `POST /api/solve?letters=aetprs` for developers. Adoption = GitHub stars + backlinks. *(V2)*
7. **Multi-language word lists** — Spanish, French, German. Incumbent is English-only. TAM 3–5x. *(V2)*
8. **Portfolio cross-linking** — every footer links to "Other Boring Tools" → unscramble helps rank sleep-calculator and the rest. *(Portfolio moat — see `../../../strategy/stand-out.md`.)*

## 7. Functional scope (high level)

- Letter input (auto-uppercase, dedupe count, max 15 chars)
- Unscramble engine (permutations + ENABLE word list)
- Result list with metadata (length, Scrabble score, definition)
- Filters (min length, must-contain)
- Sort modes (alpha, length desc, score desc)
- Copy per word / copy all
- Per-input landing pages for long-tail SEO

Full spec: see [`features.md`](./features.md).

## 8. Non-functional requirements

- Time to first result: **< 200ms** for 7-letter input
- Lighthouse: 95+ on all four axes (perf, a11y, best-practices, SEO)
- Mobile-first responsive
- Basic form works without JS (progressive enhancement)
- Word list ships in the bundle — no runtime word-API dependency

## 9. Monetization

- **Google AdSense:** header, sidebar, in-list, footer
- **Open-source the front-end on GitHub** — differentiator for whatismyip, helps SEO for the rest
- **Affiliate (V2):** Amazon "Scrabble dictionary" book links

## 10. Compliance & legal

- Word list: public-domain `enable.txt` (or `words_alpha.txt` from dwyl/english-words) — CC0 / public domain
- Privacy: no user input stored or logged server-side
- No cookies; cookieless analytics (Plausible / Umami)
- Pages: Privacy, Terms, About, Contact

## 11. Open questions

1. ~~Host on Hostinger Horizons or self-host?~~ — **Decided 2026-08-18:** hand-code on the boring-sites stack (Astro + Vercel). See [`../../../strategy/tech-stack.md`](../../../strategy/tech-stack.md) § "Build vs no-code".
2. Embedded definition vs hyperlink to dictionary.com? (Embedded = longer dwell = higher RPM; outbound = SEO risk if too many.)
3. Ship per-word landing pages (e.g. `/unscramble/aetprs`) for long-tail SEO? (High upside, lots of pages.)
4. Scrabble score: official NA tile values or just letter length?

## 12. Launch criteria

- [ ] All P0 features shipped (see `features.md`)
- [ ] AdSense approved
- [ ] Real domain connected (never publish on a temp subdomain — hurts SEO)
- [ ] 4 legal pages live
- [ ] Submitted to Google Search Console with sitemap
- [ ] First page indexed within 14 days
- [ ] Zero console errors / 4xx/5xx
