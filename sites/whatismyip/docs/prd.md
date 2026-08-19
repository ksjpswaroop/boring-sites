# PRD — What Is My IP

**Project:** `sites/whatismyip`
**Source:** Jonathan's Jam `nQOGK72IHx8` — case study, up to $111K/mo
**Benchmark revenue:** $111K/mo (top of market) · $50–$500/mo realistic Y1
**Owner:** TBD
**Status:** 🔲 not started

---

## 1. Overview

A privacy-respecting public-IP lookup tool. Shows the visitor's IPv4 and IPv6 address, ISP, approximate geolocation, and a few diagnostic checks. AdSense-monetized, **no logs, no tracking, no signup**. The category leader (`whatismyip.com`) earns up to $111K/mo.

## 2. Problem & users

Developers, sysadmins, and privacy-conscious users need a fast, trustworthy page to check their public IP, verify a VPN is working, or troubleshoot connectivity.

**Primary users:** developers checking egress IP, VPN users verifying the tunnel, sysadmins diagnosing geo-routing, privacy-conscious users checking "what does the internet see?", customer support reps walking users through "what's your IP?".

## 3. Goals & success metrics

| Metric           | 3-month target | 12-month target |
| ---------------- | -------------- | --------------- |
| Monthly visitors | 1K             | 30K             |
| AdSense approval | Yes            | —               |
| Monthly revenue  | $5–$50         | $200–$1,500     |
| Bounce rate      | < 70%          | < 60%           |
| Pages / session  | 1.5+           | 2+              |

> Bounce is high by category — a single page answers the question. The metric to watch is **repeat visitor rate** (developers bookmark the page).

## 4. Non-goals (V1)

- Account system
- Persistent history
- Mobile native app
- VPN service or affiliate-driven VPN recommendations (avoid the dark pattern)
- Any feature that requires storing visitor IP

## 5. User stories

1. As a developer, I want to see my public IP the moment the page loads — no clicks, no friction.
2. As a VPN user, I want a clear "Are you using a VPN?" indicator comparing IP geo to browser timezone.
3. As a sysadmin, I want my user-agent string and screen resolution visible for debugging.
4. As a privacy user, I want an explicit "we do not log your IP" banner so I trust the site.
5. As a deep user, I want to run a DNS leak test and WebRTC leak test on the same page.
6. As a curious user, I want to learn "what is an IP address?" in plain English.

## 6. Differentiation

What beats `whatismyip.com` (a 2003-era page) and the other lookalikes:

1. **Open-source front-end** — public GitHub repo. Auditable. Trust signal that lasts. *(V1.1)*
2. **No-logs daily proof** — public dashboard showing "today's server access log" with IPs stripped. Genuinely novel — no competitor has this. The trust claim becomes verifiable, not just promised.
3. **DNS + WebRTC leak tests in one click** — most sites only do one or the other. *(Features F8, F9)*
4. **"Are you on a VPN?" heuristic** — explicit answer with explanation (compare IP country vs browser timezone). Nobody does this well. *(Feature F7)*
5. **Cookieless analytics only** — **no Google Analytics** (it stores IPs and would violate the trust claim).
6. **Educational "what is X" pages** — `what-is-an-ip-address`, `what-is-an-isp`, `am-i-using-a-vpn`. Captures the "learn" intent and cross-links back to the tool. *(Feature F10)*
7. **Beautiful mobile-first UI** — incumbent looks like 2003. Modern dark mode, big readouts, real typography.
8. **Portfolio cross-linking** — links to the rest of the boring-sites portfolio from every page. *(Portfolio moat — see `../../../strategy/stand-out.md`.)*

## 7. Functional scope (high level)

- Auto-detect on load: IPv4, IPv6, ISP, country, region, city, timezone
- User-agent string, screen resolution, browser language
- Copy-to-clipboard per field
- DNS leak test (sub-resource fetch)
- WebRTC leak test (RTCPeerConnection trick)
- "Are you using a VPN?" heuristic
- Educational content: "What is an IP?", "What is my ISP?", "Am I using a VPN?"

Full spec: see [`features.md`](./features.md).

## 8. Non-functional requirements

- Time to IP display: **< 200ms**
- Basic IP display works without JS (server-side `x-forwarded-for` lookup)
- Lighthouse: 95+ on all four axes
- **No third-party analytics that could leak IP**
- DNT header respected

## 9. Monetization

- **Google AdSense:** header, sidebar, footer
- **Affiliate (V2, carefully):** privacy tools (1Password, ProtonMail) — no VPN dark patterns
- **Open-source the front-end on GitHub** — differentiator for whatismyip, helps SEO for the rest

## 10. Compliance & legal

- **CRITICAL: no logging of visitor IPs anywhere.** Server logs must strip the IP from request entries, or be disabled.
- Cookieless analytics only (Plausible / Umami) — **no Google Analytics** (it stores IPs)
- GDPR / CCPA compliant by design
- Prominent "no logs" banner on home page
- Pages: Privacy (explicit "what we don't collect"), Terms, About, Contact
- "Educational only — not for security-critical decisions" disclaimer

## 11. Open questions

1. Self-host or use a CDN like Cloudflare that may itself log IPs?
2. How to do DNS / WebRTC leak tests without being a logger ourselves?
3. Affiliate VPN links — proceed with caution or skip to maintain trust?
4. Geolocation accuracy vs cost (free MaxMind GeoLite2 vs paid commercial)?

## 12. Launch criteria

- [ ] All P0 features shipped
- [ ] AdSense approved (reviewers scrutinize this category)
- [ ] Real domain connected
- [ ] 4 legal pages with explicit no-logs policy
- [ ] "We don't log" banner prominent on every page
- [ ] Submitted to Google Search Console
- [ ] No raw IP in any server log, app DB, or third-party analytics payload — verified by audit
