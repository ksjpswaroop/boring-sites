# Stand Out — The Competitive Play

> How each site in the portfolio beats its incumbent, and the portfolio-level moat that none of the incumbents can replicate.

## TL;DR

The incumbents' moat is **SEO history + aged domain + years of backlinks**. You can't beat that in 6 months. But you can beat them on **everything else** — and "everything else" is what the new entrant gets judged on.

**Match them on primary-keyword ranking (slow). Outdo them on every axis that doesn't require a decade of compounding.**

---

## The five differentiator themes

### 1. Design & polish (cheap, high-impact)
- Mobile-first beautiful UI
- Dark mode by default
- Real-time results as you type

### 2. AI-native features (incumbents can't add easily)
- Inline definitions on click (unscrambler)
- "Did you mean" with semantic awareness
- Smart VPN / proxy / datacenter-IP detection (whatismyip)
- AI-generated lore snippets (name generator)

### 3. Trust & privacy (real moat for whatismyip; brand-builder for the rest)
- Open-source the front-end
- No-logs daily proof (whatismyip)
- Cookieless analytics only
- Prominent, tasteful disclaimers

### 4. SEO depth & content moat (multiplies traffic over time)
- Per-input landing pages for long-tail
- "How is this calculated?" educational panels (200–400 words)
- i18n from day 1 (English + Spanish + Portuguese + French)
- Rich schema markup (`WebApplication` + `FAQPage` + `HowTo`)

### 5. Distribution & ecosystem (the compounder)
- Embeddable widgets (calculator-collection especially)
- Open API for developers
- Cross-tool portfolio linking (every site links the others)
- Shared brand & design system across all 6 sites

---

## The portfolio-level moat — the one thing nothing else has

**One brand, one design system, six tools, cross-linked.** This is the compounder that calculator.net, whatismyip.com, and wordunscrambler.me individually cannot do. They are single-domain businesses. You are a portfolio business. Every new tool you ship lifts the others.

Concretely:

- **Shared `design.tokens.json`** — all 6 sites look like one family
- **Shared `legal/` package** — Privacy / Terms / Disclaimers are one source
- **Shared `analytics/` config** — cookieless analytics are uniform
- **Every footer** links to "Other tools by [you]" → the portfolio compounds
- **Cross-tool "related" links** in every sidebar — unscramble ↔ sleep ↔ whatismyip ↔ calculators ↔ phone-gen ↔ name-gen

Each individual site is a feature; the portfolio is the product.

---

## Per-site differentiator matrix

| Site                       | Top 3 differentiators vs incumbent |
|----------------------------|------------------------------------|
| wordunscrambler            | Real-time solve · Inline definitions · Per-letter SEO pages |
| sleep-calculator           | Bidirectional in one page · "Set alarm" deep link · Installable PWA |
| whatismyip                 | Open-source front-end · No-logs daily proof · DNS + WebRTC leak tests |
| calculator-collection      | Embeddable widgets · Per-calculator landing pages · Real-time data feeds |
| phone-number-generator     | Trust banner as hero · Real area codes · E.164 format toggle |
| dragonborn-name-generator  | Beautiful UI · Pronunciation hints · Ecosystem of related generators |

(Per-site full differentiator list lives in each project's `docs/prd.md` § 6.)

---

## What we give up (on purpose)

We do NOT compete on:

- **Aged-domain authority.** Accept that month-1 traffic will be tiny. Plan for a 6–12 month SEO ramp.
- **Backlink count.** Plan to earn them via embeddable widgets, open API, open-source front-end, and good content.
- **Ad layout history.** AdSense RPM takes 3–6 months to mature. Plan finances accordingly.
- **Tool breadth.** calculator.net has 100 calculators; we ship 30 but all polished. Quality > quantity at launch.

---

## Implementation order (recommended)

1. **Build the design system first.** `design.tokens.json`, shared `legal/` boilerplate, shared `analytics/`. This unlocks all 6 sites.
2. **Build the trust site first.** `whatismyip` is the highest-stakes differentiator (no-logs, open source) and gets the most press if you do it well. Use it to set the bar.
3. **Build the compounder second.** `calculator-collection` has the highest long-term ceiling (30+ tools on one domain) and benefits most from the design system being in place.
4. **Build the fun sites last.** `dragonborn-name-generator` and `phone-number-generator` are good for learning the loop, but they earn less. Use them as practice, then ship the others with the lessons learned.
5. **i18n + embeddable widgets + open API** are V1.1 priorities across the board — they compound the hardest.

---

## Tracking differentiator execution

Each PRD has a "Differentiation" section (§ 6) that lists 4–10 specific differentiators tied to features in `features.md`. Treat that list as a checklist for that site.

| Site | Differentiators | Highest-leverage one |
|------|-----------------|---------------------|
| wordunscrambler            | 8 | Per-letter SEO landing pages |
| sleep-calculator           | 8 | "Set alarm" deep link |
| whatismyip                 | 8 | No-logs daily proof |
| calculator-collection      | 10 | Embeddable widgets |
| phone-number-generator     | 8 | Trust banner as hero |
| dragonborn-name-generator  | 9 | Ecosystem of related generators |

The "portfolio moat" is item 8 (or 9 / 10) on every list — the cross-linking that compounds across all sites.
