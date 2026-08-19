# whatismyip

**Benchmark revenue:** up to $111K/month
**Reference:** `WhatIsMyIP.com`

## What it does

Shows the visitor's public IP address, ISP, approximate geolocation (city / region / country), and user-agent string. Often also exposes a DNS leak check, WebRTC leak check, and a "is my VPN working" check.

## Target keywords (seed)

- "what is my ip"
- "what is my ip address"
- "my ip address"
- "show my ip"
- "ip lookup"

## Build plan

- [ ] Validate keyword set
- [ ] Pick domain (the obvious `whatismyip.com` is taken — try `whatismyipaddress.app`, `myipcheck.com`, `myip.dev`)
- [ ] Build with the boring-sites stack (Astro + Tailwind on Vercel) — see [tech-stack](../../strategy/tech-stack.md)
- [ ] Add About, How-to ("what is an IP address?"), FAQ
- [ ] Add related tools: IPv6 lookup, DNS leak test, WebRTC leak test, port checker, whois lookup
- [ ] Add legal pages (be explicit about IP data handling — do NOT log visitor IPs)
- [ ] Apply for AdSense, install snippet, request review
- [ ] Submit to Google Search Console

## Notes

Compliance-sensitive: privacy and IP data are sensitive. Use a "no logs" banner prominently, host legal pages, and avoid any analytics that store raw IPs. AdSense reviewers can be strict on this category.

---

## Development

This is the **trust play** for the boring-sites portfolio. The no-logs claim is non-negotiable and the source code is open on GitHub so it can be audited.

### Why SSR (not static)

Unlike `dragonborn-name-generator` (which is fully static), this site runs in **hybrid mode** (Vercel Edge Functions). The IP has to be detected at request time from the `x-forwarded-for` header — that can't be done at build time. The page is still mostly static HTML; only the IP echo and the per-request IP are dynamic.

### Run locally

```bash
# From the repo root
pnpm install
pnpm --filter whatismyip dev

# Open http://localhost:4321
```

### Project layout

```
whatismyip/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   └── ip.ts             # Edge Function — returns the requester's IP
│   │   ├── learn/                # SEO educational pages
│   │   │   ├── what-is-an-ip-address.astro
│   │   │   ├── what-is-an-isp.astro
│   │   │   └── am-i-using-a-vpn.astro
│   │   ├── index.astro           # Main page
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   ├── privacy.astro         # No-logs specifics
│   │   ├── terms.astro
│   │   └── faq.astro
│   ├── components/               # IPCard, UserAgentCard, VPNChecker, DNSLeakTest, WebRTCLeakTest, NoLogsBanner
│   ├── lib/                      # request.ts — IP extraction
│   └── env.d.ts
├── public/
├── astro.config.mjs              # hybrid output, vercel adapter
├── tailwind.config.mjs
├── vercel.json                   # security headers + Cache-Control: no-store on /api/*
├── tsconfig.json
└── package.json
```

### The no-logs standard

This site demonstrates the boring-sites "no-logs" pattern. The same pattern should be applied to any future site that handles user PII:

1. **No server logs.** Vercel Edge Functions don't write access logs by default. We have not enabled Vercel Web Analytics (it would log IPs).
2. **No database.** There is no database, period.
3. **No third-party trackers that store IPs.** Plausible is cookieless and does not store personal data. We do not use Google Analytics.
4. **No cookies.**
5. **The IP echo endpoint returns the IP without storing it.** See `src/pages/api/ip.ts` — read the header, return JSON, done.
6. **The Privacy page documents all of this.** See `src/pages/privacy.astro` — written to be airtight, especially around "what we DON'T collect".
7. **The source code is open on GitHub.** Anyone can audit the actual code that runs.

### Vercel-specific config

- **Vercel Web Analytics: OFF.** Disable in project settings, or the trust claim is broken.
- **Vercel Edge Functions** for `/api/*` (configured via the `vercel` adapter in `astro.config.mjs`).
- **Security headers** in `vercel.json` — `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **Cache-Control: no-store** on `/api/*` so the IP echo is never cached.

### Build & deploy

```bash
pnpm --filter whatismyip build
pnpm --filter whatismyip preview

# First-time Vercel setup
vercel link
vercel --prod
```

### V1.1 backlog

- MaxMind GeoLite2 integration for real IP-to-country lookup (improves VPN heuristic)
- Per-country landing pages (`/us-ip`, `/uk-ip`, etc.) for SEO
- "Am I blacklisted" DNSBL check
- IPv6-only mode toggle
- Open-source the front-end (already in the PRD as a differentiator)

See `../docs/prd.md` for the full launch criteria and `../docs/features.md` for the complete feature spec.
