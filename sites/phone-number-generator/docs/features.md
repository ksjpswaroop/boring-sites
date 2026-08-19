# Features — Phone Number Generator

**Project:** `sites/phone-number-generator`
**Status:** 🔲 not started

---

## Priority table

| ID  | Feature                            | Priority | Status | Notes                              |
| --- | ---------------------------------- | -------- | ------ | ---------------------------------- |
| F1  | Country picker                     | P0       | 🔲     | US, UK, CA, AU, DE, FR             |
| F2  | Area code picker (US/CA)           | P0       | 🔲     | Real area codes, searchable        |
| F3  | Count input                        | P0       | 🔲     | 1–100, default 10                  |
| F4  | Generate button                    | P0       | 🔲     | Instant result                     |
| F5  | Result list with per-row copy      | P0       | 🔲     | Tap to copy                        |
| F6  | "Copy all" button                  | P0       | 🔲     | Newline-joined                     |
| F7  | "Not real" trust banner            | P0       | 🔲     | Above results, every page          |
| F8  | Mobile responsive                  | P0       | 🔲     | First-class mobile                 |
| F9  | Format options (natl / intl / E164)| P1       | 🔲     | Toggle before generating           |
| F10 | Mobile vs landline filter          | P1       | 🔲     | Country-aware                      |
| F11 | CSV export                         | P1       | 🔲     | Developer-friendly                 |
| F12 | JSON export                        | P1       | 🔲     | Developer-friendly                 |
| F13 | Last country / area code remembered| P1       | 🔲     | localStorage                       |
| F14 | More countries (ES, IT, JP, BR…)   | P1       | 🔲     | Expand based on search demand      |
| F15 | Save favorites                     | P2       | 🔲     | localStorage                       |
| F16 | Bulk regenerate                    | P2       | 🔲     | "Re-roll all 10"                   |

## P0 — must ship at launch

### F1. Country picker
- **What:** Dropdown of supported countries.
- **V1 list:** US, UK, CA, AU, DE, FR.
- **Behavior:** Changing country resets area-code picker and re-formats examples.

### F2. Area code picker (US / CA only)
- **What:** Searchable dropdown of real area codes (US: 300+, CA: 50+).
- **Behavior:** Optional. If blank, area code is randomized from the country's set.
- **Source:** Static JSON file bundled at build time.
- **Note:** Not all area codes are mobile-capable; we'll show a "likely mobile" tag for the major ones (V1: skip, V2: tag).

### F3. Count input
- **What:** Number input, 1–100, default 10.
- **Acceptance:** Clamps on blur; rejects non-integer; shows "10 numbers" preview.

### F4. Generate button
- **What:** Click → populate result list.
- **Algorithm:** For each requested number:
  1. Pick format pattern by country.
  2. Fill each "X" placeholder with a random digit (or letter for UK, e.g. "07700 900123" letters).
  3. Format to chosen style.
- **Acceptance:** < 100ms for 100 numbers.

### F5. Result list with per-row copy
- **What:** Each generated number as a row with a copy icon.
- **Acceptance:** Copy icon is touch-friendly; toast on copy.

### F6. "Copy all" button
- **What:** Above the list, one button to copy all numbers, newline-joined.
- **Acceptance:** Handles up to 100 numbers without lag.

### F7. "Not real" trust banner
- **What:** Prominent banner above the result list:
  > ⚠️ **These numbers are randomly generated and are not assigned to any phone or person. Do not use them to commit fraud, harass anyone, or bypass verification systems that require real numbers.**
- **Why:** AdSense reviewers and legal both care. Also pre-empts "is this real?" user questions.

### F8. Mobile responsive
- **What:** Layout works on 360px width.
- **Acceptance:** Country picker is large; result list is one number per row; copy icons are touch-friendly.

## P1 — should ship in V1.1

### F9. Format options
- **Toggle:** National | International | E.164
- **National:** `415-555-0123` (US)
- **International:** `+1 415-555-0123`
- **E.164:** `+14155550123`
- **Why:** Developers want E.164 for form validation; designers want national for mockups.

### F10. Mobile vs landline filter
- **What:** For countries with portable vs landline number ranges, filter to mobile only.
- **V1:** US mobile area codes (prepaid + major carriers). V2: extend to other countries.

### F11. CSV export
- **What:** Button → download `numbers-YYYYMMDD-HHMMSS.csv`.
- **Columns:** number, format, country, area_code.

### F12. JSON export
- **What:** Same as F11 but `.json`.
- **Shape:** `{ generated_at: "...", country: "US", numbers: [...] }`

### F13. Last country / area code remembered
- **What:** localStorage stores last-used country and area code.
- **Acceptance:** On next visit, the pickers default to the last used.

### F14. More countries
Add ES, IT, JP, BR, IN, MX, NL, SE based on Clearscope search demand.

## P2 — backlog

### F15. Save favorites
Star icon per row → saved list in localStorage. Bulk copy favorites.

### F16. Bulk regenerate
"Reroll all 10" button above the list.

## Out of scope (V1)

- Real dialable numbers — NEVER (we generate format only)
- Account system — V2
- Mobile native app — V3
- SMS sending or call routing — NEVER
- Number validation against carrier DBs — NEVER
- Affiliate links to "real phone number" services (gray-hat) — NEVER

## Cross-cutting

### SEO

- One landing page per country: `/us-phone-numbers`, `/uk-phone-numbers`, etc.
- One landing page per "use case" search: `/phone-number-generator-for-testing`, `/fake-phone-number`.
- Structured data: `WebApplication` on the home page; `FAQPage` on landing pages.
- Title format: `Random {Country} Phone Number Generator — {N} Numbers | {site-name}`

### Analytics (Plausible / Umami)

- `country_pick`, `area_code_pick`, `generate_click`, `copy_single`, `copy_all`, `format_change`, `export_csv`, `export_json`.

### Compliance

- Banner is non-dismissible (always visible).
- Terms of Service has a "no fraud" clause that, if violated, releases the operator from liability.
- Don't show a "Call this number" CTA anywhere.
- Affiliate links: only to legitimate test-data services (e.g. Twilio test credentials), never to "get a real number" services.

### Accessibility

- Country picker is a real `<select>`, not a custom div.
- Result rows are `<button>` elements with `aria-label="Copy number 415-555-0123"`.
- Trust banner is `role="note"`.
- Color contrast: trust banner uses a high-contrast warning palette.
