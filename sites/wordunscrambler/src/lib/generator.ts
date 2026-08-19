/**
 * Word unscramble engine.
 * Pure functions — run client-side.
 */

/** Normalize input letters: uppercase, A–Z only, max 15 chars. */
export function normalizeLetters(input: string): string {
  return input.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 15);
}

/** Sort the letters of a word to produce a signature. */
function signature(word: string): string {
  return word.toUpperCase().split('').sort().join('');
}

/** Build an index from sorted-letters signature → list of words. */
export function buildIndex(words: readonly string[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const word of words) {
    const w = word.toUpperCase();
    if (w.length < 2) continue;
    const sig = signature(w);
    if (!index.has(sig)) index.set(sig, []);
    index.get(sig)!.push(w);
  }
  // Dedupe each bucket (the list might contain both 'WORD' and 'word')
  for (const [k, v] of index) {
    index.set(k, Array.from(new Set(v)).sort());
  }
  return index;
}

/**
 * Given a string of input letters, return all dictionary words that can
 * be formed from a subset of those letters (in any order).
 */
export function solve(letters: string, index: Map<string, string[]>): string[] {
  const normalized = normalizeLetters(letters);
  if (normalized.length < 2) return [];

  const counts: Record<string, number> = {};
  for (const ch of normalized) {
    counts[ch] = (counts[ch] || 0) + 1;
  }

  const lettersByKind = Object.keys(counts).sort();
  const results = new Set<string>();

  function visit(letterIndex: number, signature: string): void {
    if (signature.length >= 2) {
      const bucket = index.get(signature);
      if (bucket) {
        for (const word of bucket) results.add(word);
      }
    }

    if (letterIndex >= lettersByKind.length) return;

    const letter = lettersByKind[letterIndex];
    const maxCount = counts[letter] || 0;
    for (let count = 0; count <= maxCount; count++) {
      visit(letterIndex + 1, signature + letter.repeat(count));
    }
  }

  visit(0, '');
  return Array.from(results);
}

/** Scrabble tile score (NA tournament values). */
const TILE_SCORES: Record<string, number> = {
  A: 1, E: 1, I: 1, O: 1, U: 1, L: 1, N: 1, S: 1, T: 1, R: 1,
  D: 2, G: 2,
  B: 3, C: 3, M: 3, P: 3,
  F: 4, H: 4, V: 4, W: 4, Y: 4,
  K: 5,
  J: 8, X: 8,
  Q: 10, Z: 10,
};

export function scrabbleScore(word: string): number {
  let s = 0;
  for (const ch of word.toUpperCase()) s += TILE_SCORES[ch] || 0;
  return s;
}
