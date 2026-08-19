# phone-number-generator

**Benchmark revenue:** TBD (new build)
**Source:** Clearscope opportunity cited in the video — "phone number generator" has high search volume and new sites ranking on page 1

## What it does

Generates random valid-format phone numbers for any country / area code. Useful for testing, sign-up forms, sample data, screenshots, and the "lorem ipsum" crowd.

## Target keywords (seed)

- phone number generator
- random phone number generator
- fake phone number generator
- US phone number generator
- UK phone number generator
- mobile number generator

## Build plan

- [ ] Validate the Clearscope signal is still good (search volumes shift)
- [ ] Pick domain (e.g., `randomphonegen.com`, `phonenumbermaker.com`)
- [ ] Build with the boring-sites stack (Astro + Tailwind on Vercel) — country picker, area code picker, count, copy-to-clipboard. See [tech-stack](../../strategy/tech-stack.md)
- [ ] Add About, How-to, FAQ
- [ ] Add related tools: email generator, name generator, address generator, IMEI generator
- [ ] Add legal pages (and a prominent banner: "These numbers are not assigned — do not use for fraud or harassment")
- [ ] Apply for AdSense, install snippet, request review
- [ ] Submit to Google Search Console

## Notes

Use-case is non-controversial (dev / QA / sign-up forms) but the word "fake" attracts shady traffic. Keep the copy on the up-and-up and the legal pages airtight.

---

## Development

### Run locally

```bash
pnpm install
pnpm --filter phone-number-generator dev
# Open http://localhost:4321
```

### How generation works

`src/lib/generator.ts` exports `COUNTRIES` — a config object for each supported country with:
- `hasAreaCodes` — whether the country uses area codes
- `areaCodes` — the bundled list (US: 300+, CA: 40+)
- `pattern(area?)` — the format function that produces a string

The client-side `pattern` function in the component generates numbers by:
1. Selecting an area code (user-chosen or random from the list)
2. Picking 7 random digits for the subscriber portion
3. Formatting as `(NNN) NNN-NNNN` (or the country's local format)

### Adding a country

1. Add a new entry to the `COUNTRIES` object in `src/lib/generator.ts` with code, name, flag, hasAreaCodes, and pattern
2. Add it to the `countrySelect` dropdown in `src/components/Generator.astro` (and the embedded client-side `COUNTRIES` object in the script)
3. Add a new `<a>` card in `src/pages/index.astro` under "By country"

### The trust banner

The "not real numbers" banner is non-dismissible and appears above the generator. This is the differentiator — most competitors in this category are spammy or sketchy, and a clear "this is what we are" message wins trust.

### V1.1 backlog

- E.164 / national / international format toggle
- CSV / JSON export
- Mobile-vs-landline filter (US has portable area codes)
- Open API at `/api/phone?country=US&count=10`
- Per-country SEO landing pages (e.g. `/us-phone-numbers`, `/uk-phone-numbers`) with pre-loaded generator

See `../docs/prd.md` and `../docs/features.md`.
