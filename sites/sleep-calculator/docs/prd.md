# PRD — Sleep Calculator

**Project:** `sites/sleep-calculator`
**Source:** Jonathan's Jam `nQOGK72IHx8` — case study, ~$9K/mo
**Benchmark revenue:** $9K/mo (top of market) · $5–$50/mo realistic Y1
**Owner:** TBD
**Status:** 🔲 not started

---

## 1. Overview

A bidirectional sleep-cycle calculator: given a desired wake time, returns the optimal bedtimes; given a desired bedtime, returns the optimal wake times. Based on 90-minute sleep cycles plus ~14 minutes to fall asleep. Single page, no login, no fluff.

## 2. Problem & users

Anyone with a regular alarm habit has been woken mid-cycle, felt groggy for an hour, and wondered "what time should I actually be going to bed?". Google captures millions of these queries.

**Primary users:** commuters with a fixed wake-up time, shift workers, students pulling late nights, parents timing naps, anyone who has felt "sleep drunk" waking up.

## 3. Goals & success metrics

| Metric           | 3-month target | 12-month target |
| ---------------- | -------------- | --------------- |
| Monthly visitors | 200            | 5K              |
| AdSense approval | Yes            | —               |
| Monthly revenue  | $2–$15         | $20–$200        |
| Bounce rate      | < 50%          | < 40%           |
| Avg. session     | 20s+           | 30s+            |

## 4. Non-goals (V1)

- Sleep tracking, overnight logging, wearable integration
- Account system, history sync across devices
- Native mobile app
- Premium tier / "Pro" features
- Medical-grade accuracy claims (we're a calculator, not a sleep clinic)

## 5. User stories

1. As a commuter, I want to enter "I need to wake up at 6:30 AM" and see the best bedtimes in < 1s.
2. As a night owl, I want to enter "I'm going to bed at 1 AM" and see when my alarm should ring.
3. As a phone user, I want to tap a result to set my phone alarm.
4. As a curious user, I want a one-paragraph explanation of WHY 90 minutes matters.
5. As a shift worker, I want to compute forward and backward from any custom time.
6. As a first-time visitor, I want "now" as a quick-start option.
7. As a parent, I want a sibling nap calculator (20-min power nap, 90-min full cycle).

## 6. Differentiation

What beats the existing small sleep-calculator sites:

1. **Bidirectional in one page** — most have separate wake-up vs go-to-bed pages. One page, one toggle. *(Feature F1)*
2. **"Set alarm" deep link** — tap a result, opens the phone's default clock app. Nobody does this well. *(Feature F4)*
3. **Installable PWA** — adds to home screen for repeat access. Most boring sites aren't PWAs. *(Feature F13)*
4. **1,500-word sleep-science explainer** — captures "how do sleep cycles work" queries, where most competitors have 100-word stubs.
5. **Nap calculator sibling** — `/nap` captures "nap calculator" as a separate landing page. Different intent, different time of day. *(Feature F9)*
6. **i18n from day 1** — Spanish, French, Portuguese, German. Most competitors are English-only. *(Feature F14)*
7. **Real-time results** — pick a time, see the bedtimes without clicking submit. Incumbents all use click-to-submit.
8. **Portfolio cross-linking** — links to the rest of the boring-sites portfolio from every page. *(Portfolio moat — see `../../../strategy/stand-out.md`.)*

## 7. Functional scope (high level)

- Mode toggle: "Wake up at..." / "Go to bed at..."
- Time picker (default: now)
- Output: 4 optimal times (6h / 7.5h / 9h of sleep) plus 1–2 anchor times
- Tap result to set phone alarm (deep link)
- Embedded "How it works" explainer
- Optional: sibling nap calculator (1 cycle, 20-min power nap, 30-min)

Full spec: see [`features.md`](./features.md).

## 8. Non-functional requirements

- Time to results: **< 100ms** after time is picked
- No JS required for basic computation (progressive enhancement)
- Lighthouse: 95+ on all four axes
- Works offline after first load (PWA optional)
- Mobile-first

## 9. Monetization

- **Google AdSense:** header, sidebar, after-results
- **Affiliate (V2):** mattress, sleep tracker, blue-light glasses
- **Open-source the front-end on GitHub** — differentiator for whatismyip, helps SEO for the rest

## 10. Compliance & legal

- Disclaimer: "Estimates based on average 90-min sleep cycles. Not medical advice."
- No user data collected
- Cookieless analytics (Plausible / Umami)
- Pages: Privacy, Terms, About, Contact + disclaimer

## 11. Open questions

1. One page with toggle, or two pages (`/wake-up` and `/go-to-bed`)?
2. Default fall-asleep time: 14 min (industry standard) or make it a setting?
3. Ship a sibling "nap calculator" from day 1 or V2?
4. PWA / install-to-home-screen — worth it for retention?

## 12. Launch criteria

- [ ] All P0 features shipped
- [ ] AdSense approved
- [ ] Real domain connected
- [ ] 4 legal pages live + medical disclaimer
- [ ] Submitted to Google Search Console with sitemap
- [ ] First page indexed within 14 days
