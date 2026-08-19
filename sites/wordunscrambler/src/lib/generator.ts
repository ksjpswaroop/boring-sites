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

  // Build a frequency map of the input letters
  const inputCounts: Record<string, number> = {};
  for (const ch of normalized) {
    inputCounts[ch] = (inputCounts[ch] || 0) + 1;
  }

  // For every possible subset of lengths 2..N of the input,
  // look up the signature in the index and filter by letter availability.
  // Optimization: pre-compute all signatures that ARE possible given the input.
  const results: string[] = [];
  for (const [sig, words] of index) {
    if (sig.length > normalized.length) continue;
    // Check if sig can be formed from the input letters
    let ok = true;
    const sigCounts: Record<string, number> = {};
    for (const ch of sig) {
      sigCounts[ch] = (sigCounts[ch] || 0) + 1;
      if (sigCounts[ch] > (inputCounts[ch] || 0)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      for (const w of words) results.push(w);
    }
  }

  return results;
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
