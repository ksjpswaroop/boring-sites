# PRD — Phone Number Generator

**Project:** `sites/phone-number-generator`
**Source:** Jonathan's Jam `nQOGK72IHx8` — Clearscope opportunity cited
**Benchmark revenue:** TBD · $5–$100/mo realistic Y1
**Owner:** TBD
**Status:** 🔲 not started

---

## 1. Overview

A random phone number generator for developers, QA, and form designers. Pick a country, optionally an area code, get a list of valid-format numbers. Numbers are **not real** — they're generated to match the format only. Useful for tests, screenshots, sign-up forms, and the "lorem ipsum" crowd.

## 2. Problem & users

Every developer / QA / form designer has needed a fake phone number that LOOKS real (right length, right format, plausible area code) for testing or design work. The current way is to scribble one down or use a list of examples. A generator is faster and produces more variety.

**Primary users:** software developers writing tests with form validation, QA engineers populating test databases, form designers mocking sign-up flows, content creators needing placeholder data, marketing teams making demo screenshots.

## 3. Goals & success metrics

| Metric           | 3-month target | 12-month target |
| ---------------- | -------------- | --------------- |
| Monthly visitors | 100            | 3K              |
| AdSense approval | Yes            | —               |
| Monthly revenue  | $1–$10         | $30–$200        |
| Bounce rate      | < 60%          | < 50%           |

## 4. Non-goals (V1)

- Generating **REAL, dialable** phone numbers (we generate format-only)
- Account system
- Mobile native app
- "Real" phone number lookups (Twilio-style)
- Number validation against actual carrier databases
- Sending SMS or making calls

## 5. User stories

1. As a developer, I want to pick a country and get 10 valid-format numbers I can paste into a test database.
2. As a form designer, I want a number with a US area code matching a specific city (415 for SF).
3. As a phone user, I want to tap a "Copy" button per number and a "Copy all" for the whole list.
4. As a user, I want to be reassured these numbers are not real and not for fraud.
5. As a power user, I want CSV / JSON export to drop into a script.
6. As a returner, I want my last country and area code pre-selected.

## 6. Differentiation

What beats the spammy, sketchy existing generators:

1. **Trust banner as a hero element** — most competitors look shady. A prominent "not real, no fraud" banner at the top = the trust signal that wins the category. *(Feature F7)*
2. **Real area codes searchable** — most generators are random formats; we use real, searchable area codes (US: 300+, CA: 50+). *(Feature F2)*
3. **E.164 / national / international format toggle** — developers want E.164 for form validation; designers want national for mockups. *(Feature F9)*
4. **CSV / JSON export** — developer-friendly. Most generators are GUI-only. *(Features F11, F12)*
5. **Open API** — `POST /api/phone?country=US&count=10`. Adoption = developer backlinks. *(V2)*
6. **Per-country SEO landing pages** — `/us-phone-numbers`, `/uk-phone-numbers`, etc. Captures regional traffic. Most competitors have one generic page.
7. **Mobile-first beautiful UI** — most competitors are spammy desktop sites. Dark mode, big touch targets, real typography.
8. **Portfolio cross-linking** — links to the rest of the boring-sites portfolio from every page. *(Portfolio moat — see `../../../strategy/stand-out.md`.)*

## 7. Functional scope (high level)

- Country picker (US, UK, CA, AU, DE, FR initially)
- Area code picker (US / CA only, populated with real area codes)
- Count input (1–100)
- Generate button → list of numbers
- Copy single / copy all
- Format options (international / national / E.164)
- Prominent banner: "Generated numbers are not real. Do not use for fraud, harassment, or bypassing verification."

Full spec: see [`features.md`](./features.md).

## 8. Non-functional requirements

- Generation: **< 100ms** for 100 numbers
- All client-side (no server needed)
- Lighthouse: 95+
- Mobile-first

## 9. Monetization

- **Google AdSense:** header, sidebar, after-results
- **Affiliate (V2):** VoIP services, test-data tools

## 10. Compliance & legal

- **CRITICAL banner:** "Not real numbers. Not for fraud. Not for bypassing verification."
- Privacy: no user input stored
- Pages: Privacy, Terms (explicit "no fraud" clause), About, Contact

## 11. Open questions

1. How many countries at launch? (Start with US / UK / CA / AU, expand based on search demand.)
2. CSV / JSON export from day 1 or V2?
3. E.164 format support from day 1 or V2?
4. Real area codes vs. random area codes (real is more realistic; random is safer for fraud-prevention)?

## 12. Launch criteria

- [ ] All P0 features shipped
- [ ] AdSense approved
- [ ] Real domain connected
- [ ] 4 legal pages + fraud disclaimer live
- [ ] "Not real numbers" banner above results, on every page
- [ ] Submitted to Google Search Console
- [ ] First page indexed within 14 days
