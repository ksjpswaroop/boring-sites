# @boring-sites/analytics

Plausible Analytics include, shared across the portfolio. Cookieless, GDPR-compliant, no IP storage.

## Setup

Each site sets two env vars (in `.env` or Vercel project settings):

```env
PUBLIC_PLAUSIBLE_DOMAIN=dragonbornnames.example.com
PUBLIC_PLAUSIBLE_SRC=https://plausible.io   # or your self-hosted instance
```

## Usage

Already wired into the shared `Layout.astro` — no per-page import needed. If you want to track custom events, use the global helper:

```js
window.plausible('generate_click', { props: { race: 'dragonborn', gender: 'masculine' } });
```

## Why Plausible (and not Google Analytics)

- **No cookies** — GDPR-compliant by default
- **No IP storage** — preserves whatismyip's no-logs claim
- **Lightweight** — < 1 KB script
- **Privacy-friendly** — does not track users across sites

We deliberately do NOT enable Vercel Web Analytics on any of the 6 sites. See `../../../strategy/tech-stack.md` for the reasoning.
