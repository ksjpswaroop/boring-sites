# @boring-sites/legal

Boilerplate legal pages for the boring-sites portfolio. Privacy, Terms, Disclaimer, Contact. One source, used by every site.

## Usage

Each site imports the page components directly:

```astro
---
import Privacy from '@boring-sites/legal/privacy.astro';
---
<Privacy
  siteName="Dragonborn Names"
  siteUrl="https://dragonbornnames.example.com"
  contactEmail="hello@dragonbornnames.example.com"
  customDataCollection="We do not log visitor IPs."
/>
```

## Per-site customization

Most sites will need:
- **`customDataCollection`** on `Privacy` — site-specific data practices (especially for whatismyip's no-logs claim)
- **`customClause`** on `Terms` — site-specific "don't do this" clauses (e.g. phone-number-generator's "no fraud")
- **`items`** on `Disclaimer` — site-specific disclaimers (e.g. dragonborn's "not affiliated with WotC", sleep-calculator's "not medical advice")

## Why this lives in `packages/`

AdSense reviewers scrutinize boring sites. Generic-looking legal pages get flagged. Having real, site-specific legal text that all 6 sites share as a starting point is faster than rewriting from scratch, and ensures the portfolio is consistently compliant.

For whatismyip specifically: the `customDataCollection` is non-negotiable. The entire monetization model is built on the trust claim that we don't log. The legal page must be airtight.
