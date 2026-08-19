/**
 * Name pool type — used by the JSON data files and the generator.
 */
export type Gender = 'masculine' | 'feminine' | 'neutral';

export interface NamePool {
  race: string;
  displayName: string;
  description: string;
  lore: string;
  pools: Record<Gender, string[]>;
}

/**
 * Fisher-Yates shuffle. Returns a new array, doesn't mutate input.
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Pick N unique random items from a pool.
 * If pool has fewer than N, returns the whole pool (deduped).
 */
export function pickN<T>(pool: readonly T[], n: number): T[] {
  if (pool.length <= n) {
    return Array.from(new Set(pool));
  }
  return shuffle(pool).slice(0, n);
}

/**
 * Generate N names for a given (race, gender) from the bundled JSON.
 */
export function generateNames(
  pool: NamePool,
  gender: Gender,
  count: number = 10
): string[] {
  const candidates = pool.pools[gender] ?? pool.pools.neutral ?? [];
  return pickN(candidates, count);
}
