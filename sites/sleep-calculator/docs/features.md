# Features — Sleep Calculator

**Project:** `sites/sleep-calculator`
**Status:** 🔲 not started

---

## Priority table

| ID  | Feature                          | Priority | Status | Notes                                 |
| --- | -------------------------------- | -------- | ------ | ------------------------------------- |
| F1  | Bidirectional time mode          | P0       | 🔲     | Wake-up ↔ bed-time toggle             |
| F2  | Time picker                      | P0       | 🔲     | Native input + "now" shortcut         |
| F3  | Optimal-time results             | P0       | 🔲     | 4 cycle-aligned times                 |
| F4  | "Set alarm" deep link            | P0       | 🔲     | Per-result action                     |
| F5  | "How it works" explainer         | P0       | 🔲     | 90-min cycle + 14-min to sleep        |
| F6  | Mobile responsive                | P0       | 🔲     | First-class mobile                    |
| F7  | Fall-asleep time setting         | P1       | 🔲     | Default 14 min, configurable          |
| F8  | Cycle count picker               | P1       | 🔲     | 4 / 5 / 6 cycles                      |
| F9  | Nap calculator (sibling page)    | P1       | 🔲     | 20 / 30 / 90 min                      |
| F10 | "Set reminder" notification      | P1       | 🔲     | Web Notifications API                  |
| F11 | Sleep hygiene tips section       | P2       | 🔲     | Educational content                   |
| F12 | "Bedtime tonight" widget          | P2       | 🔲     | Embeddable widget for partner sites   |
| F13 | PWA / install-to-home-screen     | P2       | 🔲     | Optional                              |
| F14 | i18n (Spanish, French, etc.)      | P2       | 🔲     | Optional                              |

## P0 — must ship at launch

### F1. Bidirectional time mode
- **What:** Toggle between "Wake up at HH:MM" and "Go to bed at HH:MM".
- **Behavior:** Switching modes re-runs the math instantly. State preserved in URL query.

### F2. Time picker
- **What:** Native `<input type="time">` (best mobile UX) with "now" shortcut button.
- **Acceptance:** Touch-friendly, accessible, no custom time-picker bugs.

### F3. Optimal-time results
- **What:** 4 times, each one a multiple of 90 min from the picked time, minus 14 min for fall-asleep.
- **Examples:** From 6:30 AM wake-up → 9:00 PM, 10:30 PM, 12:00 AM, 1:30 AM.
- **UI:** Each result is a card with: time, hours of sleep, "best for..." label, "Set alarm" button.

### F4. "Set alarm" deep link
- **What:** Tap a result to set the phone alarm.
- **iOS:** `shortcuts://` or web-app manifest deeplink.
- **Android:** Intent to default clock app.
- **Desktop:** "Copy time" fallback.
- **Acceptance:** Each platform opens the right clock app; never silently fails.

### F5. "How it works" explainer
- **What:** 3-paragraph plain-English explainer below the calculator.
- **Covers:** why 90 min, why 14 min to fall asleep, what grogginess is, why this isn't medical advice.
- **SEO value:** Educational content ranks for "why do I wake up tired" type queries.

### F6. Mobile responsive
- **What:** Layout works on 360px width.
- **Acceptance:** Time picker is full-width; result cards stack; no horizontal scroll.

## P1 — should ship in V1.1

### F7. Fall-asleep time setting
User overrides the 14-min default (some people fall asleep in 5 min, some in 30). Range: 0–60 min.

### F8. Cycle count picker
User picks 3, 4, 5, or 6 cycles. Default: 4 results spanning 4.5h–9h of sleep.

### F9. Nap calculator (sibling page)
- **Route:** `/nap`
- **Outputs:** 20-min power nap, 30-min grogginess-free, 90-min full cycle.
- **Why:** captures the "nap calculator" search query as a separate landing page.

### F10. "Set reminder" notification
Web Notifications API to remind user 30 min before their computed bedtime. Requires permission; off by default.

## P2 — backlog

### F11. Sleep hygiene tips
Curated 1,000-word article: caffeine cut-off, screen time, room temp, light exposure. SEO bait.

### F12. Embeddable widget
Tiny `<iframe>` for partner sites. Brand = link back. Distribution play.

### F13. PWA / install-to-home-screen
Manifest + service worker. Optional for V1; revisit if retention becomes a goal.

### F14. i18n
Spanish, French, German, Portuguese (Brazil). Translates to bigger TAM.

## Out of scope (V1)

- Sleep tracking, wearable integration — V3
- Account system, history sync — V2
- Premium tier — V2
- Native mobile app — V3

## Cross-cutting

### SEO

- One landing page per "wake up at X" or "go to bed at X" query (e.g. `/wake-up-at-6am`, `/bedtime-for-7am-wake-up`).
- Title format: `Wake Up at 6:30 AM? Best Bedtimes | {site-name}`
- Structured data: `WebApplication` + `FAQPage` for the "how it works" section.

### Analytics

- `mode_toggle`, `time_pick`, `result_view`, `alarm_deeplink_click`, `cycle_count_change`, `fall_asleep_change`, `nap_calculator_view`.

### Accessibility

- Time picker must be keyboard-accessible (arrow keys for increment).
- Result cards must announce time, hours, and label when focused.
