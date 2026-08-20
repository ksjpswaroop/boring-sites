# wordunscrambler

**Benchmark revenue:** ~$500K/month · ~$6M/year (Jonathan's Jam example)
**Reference site:** `wordunscrambler.me` (11M visitors/mo, 55M page views/mo, $9 RPM)
**Clone domain picked in video:** `wordunscrambled.com`

## What it does

User types in a jumble of letters. Site returns all valid English words that can be formed from those letters, ideally with length and definition.

## Target keywords (seed)

- "word unscrambler"
- "unscramble words"
- "unscramble letters"
- "scrabble word finder"
- "anagram solver"

## Build plan

- [ ] Validate keyword set in Clearscope / Ahrefs
- [ ] Pick domain (`wordunscrambled.com` already taken in the video; pick a clean alternative)
- [ ] Build with the boring-sites stack (Astro + Tailwind on Vercel) — see [tech-stack](../../strategy/tech-stack.md)
- [ ] Add About, How-to, FAQ pages
- [ ] Add 2–3 related tools (e.g., anagram solver, scrabble word checker, letter rearranger)
- [ ] Add legal pages
- [ ] Apply for AdSense, install snippet, request review
- [ ] Submit to Google Search Console
- [ ] (Optional) Open-source the front-end on GitHub — differentiator for whatismyip, helps SEO for the rest

## Notes

This is the canonical example from the video. The actual $500K/mo number is a top-of-market benchmark — new clones realistically earn $20–$200/mo initially. Treat the number as the ceiling, not the baseline.

---

## Development

### Run locally

```bash
pnpm install
pnpm --filter wordunscrambler dev
# Open http://localhost:4321
```

### How the unscrambler works

`src/lib/generator.ts` exports three pure functions:
- `normalizeLetters(input)` — strips non-A-Z, uppercases, caps at 15 chars
- `buildIndex(words)` — pre-computes a Map from sorted-letters signature → list of words (built once at module load)
- `solve(letters, index)` — given input letters, finds every word whose sorted signature is a subset of the input's letter multiset

For 7-letter input, this returns results in < 50ms. The word list is bundled at build time — no API calls.

### Production lexicon

The generated dictionary combines pinned Open English WordNet, SCOWL, and CMU
Pronouncing Dictionary sources. It excludes proper names and acronyms while
shipping definitions and pronunciations locally. See
[`docs/word-list-source.md`](docs/word-list-source.md) for the acceptance policy,
source licenses, and deterministic build command.

### V1.1 backlog

- Per-letter SEO landing pages (e.g. `/unscramble/aetprs`) pre-rendered for top 10K inputs
- Expand local definition and pronunciation coverage
- Open solver API at `/api/solve?letters=aetprs`
- i18n (Spanish, French, German word lists)

See `../docs/prd.md` for launch criteria and `../docs/features.md` for the full feature spec.
