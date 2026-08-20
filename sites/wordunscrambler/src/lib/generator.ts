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

export async function loadIndex(path = '/anagram-index.json'): Promise<Map<string, string[]>> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load word index: ${response.status}`);
  }

  const data = await response.json() as Record<string, string[]>;
  return new Map(Object.entries(data));
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

export interface ResultFilterOptions {
  minLength: number;
  maxLength: number;
  mustContain: string;
  exact: boolean;
  letters?: string;
  sort: 'alpha' | 'length' | 'score';
}

export function filterResults(words: string[], options: ResultFilterOptions): string[] {
  const minLength = Math.max(2, Math.min(15, options.minLength || 2));
  const maxLength = Math.max(minLength, Math.min(15, options.maxLength || 15));
  const required = normalizeLetters(options.mustContain || '');
  const exactLength = options.exact ? normalizeLetters(options.letters || '').length : 0;

  const filtered = words.filter((word) => {
    if (word.length < minLength || word.length > maxLength) return false;
    if (exactLength && word.length !== exactLength) return false;
    if (required && !required.split('').every((letter) => word.includes(letter))) return false;
    return true;
  });

  if (options.sort === 'alpha') filtered.sort();
  else if (options.sort === 'length') filtered.sort((a, b) => b.length - a.length || a.localeCompare(b));
  else filtered.sort((a, b) => scrabbleScore(b) - scrabbleScore(a) || b.length - a.length || a.localeCompare(b));

  return filtered;
}

export interface DailyJoltPuzzle {
  key: string;
  letters: string;
  required: string;
}

export const DAILY_JOLT_PUZZLES: DailyJoltPuzzle[] = [
  { key: 'planet-a', letters: 'PLANETS', required: 'A' },
  { key: 'trains-e', letters: 'TRAINES', required: 'E' },
  { key: 'roasted-r', letters: 'ROASTED', required: 'R' },
  { key: 'stainer-t', letters: 'STAINER', required: 'T' },
  { key: 'cranest-e', letters: 'CRANEST', required: 'E' },
  { key: 'dealing-d', letters: 'DEALING', required: 'D' },
  { key: 'monster-o', letters: 'MONSTER', required: 'O' },
  { key: 'gardens-g', letters: 'GARDENS', required: 'G' },
  { key: 'silence-e', letters: 'SILENCE', required: 'E' },
  { key: 'oranges-o', letters: 'ORANGES', required: 'O' },
  { key: 'rations-n', letters: 'RATIONS', required: 'N' },
  { key: 'credits-e', letters: 'CREDITS', required: 'E' },
  { key: 'hearing-r', letters: 'HEARING', required: 'R' },
  { key: 'leaping-p', letters: 'LEAPING', required: 'P' },
  { key: 'senator-s', letters: 'SENATOR', required: 'S' },
  { key: 'relates-l', letters: 'RELATES', required: 'L' },
  { key: 'actions-t', letters: 'ACTIONS', required: 'T' },
  { key: 'painter-p', letters: 'PAINTER', required: 'P' },
  { key: 'reading-r', letters: 'READING', required: 'R' },
  { key: 'coasted-s', letters: 'COASTED', required: 'S' },
  { key: 'eastern-a', letters: 'EASTERN', required: 'A' },
  { key: 'resound-r', letters: 'RESOUND', required: 'R' },
  { key: 'teacher-t', letters: 'TEACHER', required: 'T' },
  { key: 'players-p', letters: 'PLAYERS', required: 'P' },
  { key: 'largest-l', letters: 'LARGEST', required: 'L' },
  { key: 'cabinet-a', letters: 'CABINET', required: 'A' },
  { key: 'deposit-e', letters: 'DEPOSIT', required: 'E' },
  { key: 'nearest-n', letters: 'NEAREST', required: 'N' },
  { key: 'closing-c', letters: 'CLOSING', required: 'C' },
  { key: 'measure-m', letters: 'MEASURE', required: 'M' },
];

export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function dailyJoltPuzzleForDate(date = new Date()): DailyJoltPuzzle {
  const dayNumber = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  return DAILY_JOLT_PUZZLES[dayNumber % DAILY_JOLT_PUZZLES.length];
}

export function canBuildWord(word: string, letters: string): boolean {
  const counts: Record<string, number> = {};
  for (const letter of normalizeLetters(letters)) counts[letter] = (counts[letter] || 0) + 1;
  for (const letter of normalizeLetters(word)) {
    counts[letter] = (counts[letter] || 0) - 1;
    if (counts[letter] < 0) return false;
  }
  return true;
}

export function rushScore(word: string): number {
  return scrabbleScore(word) + Math.max(0, normalizeLetters(word).length - 3) * 2;
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
