# PRD — Dragonborn Name Generator

**Project:** `sites/dragonborn-name-generator`
**Source:** Jonathan's Jam `nQOGK72IHx8` — Clearscope opportunity cited
**Benchmark revenue:** TBD · $10–$200/mo realistic Y1
**Owner:** TBD
**Status:** 🔲 not started

---

## 1. Overview

A fantasy character name generator for D&D / Skyrim / tabletop RPG players. Pick a race (Dragonborn, Elf, Dwarf, Tiefling, Halfling, Human) and a gender; get 10 names. Pure fun, evergreen niche — fantasy naming never goes out of style. **Good low-stakes first project to learn the build loop.**

## 2. Problem & users

D&D players starting a new campaign stare at a blank character sheet and don't know what to name their level-1 Dragonborn Paladin. The current way is a 20-minute Wikipedia dive or just "Steve the Brave". A generator is faster and often produces a name more interesting than what the player would have come up with.

**Primary users:** D&D 5e players starting a new character, Skyrim players building a custom character, Pathfinder / OSR players, writers of fantasy fiction, worldbuilders working on conlangs and naming conventions.

## 3. Goals & success metrics

| Metric           | 3-month target | 12-month target |
| ---------------- | -------------- | --------------- |
| Monthly visitors | 100            | 5K              |
| AdSense approval | Yes            | —               |
| Monthly revenue  | $1–$10         | $50–$300        |
| Avg. session     | 30s+           | 60s+            |

## 4. Non-goals (V1)

- Account system
- Saving characters across devices
- Direct D&D Beyond / Roll20 integration
- Mobile native app
- Any feature requiring payment

## 5. User stories

1. As a D&D player, I want to pick "Dragonborn, masculine" and get 10 names inspired by official lore.
2. As a writer, I want to click "Regenerate" until I find a name I like.
3. As a phone user, I want the names to be readable and the buttons to be touch-friendly.
4. As a curious user, I want a one-paragraph explanation of Dragonborn naming conventions.
5. As a deep user, I want a list of "Related generators" (towns, quests, magic items).
6. As a first-time visitor, I want to see an example result before picking, so I know what I'm getting.
7. As a returner, I want my last race and gender pre-selected.

## 6. Differentiation

What beats the existing fan-project generators:

1. **Beautiful UI** — most fan projects are ugly. Clean, modern UI wins. Dark mode, real typography, generous spacing.
2. **Pronunciation hints** — phonetic guide per name (e.g. `Arjhan` → "AR-jan"). Nobody does this. *(Feature F10)*
3. **Meaning / origin notes** — 1-line etymology per name. Adds depth without being verbose. *(Feature F11)*
4. **Lore page per race** — captures "Dragonborn lore", "Elf naming 5e" queries. SEO + education. *(Feature F9)*
5. **AI-generated lore snippets** — for each name, auto-generate a 1-paragraph origin story on the fly. **AI-native** — incumbents can't add this without rebuilding.
6. **Ecosystem of related generators** — town, quest, magic item, NPC. The compounder. *(Features F15–F18)*
7. **Open data** — name pools as JSON on GitHub. Community contribution. *(V2)*
8. **Tasteful "not affiliated" disclaimer** — done with class, not buried. Persistent banner, prominent on every page.
9. **Portfolio cross-linking** — links to the rest of the boring-sites portfolio from every page. *(Portfolio moat — see `../../../strategy/stand-out.md`.)*

## 7. Functional scope (high level)

- Race picker: Dragonborn, Elf, Dwarf, Tiefling, Halfling, Human
- Gender picker: Masculine / Feminine / Gender-neutral
- Generate 10 names button
- Per-name "Regenerate", "Copy"
- "Regenerate all" button
- Lore explainer per race (educational content for SEO)
- Related generators sidebar: town, quest, magic item, NPC

Full spec: see [`features.md`](./features.md).

## 8. Non-functional requirements

- Generation: **< 50ms** (just shuffle from a pre-built name pool)
- All client-side
- Lighthouse: 95+
- Mobile-first

## 9. Monetization

- **Google AdSense:** header, sidebar, footer
- **Affiliate (V2):** D&D books on Amazon, miniatures, dice sets
- **Open-source the front-end on GitHub** — differentiator for whatismyip, helps SEO for the rest

## 10. Compliance & legal

- "Fan-made, not affiliated with Wizards of the Coast or Bethesda" disclaimer prominent on every page
- Names generated should be **transformative** — inspired by, not copied from, official source material
- Pages: Privacy, Terms, About (with the IP disclaimer), Contact

## 11. Open questions

1. How big should the name pool be per race? (Start with 100, expand based on engagement.)
2. Pronunciation hint feature — phonetic guide next to each name?
3. Meanings / origins — worth curating?
4. Tiefling and Elven naming in D&D has very specific conventions; do we follow them strictly or use our own flair?

## 12. Launch criteria

- [ ] All P0 features shipped
- [ ] AdSense approved
- [ ] Real domain connected
- [ ] 4 legal pages + IP disclaimer live
- [ ] "Not affiliated" banner prominent on every page
- [ ] Submitted to Google Search Console
- [ ] First page indexed within 14 days
- [ ] At least 100 names per race, hand-curated (not LLM-spam)
