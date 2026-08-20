# Features — Word Unscrambler

**Project:** `sites/wordunscrambler`
**Status:** 🔲 not started

---

## Priority table

| ID  | Feature                       | Priority | Status | Notes                              |
| --- | ----------------------------- | -------- | ------ | ---------------------------------- |
| F1  | Letter input box              | P0       | 🔲     | Auto-uppercase, dedupe, max 15     |
| F2  | Unscramble engine             | P0       | 🔲     | Permutations + ENABLE word list    |
| F3  | Result list                   | P0       | 🔲     | Word + length + score              |
| F4  | Length filter                 | P0       | 🔲     | Min length slider                  |
| F5  | Sort options                  | P0       | 🔲     | Alpha / length / score             |
| F6  | Copy-to-clipboard             | P0       | 🔲     | Per row + "copy all"               |
| F7  | Mobile responsive             | P0       | 🔲     | First-class mobile                 |
| F8  | "Must contain" filter         | P1       | 🔲     | Per-letter requirement             |
| F9  | Scrabble tile score           | P1       | 🔲     | Per-word score badge               |
| F10 | Inline definitions            | P1       | 🔲     | Embedded free dict API             |
| F11 | Per-input landing pages       | P1       | 🔲     | `/unscramble/<letters>` for SEO    |
| F12 | History (localStorage)        | P1       | 🔲     | Last 10 scrambles                  |
| F13 | "Did you mean" suggestions    | P2       | 🔲     | If no results, suggest edits       |
| F14 | Share results URL             | P2       | 🔲     | State encoded in query string      |
| F15 | Saved word lists              | P2       | 🔲     | localStorage favorites             |

## P0 — must ship at launch

### F1. Letter input box
- **What:** Single text field for jumbled letters.
- **Input:** 1–15 chars, A–Z only (case-insensitive, auto-uppercased on display).
- **Output:** Trimmed, deduped letters shown as visual tiles above the input.
- **Edge cases:** empty → button disabled; non-letter chars → silently stripped; duplicate letters → multiple tiles.
- **Acceptance:** rejects > 15 chars; auto-focuses on load; Enter submits.
- **A11y:** `aria-label="Letters to unscramble"`; live region announces result count.

### F2. Unscramble engine
- **What:** Computes all valid English words formable from the input letters.
- **Algorithm:**
  1. Bundle `enable.txt` (~172K words) at build time.
  2. For each length 2..N, find words whose letter signature ≤ input signature.
  3. Pre-indexed by sorted-letters key for O(1) lookup.
- **Performance:** 7-letter input → **< 200ms** on mid-tier phone.
- **Edge cases:** 1 letter → no results, helpful message; all-same-letter → empty state with grace.

### F3. Result list
- **What:** Table of valid words with metadata.
- **Columns:** Word | Length | (P1) Scrabble score | (P1) Definition toggle
- **Behavior:** Tap row to copy word; tap "definition" icon (P1) to expand.
- **Acceptance:** sticky header on scroll; result count displayed ("47 words found"); empty state when zero results.

### F4. Length filter
- **What:** Slider or +/- to set minimum word length.
- **Default:** 2 (show all). **Range:** 2 – input length.
- **Behavior:** Live updates result list.

### F5. Sort options
- **What:** Three sort modes. **Modes:** Alphabetical (default) | Length (desc) | (P1) Score (desc).
- **Behavior:** Click column header to sort; click again to reverse.

### F6. Copy-to-clipboard
- **What:** Per-row copy icon + "Copy all" button above the list.
- **Behavior:** Copies word (or newline-joined list); toast "Copied".

### F7. Mobile responsive
- **What:** Layout works on 360px width.
- **Acceptance:** Touch targets ≥ 44px; no horizontal scroll; results stack single-column on narrow screens.

## P1 — should ship in V1.1

### F8. "Must contain" filter
User picks 0+ letters that MUST appear in every result. Use case: Scrabble blank tiles, "I need a word that uses my J."

### F9. Scrabble tile score
Show the official Scrabble point value (A=1, B=3, …) next to each word. Source: static tile-score map.

### F10. Inline definitions
Click word → open the accessible detail panel. Definitions, examples, and pronunciations load from the generated local lexicon first; `dictionaryapi.dev` is an optional fallback for uncovered entries.

### F11. Per-input landing pages
Route `/unscramble/<letters>` returns a server-rendered (or statically generated) page with that input pre-filled and results pre-computed. Captures long-tail "unscramble X to make words" queries. Pre-generate top 10K inputs at build time, or on-demand SSR.

### F12. History (localStorage)
Last 10 scrambles stored in browser. UI: "Recent" sidebar; click to reload.

## P2 — backlog

### F13. "Did you mean" suggestions
If no results, suggest near-misses: drop one letter, swap two letters.

### F14. Share results URL
"Share this scramble" → URL with input + sort + filter state in query params.

### F15. Saved word lists
"Save word" star on each row → curated list in localStorage. Bulk "Copy favorites" button.

## Out of scope (V1)

- Multi-language word lists — V2
- User accounts / cross-device sync — V2
- Direct WWF / Scrabble Go integration — V3
- Mobile native app — superseded for the Apple product by [`apple-app-roadmap.md`](./apple-app-roadmap.md)
- Voice input — V3
- Ad-blocker detection (let the ads be blocked; don't fight it)

## Cross-cutting

### SEO

- Per-input landing pages (F11) for long-tail.
- Structured data: `WebApplication` schema on home.
- `robots.txt` and `sitemap.xml`.
- Title format: `Unscramble {letters} — Word Unscrambler | {site-name}`
- Meta description: input + result count.

### Analytics (Plausible / Umami)

- `input_length`, `result_count`, `copy_single`, `copy_all`, `sort_change`, `filter_change`, `outbound_definition_click`, `per_letter_page_view`.

### Accessibility (WCAG 2.1 AA)

- Contrast ratios, keyboard nav, focus rings, ARIA labels.
- Reduced-motion support for any transitions.
- Color is never the only signal (badges have icons too).
