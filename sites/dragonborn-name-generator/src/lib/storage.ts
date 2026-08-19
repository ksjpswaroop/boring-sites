/**
 * Tiny wrapper around localStorage. SSR-safe (no-op on server).
 * Used to remember the last (race, gender) selection across visits.
 */

const PREFIX = 'boring-sites:dragonborn:';

export function saveLast<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage might be disabled or full; fail silently
  }
}

export function loadLast<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
