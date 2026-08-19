# Features — What Is My IP

**Project:** `sites/whatismyip`
**Status:** 🔲 not started

---

## Priority table

| ID  | Feature                          | Priority | Status | Notes                                 |
| --- | -------------------------------- | -------- | ------ | ------------------------------------- |
| F1  | Public IPv4 + IPv6 display       | P0       | 🔲     | Auto-detect on page load              |
| F2  | ISP / geo lookup                 | P0       | 🔲     | Country, region, city, timezone       |
| F3  | "No logs" trust banner           | P0       | 🔲     | Above the IP display                  |
| F4  | User-agent + screen info         | P0       | 🔲     | For sysadmin / debugging use          |
| F5  | Copy-to-clipboard                | P0       | 🔲     | Per field                             |
| F6  | Mobile responsive                | P0       | 🔲     | First-class mobile                    |
| F7  | "Are you on a VPN?" heuristic    | P1       | 🔲     | Compare IP geo vs browser TZ          |
| F8  | DNS leak test                    | P1       | 🔲     | Sub-resource fetch trick              |
| F9  | WebRTC leak test                 | P1       | 🔲     | RTCPeerConnection trick               |
| F10 | Educational content pages         | P1       | 🔲     | "What is an IP?", "What is an ISP?"   |
| F11 | IPv6-only mode                   | P2       | 🔲     | For IPv6-only users                   |
| F12 | Port checker                     | P2       | 🔲     | Sibling tool                          |
| F13 | Whois lookup                     | P2       | 🔲     | Sibling tool                          |
| F14 | "Am I blacklisted?" checker      | P2       | 🔲     | Sibling tool, DNSBL lookup            |

## P0 — must ship at launch

### F1. Public IPv4 + IPv6 display
- **What:** Two large readouts — one IPv4, one IPv6 — visible on page load.
- **Backend:** Hit a "what's my IP" endpoint (e.g. `https://api.ipify.org` or self-hosted equivalent) and surface it.
- **Acceptance:** IP visible in < 200ms; both v4 and v6 attempted; works with JS off (server-rendered fallback).

### F2. ISP / geo lookup
- **What:** From the same IP, derive ISP name, country, region, city, latitude/longitude, timezone.
- **Source:** MaxMind GeoLite2 (free) loaded at build time, or paid commercial for accuracy.
- **UI:** Card layout next to the IP, each field copyable.
- **Disclaimer:** "Approximate location based on your IP. Not GPS-accurate."

### F3. "No logs" trust banner
- **What:** Sticky/prominent banner at the top: "We do not log your IP, do not store analytics that include it, and serve this page over HTTPS. Read our [privacy policy](/privacy)."
- **Why:** Trust is the entire product. AdSense reviewers and users both need to see this.

### F4. User-agent + screen info
- **What:** Collapsible card showing user-agent string, screen resolution, browser language, color depth, cookie enabled, JS enabled.
- **Why:** Sysadmins debugging user-reported issues; often what `whatismyip.com` shows.

### F5. Copy-to-clipboard
- **What:** Per-field copy icon. Visual feedback on click.

### F6. Mobile responsive
- **What:** Layout works on 360px width.
- **Acceptance:** IP readouts are huge and readable; cards stack vertically.

## P1 — should ship in V1.1

### F7. "Are you on a VPN?" heuristic
- **What:** Compare IP country vs browser timezone (Intl.DateTimeFormat). Mismatch is a soft signal.
- **Display:** "Likely using a VPN or proxy" badge with explanation.
- **Caveat:** This is heuristic, not definitive. Surface that.

### F8. DNS leak test
- **What:** Make several requests to diagnostic subdomains (e.g. `dns-test.example.com` × 5) and surface all the resolved IPs. If they all match your public IP, no leak. If they show your ISP's DNS resolver, leak.
- **Acceptance:** Clearly explains the result; doesn't store the requests.

### F9. WebRTC leak test
- **What:** Use `RTCPeerConnection` to discover local network IPs that the browser would expose to a STUN server.
- **Display:** List of discovered IPs with a "leak detected" warning if local IPs are exposed.
- **Note:** Requires a STUN server. Use a public one (e.g. `stun.l.google.com:19302`) or self-host.

### F10. Educational content pages
- **`/what-is-an-ip-address`** — plain English, 800 words, for SEO.
- **`/what-is-an-isp`** — same.
- **`/am-i-using-a-vpn`** — same.
- **`/what-is-a-dns-leak`** — same.
- These capture the "learn" intent and cross-link back to the main tool.

## P2 — backlog

### F11. IPv6-only mode
Toggle to show only IPv6 (useful for testing IPv6-only deployments).

### F12. Port checker
"Sibling tool" page: `https://example.com:8080` reachable? Requires server-side proxy.

### F13. Whois lookup
Enter a domain or IP, get the WHOIS record. Captures "whois lookup" search traffic.

### F14. "Am I blacklisted?"
Check visitor IP against common DNSBLs (Spamhaus, etc.). Useful for email senders diagnosing deliverability.

## Out of scope (V1)

- Account system, persistent history — V3
- Mobile native app — V3
- VPN service or VPN-affiliate dark patterns — NEVER
- Storing visitor IP anywhere, ever — NEVER

## Cross-cutting

### SEO

- Single primary keyword per page; long-tail pages for "what is X" content (F10).
- Structured data: `WebApplication` schema on the IP-check page; `FAQPage` on the educational pages.
- `robots.txt` allows everything; `sitemap.xml` lists tools and educational pages.
- Page title format: `What Is My IP Address? {IP} | {site-name}`

### Analytics (Plausible / Umami ONLY)

- `page_view`, `copy_ip`, `copy_geo`, `expand_useragent`, `vpn_heuristic_view`, `dns_leak_run`, `webrtc_leak_run`.
- **Never** send the IP itself in any analytics event.

### Security & infra

- HTTPS only. HSTS preload.
- No third-party fonts / scripts on the IP page (every script is a potential IP-leaker).
- CSP header: `default-src 'self'; img-src https:; script-src 'self' 'unsafe-inline'`.
- Server logs: disable entirely, or pipe through a log scrubber that strips `x-forwarded-for` and `remote_addr`.
- DDoS protection: Cloudflare in front (Cloudflare sees IPs, but the origin doesn't need to).

### Accessibility

- IP readouts must have `aria-live="polite"` so screen readers announce when they appear.
- All copy buttons keyboard-accessible.
- Trust banner dismissible but reappears on next visit.
