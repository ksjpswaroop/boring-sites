# Boring Sites

A portfolio of **boring utility sites** that earn passive ad revenue from high-intent Google search traffic. Model inspired by Jonathan's Jam's video *"This Boring Website Earns $6M/Year"* (`nQOGK72IHx8`).

> **Success formula:** `(Right Niche) × (Fast Execution) × (Portfolio Approach) × (Persistence)`

> 🚀 **Ready to ship?** See [`DEPLOY.md`](./DEPLOY.md) for the full git init → Vercel → domain → Plausible → AdSense walkthrough.

## Layout

```
boring-sites/
├── README.md                      ← you are here
├── research/                      ← source material that justifies the model
│   ├── transcripts/               ← raw YouTube transcripts
│   └── summaries/                 ← structured summaries
├── strategy/                      ← business model, criteria, keyword pipeline
├── sites/                         ← one folder per utility site
│   ├── wordunscrambler/           ← $500K/mo benchmark
│   ├── sleep-calculator/          ← $9K/mo benchmark
│   ├── whatismyip/                ← $111K/mo benchmark
│   ├── calculator-collection/     ← $825K/mo benchmark (portfolio of calculators)
│   ├── phone-number-generator/    ← opportunity (Clearscope example)
│   └── dragonborn-name-generator/ ← opportunity (Clearscope example)
└── _templates/                    ← reusable scaffolds (AdSense boilerplate, legal pages, design tokens, etc.)
```

## Portfolio

| Site | Benchmark revenue | Source | Status |
|------|-------------------|--------|--------|
| `wordunscrambler` | ~$500K/mo | Jonathan's Jam example (`wordunscrambled.com` clone) | 🔲 not started |
| `sleep-calculator` | ~$9K/mo | Video case study | 🔲 not started |
| `whatismyip` | up to $111K/mo | Video case study | 🔲 not started |
| `calculator-collection` | ~$825K/mo | `calculator.net` (100+ tools) | 🔲 not started |
| `phone-number-generator` | TBD | Clearscope opportunity | 🔲 not started |
| `dragonborn-name-generator` | TBD | Clearscope opportunity | 🔲 not started |

## Selection criteria (from research/)

A site is worth building only if **all four** are true:

1. **High search volume** — 10K+ monthly searches for the seed query
2. **Low competition** — keyword difficulty < 10/100
3. **New sites ranking** — Google is actively looking for better results
4. **Web-app solvable** — the query is answered by a tool, not an article

See `strategy/` for the keyword research pipeline and `research/summaries/YouTube_Summary_Boring_Website_6M.md` for the full framework.

## Build loop (per site)

1. Validate the keyword (Clearscope / Ahrefs / SEMrush / Ubersuggest) — see [`strategy/`](./strategy/)
2. Build with the boring-sites stack — **Astro + TypeScript + Tailwind on Vercel**. See [`strategy/tech-stack.md`](./strategy/tech-stack.md).
3. Add supporting content: About, How-to, FAQ, 2–3 related tools
4. Add legal pages: Privacy, Terms, Cookies, Contact (use the shared `packages/legal/` boilerplate)
5. Connect a real domain via **Cloudflare Registrar** (~$12/yr) — never publish on a temp subdomain, they hurt SEO
6. Apply for **Google AdSense**, install the verification snippet, request review
7. Submit to **Google Search Console**; publish to relevant communities
8. (Optional) Open-source the front-end on GitHub — differentiator for whatismyip, helps SEO for the rest
