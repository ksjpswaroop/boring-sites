# Features — Calculator Collection

**Project:** `sites/calculator-collection`
**Status:** 🔲 not started

---

## Priority table — calculator roster

| ID  | Calculator            | Priority | Status | Notes                              |
| --- | --------------------- | -------- | ------ | ---------------------------------- |
| C1  | Mortgage              | P0       | 🔲     | Highest search volume              |
| C2  | BMI                   | P0       | 🔲     | Evergreen                          |
| C3  | Tip                   | P0       | 🔲     | Very simple, fast to ship          |
| C4  | Age                   | P0       | 🔲     | DOB → years/months/days            |
| C5  | Percentage            | P0       | 🔲     | "X% of Y" type queries             |
| C6  | GPA                   | P0       | 🔲     | High student traffic               |
| C7  | Calorie (BMR + TDEE)  | P0       | 🔲     | Harris-Benedict or Mifflin-St Jeor |
| C8  | Loan                  | P0       | 🔲     | Personal, auto, student            |
| C9  | Tax (US federal)      | P0       | 🔲     | Brackets change yearly — V1 = year-tagged |
| C10 | Retirement            | P0       | 🔲     | With chart (P1)                    |
| C11 | Date difference       | P0       | 🔲     | "Days between X and Y"             |
| C12 | Time duration         | P0       | 🔲     | Hours between two times            |
| C13 | Word counter          | P0       | 🔲     | Useful for writers/students        |
| C14 | % increase / decrease | P1       | 🔲     |                                    |
| C15 | Average               | P1       | 🔲     | Mean / median / mode               |
| C16 | Compound interest     | P1       | 🔲     | With chart (P1)                    |
| C17 | Calorie deficit       | P1       | 🔲     | For weight loss planning           |
| C18 | Body fat              | P1       | 🔲     | US Navy method                     |
| C19 | Ideal weight          | P1       | 🔲     | Devine, Robinson, Miller formulas  |
| C20 | Ovulation             | P1       | 🔲     | Captures "ovulation calculator"    |
| C21 | Unit converter        | P1       | 🔲     | Length, weight, temperature        |
| C22 | Amortization          | P2       | 🔲     | Full loan table                    |
| C23 | Refinance             | P2       | 🔲     | Compare two loans                  |
| C24 | Grade needed          | P2       | 🔲     | "What do I need on the final?"     |
| C25 | Inflation             | P2       | 🔲     | "What is $X in YYYY dollars worth today?" |
| C26 | Time zone converter   | P2       | 🔲     | "What time is X in Y?"             |
| C27 | Random number         | P2       | 🔲     | Quick utility                       |
| C28 | Character count       | P2       | 🔲     | Like word counter, with chars      |

## Cross-calculator features

| ID  | Feature                          | Priority | Status | Notes                                 |
| --- | -------------------------------- | -------- | ------ | ------------------------------------- |
| F1  | Shared layout (header, footer)   | P0       | 🔲     | Consistent across all calculators     |
| F2  | Sidebar "Related calculators"    | P0       | 🔲     | Cross-link by topic                   |
| F3  | Input persistence (localStorage) | P0       | 🔲     | Per-calculator; per-browser           |
| F4  | Shareable URL with input state   | P0       | 🔲     | Query params encode inputs            |
| F5  | "How is this calculated?" panel  | P0       | 🔲     | 200–400 words of educational content  |
| F6  | Disclaimer footer                | P0       | 🔲     | "Estimates only — not advice"         |
| F7  | Mobile responsive                | P0       | 🔲     | First-class mobile                    |
| F8  | Result chart (where applicable)  | P1       | 🔲     | Chart.js or Recharts                  |
| F9  | Print-friendly view              | P1       | 🔲     | `@media print` CSS                    |
| F10 | PDF export                       | P2       | 🔲     | jsPDF or browser print                |
| F11 | Email results to me              | P2       | 🔲     | Captures email for newsletter?        |
| F12 | Embeddable widget                | P2       | 🔲     | `<iframe>` distribution play          |
| F13 | Multi-language                   | P2       | 🔲     | Spanish, French, etc.                 |

## P0 — must ship at launch (first 10 calculators)

### F1. Shared layout
- **What:** Single CSS + JS bundle, page-specific content slot.
- **Components:** header (logo + nav + search), footer (legal links + disclaimer), main content (calculator), sidebar (related + ads).
- **Acceptance:** Visited 10 calculators, every page feels like the same site.

### F2. Sidebar "Related calculators"
- **What:** "People who used X also used Y" with 3–5 calculator links.
- **Logic:** Hard-coded pairs per calculator (mortgage ↔ amortization ↔ refinance; BMI ↔ calorie ↔ body fat).
- **Why:** Increases pages/session, distributes link equity.

### F3. Input persistence (localStorage)
- **What:** Inputs are saved to localStorage on change. On page load, the last-used inputs are pre-filled.
- **Per-calculator key:** e.g. `boring-sites:mortgage`.
- **Acceptance:** Refresh page → inputs preserved. Different calculator → different inputs preserved.

### F4. Shareable URL with input state
- **What:** All inputs are mirrored to URL query params. Pasting the URL re-runs the calculation.
- **Example:** `https://example.com/mortgage?principal=300000&rate=6.5&term=30`.
- **Why:** High social shareability. People text "check this out" links.

### F5. "How is this calculated?" panel
- **What:** Collapsible panel below the result with 200–400 words explaining the formula, its assumptions, and its limits.
- **SEO value:** Captures "how is X calculated" queries.

### F6. Disclaimer footer
- **What:** "Estimates only. Not financial, medical, or legal advice. Verify with a professional."
- **Where:** Footer of every page, plus context-specific disclaimers (tax, BMI).

### F7. Mobile responsive
- **What:** Works on 360px width.
- **Acceptance:** Input form is full-width; results stack; sidebar moves below content on mobile.

## Per-calculator P0 spec (illustrated with C1: Mortgage)

### C1. Mortgage
- **Inputs:** principal ($), annual interest rate (%), term (years)
- **Outputs:** monthly payment, total interest, total cost
- **Formula:** standard amortization `M = P × [r(1+r)^n] / [(1+r)^n − 1]`
- **Edge cases:** 0% interest → show simple division; 0 principal → show 0; very long term → warn about total cost
- **Related:** amortization, refinance, affordability (DTI)
- **"How it's calculated":** 300 words on amortization, APR vs APY, fixed vs adjustable
- **SEO meta:** "Free Mortgage Calculator — Monthly Payment, Total Interest | {site-name}"

(Every P0 calculator follows the same shape. Don't reinvent per page.)

## P1 — V1.1

### F8. Result chart
- **Where:** mortgage (balance over time), retirement (balance projection), compound interest, calorie deficit (weight over time).
- **Library:** Chart.js (lightweight) over Recharts.
- **Acceptance:** Chart loads in < 300ms; doesn't block initial render.

### F9. Print-friendly view
- **`@media print`** CSS that hides ads, sidebar, nav. Renders just the input + result.
- **Acceptance:** Print preview is clean.

## P2 — backlog

### F10. PDF export
Client-side `jsPDF`. Saves the result as a PDF for "bring this to your bank" use case.

### F11. Email results to me
Captures an email address in exchange for "send me my amortization table". Start of an email list.

### F12. Embeddable widget
`<iframe src="https://example.com/embed/mortgage?...">` — partner sites embed our tools. Brand = link back.

### F13. Multi-language
Translate input labels and "how it's calculated" content. Captures Spanish / French / Portuguese (Brazil) search traffic.

## Out of scope (V1)

- Account system, cross-device sync — V2
- Native mobile app — V3
- Premium tier — V2 (e.g. advanced tax brackets, multi-year projections)
- Multi-language — V2

## Cross-cutting

### SEO

- Each calculator: dedicated URL `/<slug>` (e.g. `/mortgage`, `/bmi`).
- One "learn" page per calculator: `/<slug>/how-its-calculated`.
- One "FAQ" page per calculator: `/<slug>/faq`.
- Structured data: `WebApplication` + `FAQPage`.
- Title format: `{Calculator Name} — Free Online Calculator | {site-name}`.
- Meta description: the 1-line use case + "Free, no signup, mobile-friendly."
- `sitemap.xml` lists all calculators + learn pages.

### Analytics

- `calculator_view`, `input_change`, `result_view`, `share_url_click`, `related_calculator_click`, `pdf_export`, `embed_open`.
- Track per-calculator separately so we know which ones earn the most RPM.

### Accessibility

- All inputs have `<label>`.
- Results region has `aria-live="polite"` so screen readers announce updates.
- Keyboard: Tab through inputs, Enter to compute, arrow keys to adjust sliders.
- Color is never the only signal in charts (also use line styles / patterns).
