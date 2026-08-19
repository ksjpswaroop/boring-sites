# Technical Stack

The implementation stack for the boring-sites portfolio. Captures the picks, the per-project twists, and the reasoning.

**Deployment decision: Vercel** (decided 2026-08-18). See "Why Vercel" below for the trade-off.

---

## TL;DR

| Layer | Pick |
|---|---|
| Framework | **Astro 4.x** (TypeScript) |
| Styling | **Tailwind CSS** |
| Components | Astro components (no React / Vue / Svelte) |
| Hosting | **Vercel** |
| Domain | **Cloudflare Registrar** (at-cost, free WHOIS privacy) |
| Analytics | **Plausible** (Cloud $9/mo for all 6 sites, or self-hosted) |
| Repo | **GitHub** (public — open-source front-ends is a whatismyip differentiator) |
| CI | GitHub Actions → Vercel (auto-deploy on push) |
| Uptime | **UptimeRobot** (free, 50 monitors) |

## Why Vercel

We weighed Vercel vs Cloudflare Pages. The honest trade-off:

| | Vercel | Cloudflare Pages |
|---|---|---|
| DX for Astro | **Best-in-class**; Astro is Vercel-blessed | Works well, slightly less polish |
| Bandwidth at scale | Metered (100 GB/mo on free tier, then $$) | **Free, unlimited** |
| Trust story for whatismyip | Neutral — Vercel Web Analytics logs IPs by default | **Aligned** — CF's whole ethos is privacy |
| DNS leak endpoint | Edge Function | Worker (more native) |
| Preview deploys per PR | **Slick** | Fine, less slick |
| Cold starts | Astro = static = none | Same |

**Decision: Vercel.** The DX and Astro support are worth the bandwidth trade-off. We mitigate the IP-logging concern on whatismyip by **turning off Vercel Web Analytics entirely** and using Plausible for everything across the portfolio.

What we accept by going Vercel (vs Cloudflare):

- **Bandwidth at scale** — pay after 100 GB/mo on free tier (or $20/mo Pro for 1 TB). Cloudflare is unlimited free.
- **Trust story for whatismyip** — Vercel Web Analytics is OFF; we rely on Plausible. Cloudflare's privacy ethos is a stronger narrative anchor.
- **DNS leak endpoint** — Vercel Edge Function works fine. Cloudflare Workers is more native but no real difference at our scale.

What we gain:

- **DX** — best-in-class for Astro
- **Preview deploys per PR** — slicker
- **GitHub integration** — auto-deploy on push is zero-config

## The constraints driving the choice

| Constraint | What it means for the stack |
|---|---|
| AdSense monetization | Lighthouse 95+, fast first paint, ad-light but ad-friendly layout |
| Mobile-first | < 200 KB JS budget, real CSS not framework bloat |
| SEO-critical | Static HTML per page; per-input landing pages must be pre-rendered |
| Solo builder | Low maintenance, no DevOps, no auth |
| Low margin | Infrastructure cost near zero at launch; scaling cost near zero too |
| Portfolio cross-linked | Shared design tokens, shared `legal/`, shared `analytics/` |
| The trust play (whatismyip) | Cookieless analytics only, open-sourceable front-end, no-logs infrastructure |

## Portfolio-level stack (shared by all 6 sites)

| Layer | Pick | Why |
|---|---|---|
| Framework | **Astro 4.x** | Static-first, ships **zero JS by default**, islands of interactivity, perfect for per-page SEO |
| Language | **TypeScript** | Catches bugs in calculator math, unscramble engine, formatters |
| Styling | **Tailwind CSS** | Utility-first, small purged output, fast design system |
| Components | **Astro components** | Minimum JS shipped; one tiny island per interactive bit |
| Fonts | **Self-hosted Inter** | No Google Fonts = better perf + privacy |
| Icons | **Lucide** | Tree-shakeable SVG, no JS |
| Analytics | **Plausible** (Cloud $9/mo, or self-hosted) | Cookieless, GDPR-friendly, no IP storage |
| Sitemap | `@astrojs/sitemap` | Auto-generated at build |
| Schema.org | Shared `<JsonLd>` Astro component | One source for `WebApplication` + `FAQPage` + `HowTo` |
| Hosting | **Vercel** | Best DX for Astro, free tier covers moderate scale |
| Domain | **Cloudflare Registrar** | At-cost, free WHOIS privacy |
| CDN | **Vercel CDN** (built-in) | Fast enough for boring sites; no separate config |
| CI | **GitHub Actions** → Vercel | Auto-deploy on push to main |
| Uptime | **UptimeRobot** (free, 50 monitors) | 6 sites = 6 monitors |
| Error tracking | Plausible custom events (V1); self-hosted Sentry (later) | Not needed V1 |
| Repo | **GitHub** (public) | Open-source front-ends is a whatismyip differentiator |
| Shared packages | `design/` (tokens), `legal/` (boilerplate), `analytics/` (Plausible snippet) | One source, used by all 6 |

## Per-project specifics

| Site | Stack twist | Data / APIs |
|---|---|---|
| **wordunscrambler** | Static + small client island for the unscramble engine | `enable.txt` bundled at build (172K words, ~1.5 MB gzip); `dictionaryapi.dev` for definitions |
| **sleep-calculator** | Astro + `@vite-pwa/astro` for PWA; `@astrojs/i18n` for i18n routing | None (math is trivial) |
| **whatismyip** | Astro SSR via Vercel adapter; IP echo as a Vercel Edge Function | MaxMind GeoLite2 (free, monthly update); DNS leak = a Vercel function returning the requester's IP |
| **calculator-collection** | Astro multi-page (30+ static pages, shared layout) | FRED API (mortgage rates), BLS API (inflation), both free no-key. Charts: Chart.js lazy-loaded |
| **phone-number-generator** | Static + small island for generation | Area-code JSON bundled (US: 300+, CA: 50+, others) |
| **dragonborn-name-generator** | Static + small island for shuffle | Hand-curated name pools JSON (100+ per race) bundled. AI lore snippets (V1.1) via Groq free tier |

## Build vs no-code

The source video recommends Hostinger Horizons. We skip it.

- Vercel + Astro + hand-code gives us **full control** of every byte
- Per-input SEO pages (e.g. `/unscramble/aetprs`, `/wake-up-at-6am`) are trivial at build time
- Open-sourceable front-end is a **whatismyip differentiator** that Horizons can't offer
- The unscramble engine and calculator math are easier in TypeScript than in AI chat

**Trade-off:** ~1–3 days per site instead of 15 minutes. Worth it for the control and the open-source story.

## Vercel-specific config notes

### Vercel Web Analytics — TURNED OFF for the whole portfolio
Vercel Web Analytics stores visitor IPs by default. This **violates whatismyip's no-logs claim** and the cookieless-analytics standard we've set. Disable it for all 6 projects; use Plausible instead.

`Project → Settings → Analytics → disable Web Analytics`. Use Plausible's `<script>` tag in `<head>` instead.

### Vercel Edge Functions (for whatismyip)
- `app/api/ip.ts` → returns `request.headers.get('x-forwarded-for')` (the IP echo endpoint)
- `app/api/dns-leak.ts` → returns the requester's IP from multiple sub-resource fetches
- Both should be Edge Functions for lowest latency
- Set function region to `iad1` (US East) — boring sites are tier-1 traffic

### Vercel free tier limits
- 100 GB bandwidth / month
- 100 GB-hours serverless execution
- 6,000 build minutes / month
- 100 deployments / day

For 6 boring sites at moderate scale, free tier is plenty. If a site goes viral, you'll know — and the Pro plan is $20/mo per team (not per site), with 1 TB bandwidth.

### Vercel + Cloudflare combo (optional, for paranoid scale)
If bandwidth ever gets expensive or you want CF's edge network in front, you can put Cloudflare in front of Vercel:
- Keep Vercel as origin (DX unchanged)
- Cloudflare CDN in front (free, more bandwidth)
- Cloudflare can be configured to not log (preserves trust story)

Not needed at launch. Document for later.

## Cost estimate (all 6 sites at moderate scale)

| Item | Cost |
|---|---|
| Vercel free tier | **$0** (or **$20/mo** for Pro if bandwidth exceeds 100 GB/mo) |
| Cloudflare Registrar (6 domains × ~$12/yr) | **~$72/yr** |
| Plausible Cloud (1 account, all 6 sites) | **$9/mo** (or **$0** if self-hosted on a $5/mo VPS) |
| UptimeRobot | **$0** (free) |
| GitHub | **$0** (public repos) |
| **Total at launch** | **~$10/mo + $72/yr** |

Scale to 1 M visitors/mo across the portfolio: still under $30/mo. AdSense revenue dwarfs infra cost.

## Implementation order

1. **Scaffold the monorepo** — one repo, one `package.json` per site, shared `packages/design`, `packages/legal`, `packages/analytics`. ~half a day.
2. **Build `dragonborn-name-generator` first** — simplest, fastest to ship, good for learning the loop. ~1 day.
3. **Build the design system along the way** — extract tokens, components, layout as you go. Don't front-load this; design emerges from building.
4. **Then `whatismyip`** — highest stakes, biggest press if you do it well. The trust site sets the bar. ~1–2 weeks.
5. **Then `calculator-collection`** — biggest compounder. Ship 10 calculators in V1, 30+ over time. ~2–4 weeks for V1.
6. **Then `wordunscrambler`, `sleep-calculator`, `phone-number-generator`** — by now the loop is fast; each ~2–3 days.
7. **V1.1 across all 6** — i18n, embeddable widgets, open API, schema markup depth.

## See also

- [`./stand-out.md`](./stand-out.md) — the competitive play; why each site beats its incumbent, and the portfolio-level moat
- [`./README.md`](./README.md) — the business model, selection criteria, keyword research pipeline
- Each project's `sites/<project>/docs/prd.md` § 6 (Differentiation) for what the tech stack needs to enable
