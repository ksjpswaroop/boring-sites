# Word List Source

LexJolt uses a local, precompiled word list for validation and unscrambling.
The web app and Apple app do not call a remote API to decide whether a word is
valid.

## Current Source

- Source: [Wordnik Wordlist](https://github.com/wordnik/wordlist)
- Source file: `wordlist-20210729.txt`
- Raw source URL: `https://raw.githubusercontent.com/wordnik/wordlist/main/wordlist-20210729.txt`
- License: [MIT](https://github.com/wordnik/wordlist/blob/main/LICENSE)
- Purpose: open-source word list for game developers and English word games.

The generated app dictionaries are filtered to uppercase alphabetic words from
2 to 15 letters so they match the current LexJolt input cap and avoid phrases,
punctuation, and words the UI cannot enter.

## Generated Files

Run this from `sites/wordunscrambler`:

```sh
pnpm dictionary:build
```

Generated files:

- `src/data/words.json`
- `public/anagram-index.json`
- `apple/WordGameCore/Sources/WordGameCore/Resources/words.json`
- `apple/WordGameCore/Sources/WordGameCore/Resources/anagram-index.json`

Definitions remain separate and are fetched on demand from the existing
definition flow. The validation dictionary is local and offline-capable.
