# Word List Source

LexJolt uses a local, precompiled word list for validation and unscrambling.
The web app and Apple app do not call a remote API to decide whether a word is
valid.

## Sources

- [Open English WordNet 2025](https://en-word.net/downloads), CC BY 4.0,
  provides the core lemmas, parts of speech, definitions, examples, forms, and
  available IPA pronunciations.
- [SCOWL v2](https://github.com/en-wl/wordlist), an MIT-like/BSD-compatible
  collection pinned to the commit recorded in the generated manifest, provides
  standard American-English inflections and function words at size 60.
- [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict), whose
  commercial and research use is unrestricted with attribution requested,
  fills pronunciation gaps.

The compiler preserves source casing and accepts lowercase alphabetic entries
from 2 to 15 letters. Proper names, uppercase acronyms, abbreviations,
standalone prefixes and suffixes, punctuation, numbers, and explicit denylist
entries are excluded. Lexicalized words such as `RADAR`, `LASER`, and `SCUBA`
remain because their source entries are ordinary lowercase dictionary words.

The downloaded files in `/Users/swaroop/Downloads` are useful for coverage
comparison but are not production sources because they combine common words
with names, acronyms, obsolete terms, punctuation, and numbers.

## Generated Files

Run this from `sites/wordunscrambler`:

```sh
pnpm dictionary:build
```

Generated files:

- `src/data/words.json`
- `public/anagram-index.json`
- `public/word-details/<prefix>.json`
- `src/data/lexicon-manifest.json`
- `apple/WordGameCore/Sources/WordGameCore/Resources/words.json`
- `apple/WordGameCore/Sources/WordGameCore/Resources/anagram-index.json`
- `apple/WordGameCore/Sources/WordGameCore/Resources/lexicon.sqlite`
- `apple/WordGameCore/Sources/WordGameCore/Resources/lexicon-manifest.json`

Dictionary generation requires Node.js 22, Git, Python 3, Make, SQLite, and
Unzip. Sources are pinned by release, commit, and SHA-256 checksum. The regular
web and Vercel builds consume committed generated assets and do not download or
compile dictionary sources.

Definitions are loaded from same-origin two-letter shards. The external
dictionary service is an optional fallback only; temporary service failures do
not affect solving or locally bundled details.
