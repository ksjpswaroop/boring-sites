# Deploy Cheat Sheet

From zero to live for all 6 boring-sites. One monorepo, six Vercel projects, six domains, one GitHub repo.

---

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 20+ | Vercel + Astro runtime |
| pnpm | 9+ | Workspace install |
| git | latest | Source control |
| GitHub account | — | Host the monorepo (public = the differentiator) |
| Vercel account | — | Host the 6 sites |
| Cloudflare account | — | Domain registrar + DNS + WHOIS privacy |

---

## 1. Local first run

```bash
cd /Users/swaroop/boring-sites
pnpm install                 # installs all 6 sites + 3 shared packages
pnpm dev                     # runs dragonborn on http://localhost:4321
```

**To run a different site:**

```bash
pnpm --filter whatismyip dev
pnpm --filter calculator-collection dev
pnpm --filter wordunscrambler dev
pnpm --filter sleep-calculator dev
pnpm --filter phone-number-generator dev
```

**Verify build for each site before deploying:**

```bash
pnpm --filter <site> build
```

If any build fails, fix locally before pushing. The error message is usually clear (missing import, bad path, etc.).

---

## 2. Git + GitHub (the differentiator is going public)

```bash
cd /Users/swaroop/boring-sites
git init
git add .
git commit -m "Initial monorepo scaffold: 6 sites, 3 shared packages, 102 code files"
```

**Create the GitHub repo:**
- Go to https://github.com/sceneweld-ai (or your org)
- New repository → name: `boring-sites` → **public** (this is the differentiator for whatismyip + SEO play for the rest)
- Do NOT initialize with README/license/.gitignore (we have them)

```bash
git remote add origin git@github.com:ksjpswaroop/boring-sites.git
git branch -M main
git push -u origin main
```

**Going forward:**

```bash
git add -A
git commit -m "Describe what you changed"
git push
```

Each `git push` triggers a Vercel deploy (once connected in step 3).

---

## 3. Vercel project setup (one per site)

For **each of the 6 sites**, do this:

1. Vercel dashboard → **Add New… → Project**
2. **Import** the `boring-sites` GitHub repo
3. **Project Name:** the site name (e.g. `boring-sites-dragonborn`, `boring-sites-whatismyip`, etc.)
4. **Root Directory:** click "Edit" → set to `sites/<site-slug>` (e.g. `sites/dragonborn-name-generator`, `sites/whatismyip`, `sites/calculator-collection`, `sites/wordunscrambler`, `sites/sleep-calculator`, `sites/phone-number-generator`)
5. **Build & Development Settings:** Vercel auto-detects Astro. Override if needed:
   - Build command: `pnpm build`
   - Install command: `pnpm install`
   - Output directory: `dist` (default for Astro)
6. **Environment Variables:** see step 5
7. **Deploy** — wait for the build, you'll get a `*.vercel.app` URL

**Repeat** for the other 5 sites. Each gets its own preview URL.

**Tip:** Do `dragonborn-name-generator` first as the canary (pure static, simplest). Once that deploys clean, do `whatismyip` (Edge Function), then the rest.

---

## 4. Custom domains

**Buy the 6 domains** (suggestions):

| Site | Suggested domain |
|---|---|
| dragonborn-name-generator | `dragonbornnames.com` |
| whatismyip | `whatismyipaddress.app` or `myip.dev` |
| calculator-collection | `calculatorhub.com` or `quickcalc.app` |
| wordunscrambler | `wordunscrambled.com` (if available) or `unscramble.cc` |
| sleep-calculator | `sleepcyclecalc.com` or `optimalbedtime.com` |
| phone-number-generator | `randomphonegen.com` |

**Register on Cloudflare Registrar** ($10–15/yr each, at-cost, free WHOIS privacy):
- https://dash.cloudflare.com → Domain Registration → Register Domains

**Connect to Vercel:**
- Vercel project → Settings → Domains → Add `example.com` and `www.example.com`
- Vercel gives you a CNAME target like `cname.vercel-dns.com`
- Cloudflare DNS → Add records:
  - `CNAME @ cname.vercel-dns.com` (or use the A record Vercel gives you)
  - `CNAME www cname.vercel-dns.com`
- Wait for DNS to propagate (usually < 5 min, sometimes up to 1 hour)
- Vercel auto-issues a Let's Encrypt SSL cert

**Update each site's config** to reflect the real domain:

```js
// sites/<site>/astro.config.mjs
export default defineConfig({
  site: 'https://yourdomain.com',  // ← change from .example.com
  // ...
});
```

Commit + push → Vercel auto-deploys.

---

## 5. Plausible Analytics env vars

For each Vercel project, set these in **Settings → Environment Variables**:

```
PUBLIC_PLAUSIBLE_DOMAIN = yourdomain.com
PUBLIC_PLAUSIBLE_SRC     = https://plausible.io   # or your self-hosted
```

- **Plausible Cloud** ($9/mo covers all 6 sites): use `https://plausible.io`
- **Self-hosted Plausible** (free, $5/mo VPS): use your instance URL

**Vercel Web Analytics — TURNED OFF for the whole portfolio.** This is non-negotiable for whatismyip's no-logs claim. Settings → Analytics → disable Web Analytics. Plausible is cookieless and doesn't store IPs.

---

## 6. AdSense

For each live site, after at least 10 pages exist with real content:

1. https://www.google.com/adsense → Start
2. Enter the domain
3. Fill out payment info
4. Get the verification snippet
5. In the Vercel-deployed site, verify the snippet is reachable (Google will check)
6. Request review (24-48 hours, sometimes longer)

**Approval requirements** (per the boring-sites "AdSense-ready" standard):
- ✅ Privacy, Terms, Contact, About pages live
- ✅ At least 200-300 words of original "how it works" content
- ✅ Real domain (not `.vercel.app`)
- ✅ For whatismyip: prominent "no logs" banner + airtight privacy policy

If rejected, fix the issues and re-apply. The boring-sites scaffold ships with everything AdSense reviewers typically look for.

---

## 7. Google Search Console

For each domain:

1. https://search.google.com/search-console → Add property → URL prefix
2. Verify via DNS TXT record (add to Cloudflare DNS)
3. Submit the sitemap: `https://yourdomain.com/sitemap-index.xml`
4. Wait 1-2 weeks for first crawl

The `@astrojs/sitemap` integration (already configured) generates the sitemap automatically at build time.

---

## 8. Per-site deploy checklist

For each site, before considering it "live":

- [ ] `pnpm --filter <site> build` succeeds locally
- [ ] GitHub: committed + pushed
- [ ] Vercel: project created, root dir = `sites/<site>`, build green
- [ ] Vercel: env vars set (`PUBLIC_PLAUSIBLE_DOMAIN`, `PUBLIC_PLAUSIBLE_SRC`)
- [ ] Vercel: Web Analytics **disabled** (for whatismyip especially)
- [ ] Cloudflare: domain registered, DNS pointing to Vercel
- [ ] Vercel: custom domain added, SSL cert active
- [ ] `astro.config.mjs`: `site:` updated to real domain
- [ ] All email addresses: `hello@<yourdomain>.com` (not `.example.com`)
- [ ] Plausible: domain added to your Plausible dashboard
- [ ] Google Search Console: property added, sitemap submitted
- [ ] AdSense: applied, pending review
- [ ] First 24h: monitor Vercel logs for errors

---

## 9. Going live order (recommended)

1. **dragonborn-name-generator** — pure static, simplest, validates the monorepo + Vercel pipeline end-to-end
2. **whatismyip** — validates the Edge Function / SSR config; sets the trust-play bar
3. **calculator-collection** — validates the dynamic-route pattern at scale (21 pages)
4. **wordunscrambler, sleep-calculator, phone-number-generator** — once the pipeline is proven, ship the rest in any order

Each site is independent. You can deploy them on the same day once the pattern is locked in.

---

## 10. Post-launch

- **Monitor:** Vercel Analytics (Logs tab) + Plausible dashboard
- **AdSense earnings:** check weekly for the first month, then monthly
- **Search Console:** check indexing status, fix any crawl errors
- **GitHub:** issues + discussions enable community contributions (the open-source differentiator)
- **V1.1 features:** add the per-site backlog items in priority order; each ships as a PR

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pnpm install` fails on pnpm version | `npm install -g pnpm@9` |
| Build fails: "Cannot find module @boring-sites/..." | Make sure Vercel root directory is `sites/<site>`, not the monorepo root |
| Vercel deploy succeeds but site is blank | Check `astro.config.mjs` `site:` field matches the deployed URL |
| Domain not resolving | Wait 1 hour for DNS; check Cloudflare nameservers are set at registrar |
| Plausible not tracking | Check `PUBLIC_PLAUSIBLE_DOMAIN` matches the actual domain (no `https://`, no trailing `/`) |
| AdSense rejected | Read the rejection email carefully; usually missing legal page or thin content |
| Vercel Web Analytics on by default | Disable in project Settings → Analytics; it stores IPs and breaks the no-logs claim |

---

## What this deploys

```
GitHub: ksjpswaroop/boring-sites (public, monorepo)
   │
   ├── Vercel project: boring-sites-dragonborn
   │     → root: sites/dragonborn-name-generator
   │     → domain: dragonbornnames.com
   │     → framework: Astro static
   │
   ├── Vercel project: boring-sites-whatismyip
   │     → root: sites/whatismyip
   │     → domain: whatismyipaddress.app
   │     → framework: Astro hybrid (Edge Function)
   │
   ├── ... (4 more)
   │
   └── Cloudflare Registrar: 6 domains
         → DNS pointing to Vercel
         → free WHOIS privacy
         → free DNSSEC
```

**Total cost at launch:** ~$10/mo Plausible + ~$72/yr domains + $0 Vercel (free tier) = **~$200/yr** for the whole portfolio.

**Total cost at scale (1M visitors/mo):** + $20/mo Vercel Pro = **~$450/yr**. AdSense revenue dwarfs this.
