# sleep-calculator

**Benchmark revenue:** ~$9K/month
**Reference:** video case study (creator did not name a specific site)

## What it does

Takes the user's desired wake-up time (or bedtime) and returns the optimal sleep/wake times based on 90-minute sleep cycles. Optionally nudges the user toward falling asleep faster.

## Target keywords (seed)

- "sleep calculator"
- "bedtime calculator"
- "wake up time calculator"
- "best time to sleep"
- "sleep cycle calculator"

## Build plan

- [ ] Validate keyword set
- [ ] Pick domain (e.g., `sleepcyclecalc.com`, `optimalbedtime.com`)
- [ ] Build with the boring-sites stack (Astro + Tailwind on Vercel) — see [tech-stack](../../strategy/tech-stack.md)
- [ ] Add About, How-to (science of 90-min sleep cycles), FAQ
- [ ] Add related tools: nap calculator, alarm time picker, REM cycle explainer
- [ ] Add legal pages
- [ ] Apply for AdSense, install snippet, request review
- [ ] Submit to Google Search Console

## Notes

Lower traffic than wordunscrambler but very evergreen and seasonality-neutral. Sleep queries spike around new year / DST / exam season — good for portfolio diversification.

---

## Development

### Run locally

```bash
pnpm install
pnpm --filter sleep-calculator dev
# Open http://localhost:4321
```

### It's a PWA

This site is a **Progressive Web App** — installable to home screen, works offline after first visit. The PWA is configured via `@vite-pwa/astro` in `astro.config.mjs`:

- Service worker auto-updates
- Manifest declares standalone display, theme color, icons
- Static assets (CSS, JS, HTML) are precached

After deploying, test the install UX on iOS Safari ("Add to Home Screen" via the share menu) and on Android Chrome (the install icon in the URL bar).

### The math

`src/lib/cycle.ts` exports:
- `timeToMinutes(time)` / `minutesToTime(min)` — HH:MM ↔ minutes
- `getBedtimesForWakeTime(wakeTime, fallAsleepMin)` — backward calculation: subtract cycles × 90 min + fall-asleep time
- `getWakeTimesForBedtime(bedtime, fallAsleepMin)` — forward calculation: add cycles × 90 min + fall-asleep time
- `buildAlarmDeepLink(time)` — iOS Shortcuts / Android intent / copy-time fallback

The 14-min fall-asleep default is configurable client-side. 90-min cycles are the well-known average.

### V1.1 backlog

- i18n (Spanish, French, German, Portuguese) via `@astrojs/i18n`
- Nap calculator sibling page at `/nap` (20 / 30 / 90 min options)
- 1,500-word sleep-science article for SEO
- Per-wake-time landing pages (e.g. `/wake-up-at-6am`)

See `../docs/prd.md` and `../docs/features.md`.
