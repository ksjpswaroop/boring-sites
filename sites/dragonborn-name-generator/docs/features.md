# Features — Dragonborn Name Generator

**Project:** `sites/dragonborn-name-generator`
**Status:** 🔲 not started

---

## Priority table

| ID  | Feature                            | Priority | Status | Notes                                 |
| --- | ---------------------------------- | -------- | ------ | ------------------------------------- |
| F1  | Race picker                        | P0       | 🔲     | 6 races V1                            |
| F2  | Gender picker                      | P0       | 🔲     | Masc / Fem / Neutral                  |
| F3  | Name pool (per race × gender)      | P0       | 🔲     | 100+ names each, hand-curated         |
| F4  | Generate 10 names                  | P0       | 🔲     | Click button → instant list           |
| F5  | Per-name copy + regenerate          | P0       | 🔲     | Single-name reroll                    |
| F6  | "Regenerate all" button            | P0       | 🔲     | Fresh batch                           |
| F7  | "Not affiliated" trust banner      | P0       | 🔲     | Fan project disclaimer                |
| F8  | Mobile responsive                  | P0       | 🔲     | First-class mobile                    |
| F9  | Lore page per race                 | P1       | 🔲     | Educational content for SEO           |
| F10 | Pronunciation hint                 | P1       | 🔲     | Phonetic guide next to each name      |
| F11 | Meaning / origin                   | P1       | 🔲     | Curated                               |
| F12 | Favorites (localStorage)           | P1       | 🔲     | Star icon per name                    |
| F13 | Last race / gender remembered      | P1       | 🔲     | localStorage                          |
| F14 | Related generators sidebar         | P1       | 🔲     | Town, quest, magic item, NPC          |
| F15 | Town name generator (sibling)      | P2       | 🔲     | Captures another search query         |
| F16 | Quest / mission name generator     | P2       | 🔲     | Sibling                               |
| F17 | Magic item name generator          | P2       | 🔲     | Sibling                               |
| F18 | NPC name generator                 | P2       | 🔲     | Sibling                               |

## P0 — must ship at launch

### F1. Race picker
- **What:** 6 large buttons (or a styled select) for the supported races.
- **V1 list:** Dragonborn, Elf, Dwarf, Tiefling, Halfling, Human.
- **Each button shows:** race name, a tiny icon (dragon head, leaf, hammer, etc.), and a 1-line description.

### F2. Gender picker
- **What:** Three buttons: Masculine | Feminine | Gender-neutral.
- **Behavior:** Default: Masculine. Persists to localStorage.
- **Note:** D&D 5e allows any combination. We surface this as a non-judgmental choice.

### F3. Name pool
- **Format:** JSON file per (race, gender) with 100+ names.
- **Source:** Hand-curated. Inspired by official D&D / Skyrim naming conventions but not copied from them. Cross-check for accidental duplicates with WotC / Bethesda IP.
- **Example (Dragonborn masc):** `["Arjhan", "Balasar", "Donaar", "Ghesh", "Heskan", "Kriv", "Medrash", "Mehen", "Nadarr", "Pandjed", ...]`
- **Acceptance:** Each pool has ≥ 100 unique names; no duplicates within a pool.

### F4. Generate 10 names
- **What:** Click → pick 10 random unique names from the chosen pool, render as a list.
- **Algorithm:** Fisher-Yates shuffle, slice first 10.
- **Acceptance:** < 50ms; no duplicates within a result.

### F5. Per-name copy + regenerate
- **What:** Each name has a copy icon and a "reroll" icon.
- **Copy:** Copies the name to clipboard; toast "Copied".
- **Reroll:** Replaces just that name with a new random pick from the pool (excludes the other 9 currently shown).

### F6. "Regenerate all" button
- **What:** Above the list, one button to generate a fresh batch of 10.
- **Acceptance:** Resets the list; does not preserve favorites across this action.

### F7. "Not affiliated" trust banner
- **What:** Persistent banner on every page:
  > 🎲 **Fan-made project. Not affiliated with, endorsed by, or sponsored by Wizards of the Coast, Bethesda, or Hasbro. All names are original and transformative.**
- **Why:** WotC and Bethesda are protective of their IP. Visible disclaimer keeps the project on the right side of the line.

### F8. Mobile responsive
- **What:** Works on 360px width.
- **Acceptance:** Race buttons are large and tappable; result list is one name per row; icons are touch-friendly.

## P1 — should ship in V1.1

### F9. Lore page per race
- **Route:** `/races/dragonborn`, `/races/elf`, etc.
- **What:** 400–600 words of educational content: history, naming conventions, cultural notes, sample famous characters.
- **SEO value:** Captures "Dragonborn lore", "Elf naming 5e" queries.
- **Cross-link:** from the generator page's race buttons.

### F10. Pronunciation hint
- **What:** Below each name, a small phonetic guide (e.g. `Arjhan` → "AR-jan").
- **Format:** IPA or simple syllable stress marks; both work.
- **Why:** Players want to say the name out loud at the table without butchering it.

### F11. Meaning / origin
- **What:** A 1-line etymological note (curated, not invented): "From the Draconic root for 'river'".
- **Acceptance:** At least 50% of the pool has a curated meaning.

### F12. Favorites
- **What:** Star icon per name; starred names saved to localStorage.
- **UI:** "Show favorites" toggle that filters the list.

### F13. Last race / gender remembered
localStorage stores the last picks; restored on next visit.

### F14. Related generators sidebar
- **What:** Below the result list: "Try the [town name generator] / [quest name generator] / [magic item name generator] / [NPC name generator]."
- **V1:** Just placeholder links. V2: build the actual generators (F15–F18).

## P2 — backlog

### F15. Town name generator
Sibling page at `/town-name-generator`. Captures "fantasy town name generator" search traffic.

### F16. Quest name generator
Sibling page at `/quest-name-generator`. "The Lost Crown of X", "Ashes of Y", etc.

### F17. Magic item name generator
Sibling page at `/magic-item-name-generator`. "Sword of Whispers", "Cloak of Midnight", etc.

### F18. NPC name generator
Sibling page at `/npc-name-generator`. Tavern-keepers, merchants, nobles, rogues.

## Out of scope (V1)

- Account system, cross-device sync — V2
- Mobile native app — V3
- Direct D&D Beyond / Roll20 integration — V3
- Anything that requires payment — NEVER (free forever)
- Selling D&D content / game assets — NEVER

## Cross-cutting

### SEO

- One landing page per race: `/dragonborn-names`, `/elf-names`, `/dwarf-names`, etc.
- One lore page per race (F9).
- One "how to name a fantasy character" guide page at `/guides/naming`.
- Structured data: `WebApplication` on the generator; `Article` on lore pages.
- Title format: `{Race} Name Generator — 10 Names at a Time | {site-name}`

### Analytics (Plausible / Umami)

- `race_pick`, `gender_pick`, `generate_click`, `copy_name`, `reroll_single`, `reroll_all`, `favorite_toggle`, `related_generator_click`.

### Compliance

- IP disclaimer banner non-dismissible.
- Names JSON reviewed manually before launch to confirm no accidental WotC / Bethesda names.
- Terms of Service references fan-project status.

### Accessibility

- Race and gender pickers are real `<button>` elements (or `<input type="radio">` for gender).
- Result rows are `<button>` for copy, with `aria-label="Copy Arjhan"`.
- Lore pages are properly nested `<h1>` / `<h2>` / `<h3>`.
- Color is never the only signal — race buttons also have icons.
