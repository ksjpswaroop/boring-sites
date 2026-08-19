# PRD — Calculator Collection

**Project:** `sites/calculator-collection`
**Source:** Jonathan's Jam `nQOGK72IHx8` — `calculator.net` case study, ~$825K/mo
**Benchmark revenue:** $825K/mo (top of market) · $200–$2,000/mo realistic Y1
**Owner:** TBD
**Status:** 🔲 not started

---

## 1. Overview

A single domain hosting 30+ independent calculator tools (mortgage, BMI, tip, age, percentage, GPA, calorie, loan, tax, retirement, date, time, word counter, etc.), each its own page, each its own ad unit, each ranking for its own query. The compounder play: the domain builds authority over time, and each new calculator is a new entry point for organic traffic.

## 2. Problem & users

Everyday financial, fitness, academic, and household math questions. The current dominant site (`calculator.net`) earns $825K/mo by hosting 100+ tools. Google sends traffic to the tool that best answers the query — a calculator beats an article.

**Primary users:** mortgage / loan applicants, fitness folks computing BMI / calorie / macro targets, students calculating GPA, home cooks scaling recipes and converting units, tax filers estimating refunds, anyone doing one-off math they don't want to do in their head.

## 3. Goals & success metrics

| Metric              | 3-month target | 12-month target |
| ------------------- | -------------- | --------------- |
| Calculators shipped | 10             | 30+             |
| Monthly visitors    | 2K             | 50K             |
| AdSense approval    | Yes            | —               |
| Monthly revenue     | $10–$50        | $200–$2,000     |
| Avg. session        | 60s+           | 90s+            |
| Pages / session     | 2+             | 3+              |

## 4. Non-goals (V1)

- Custom saveable inputs across sessions via account (localStorage is fine; account is V2)
- Account system, cross-device sync
- Premium tier
- Mobile native app
- Multi-language

## 5. User stories

1. As a home buyer, I want to compute my monthly mortgage payment in < 1s with principal, rate, and term.
2. As a fitness user, I want to enter my height/weight and see BMI, healthy range, and category.
3. As a student, I want to enter my grades and see my current GPA + what I need on the final to hit a target.
4. As a returner, I want my last inputs pre-filled (localStorage).
5. As a sharer, I want a URL that encodes my inputs so I can text it to my partner / advisor.
6. As a casual user, I want to discover related calculators (sidebar of "People who used X also used Y").
7. As a power user, I want a full amortization table for a loan, not just a monthly payment.
8. As a parent, I want to convert kid-shoe sizes between US / UK / EU.

## 6. Differentiation

What beats `calculator.net` (the dominant 100-tool incumbent):

1. **Embeddable widgets** — `<iframe src="https://ourcalc.com/embed/mortgage?...">` on partner sites. calculator.net doesn't do this well. Distribution + backlinks = compounding SEO. *(Feature F12)*
2. **Per-calculator SEO landing pages with rich schema** — every calculator has its own URL with `WebApplication` + `FAQPage` + `HowTo` schema. calculator.net has thin markup; rich snippets are easy wins.
3. **"How is this calculated?" educational panels** — 200–400 words per calculator. calculator.net is mostly thin pages. Captures "how is mortgage calculated" queries. *(Feature F5)*
4. **Real-time data feeds** — mortgage rates from a public API, inflation from BLS. calculator.net uses static 2020 numbers.
5. **Charts as first-class citizens** — loan amortization, retirement projection, calorie deficit over time. calculator.net is mostly text. *(Feature F8)*
6. **Open API per calculator** — `POST /api/mortgage`, `POST /api/bmi`. Adoption = GitHub stars + backlinks. *(V2)*
7. **i18n from day 1** — calculator.net is English-only; LATAM is a huge market. *(V2)*
8. **Multi-tool consolidation** — single domain builds authority over time; each new calculator is a new entry point. **This is the compounder that no individual calculator site can match.**
9. **Shared design system across calculators** — one consistent layout, one design language, one set of cross-links. calculator.net looks like 100 different freelancers built it.
10. **Portfolio cross-linking** — every calculator sidebar links to other Boring Tools (unscramble, sleep, whatismyip, etc.). *(Portfolio moat — see `../../../strategy/stand-out.md`.)*

## 7. Functional scope (high level)

- Shared layout: header, footer, sidebar with related calculators
- Per-calculator page: input form, instant results, shareable URL, related calculators
- V1 calculator list (priority order): mortgage, BMI, tip, age, percentage, GPA, calorie, loan, tax, retirement, date difference, time, word counter, percentage increase/decrease, average, compound interest, calorie deficit, body fat, ideal weight, ovulation
- Per-calculator: "How is this calculated?" educational content (200–400 words)
- Cross-links between related calculators (mortgage → amortization → refinance)
- Per-calculator SEO landing page

Full spec: see [`features.md`](./features.md).

## 8. Non-functional requirements

- Time to result: **< 200ms** after final input
- Single shared CSS/JS bundle, lazy-load calculator-specific code
- Lighthouse: 95+ per calculator page
- All math runs client-side (no server cost per calculation)
- Mobile-first
- Each calculator page is a static HTML file (good for SEO and CDN caching)

## 9. Monetization

- **Google AdSense per page:** header, sidebar, after-results
- **Affiliate (V2):** financial products, fitness products, online courses
- **Open-source the front-end on GitHub** — differentiator for whatismyip, helps SEO for the rest

## 10. Compliance & legal

- Disclaimer on every calculator: "Estimates only — not financial, medical, or legal advice."
- No user data collected; localStorage for convenience only
- Cookieless analytics
- Pages: Privacy, Terms, About, Contact, Disclaimer

## 11. Open questions

1. Custom domain vs subdomain strategy (one strong domain vs 6 subdomains)?
2. Ship 30 fast or iterate on 5 until they're perfect first?
3. Charts (loan amortization, retirement projection) — how fancy? Library: Chart.js (small) vs Recharts (heavier).
4. Embeddable widgets (let other sites embed our calculators) — V2 distribution play?
5. Affiliate disclosure banner — required and prominent on every page with affiliate links.

## 12. Launch criteria

- [ ] At least 10 calculators shipped before monetizing seriously
- [ ] Shared layout consistent across all calculators
- [ ] AdSense approved (multi-tool domains have higher approval odds than single-page tools)
- [ ] Real domain connected
- [ ] 4 legal pages + disclaimer live
- [ ] Sitemap with all calculator URLs submitted
- [ ] First calculator indexed within 7 days
- [ ] Each calculator has at least 200 words of "how it works" content
