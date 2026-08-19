/**
 * Sleep cycle math.
 * Pure functions. 90-min cycles + configurable time-to-fall-asleep.
 */

export const CYCLE_MINUTES = 90;
export const DEFAULT_FALL_ASLEEP_MINUTES = 14;

export interface OptimalTime {
  cycles: number;        // 6 = 9h, 5 = 7.5h, 4 = 6h, etc.
  hours: number;         // cycles * 1.5
  time: string;          // 'HH:MM' 24h
  label: string;         // 'Best for 9h of sleep'
  hoursLabel: string;    // '9h', '7.5h', etc.
}

/**
 * Convert 'HH:MM' to total minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Convert total minutes since midnight to 'HH:MM' 24h format.
 */
export function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Given a wake time, return the optimal bedtimes for 2-6 sleep cycles.
 * Subtracts `fallAsleepMinutes` for the time it takes to actually fall asleep.
 */
export function getBedtimesForWakeTime(
  wakeTime: string,
  fallAsleepMinutes: number = DEFAULT_FALL_ASLEEP_MINUTES,
  minCycles: number = 4,
  maxCycles: number = 6
): OptimalTime[] {
  const wakeMin = timeToMinutes(wakeTime);
  const results: OptimalTime[] = [];
  for (let c = minCycles; c <= maxCycles; c++) {
    const bedtimeMin = wakeMin - fallAsleepMinutes - c * CYCLE_MINUTES;
    results.push({
      cycles: c,
      hours: c * 1.5,
      time: minutesToTime(bedtimeMin),
      label: c === 6 ? 'Best for 9h of sleep' : c === 5 ? 'Best for 7.5h of sleep' : c === 4 ? 'Best for 6h of sleep' : c === 3 ? 'Best for 4.5h of sleep' : `Best for ${c * 1.5}h of sleep`,
      hoursLabel: c === 1 ? '1.5h' : `${c * 1.5}h`,
    });
  }
  // Return sorted by recommended cycles (most sleep first)
  return results.sort((a, b) => b.cycles - a.cycles);
}

/**
 * Given a bedtime, return the optimal wake times for 2-6 sleep cycles.
 * Adds `fallAsleepMinutes` for the time to fall asleep before cycles start.
 */
export function getWakeTimesForBedtime(
  bedtime: string,
  fallAsleepMinutes: number = DEFAULT_FALL_ASLEEP_MINUTES,
  minCycles: number = 4,
  maxCycles: number = 6
): OptimalTime[] {
  const bedMin = timeToMinutes(bedtime);
  const results: OptimalTime[] = [];
  for (let c = minCycles; c <= maxCycles; c++) {
    const wakeMin = bedMin + fallAsleepMinutes + c * CYCLE_MINUTES;
    results.push({
      cycles: c,
      hours: c * 1.5,
      time: minutesToTime(wakeMin),
      label: c === 6 ? 'Best for 9h of sleep' : c === 5 ? 'Best for 7.5h of sleep' : c === 4 ? 'Best for 6h of sleep' : c === 3 ? 'Best for 4.5h of sleep' : `Best for ${c * 1.5}h of sleep`,
      hoursLabel: c === 1 ? '1.5h' : `${c * 1.5}h`,
    });
  }
  // Return sorted by recommended cycles (most sleep first)
  return results.sort((a, b) => b.cycles - a.cycles);
}

/**
 * Build a deep link for setting an alarm on common platforms.
 * Returns the best-effort URL for the user's platform.
 */
export function buildAlarmDeepLink(time: string): { url: string; label: string } {
  if (typeof window === 'undefined') return { url: '', label: time };
  const [h, m] = time.split(':').map(Number);
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    // iOS Shortcuts: "create alarm" — opens the Shortcuts app
    return { url: `shortcuts://`, label: `Open Shortcuts to set alarm at ${time}` };
  } else if (/android/.test(ua)) {
    // Android: open the default Clock app
    return { url: `intent:#Intent;action=android.intent.action.SET_ALARM;i.hour=${h};i.minutes=${m};end`, label: `Set alarm at ${time}` };
  } else {
    // Desktop: copy the time, no deep link
    return { url: '', label: `Copy ${time} to set alarm manually` };
  }
}
