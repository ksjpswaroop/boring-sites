/**
 * Display formatting. Kept out of the engine on purpose: the engine returns fractions and raw
 * dollars, and every number a person reads is formatted here, so "8.0%" and "$40,000" are one
 * decision rather than a scatter of toFixed calls in templates.
 *
 * The engine's `result_format` values are the contract: money, percent, multiple, years, number,
 * and `object` for the few calculators that return a breakdown.
 */

export type Kind = 'money' | 'percent' | 'multiple' | 'years' | 'number' | 'object' | string;

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const usd2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtMoney(v: number): string {
  return Math.abs(v) < 1000 && v % 1 !== 0 ? usd2.format(v) : usd.format(v);
}

export function fmtPercent(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}

/** One value in its own units. `undefined`/`null` render as an em dash, never as "0". */
export function formatValue(value: unknown, kind: Kind): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';
    switch (kind) {
      case 'money':
        return fmtMoney(value);
      case 'percent':
        return fmtPercent(value);
      case 'multiple':
        return `${value.toFixed(2)}×`;
      case 'years':
        return `${value.toFixed(1)} yrs`;
      case 'bps':
        return `${Math.round(value).toLocaleString('en-US')} bps`;
      case 'months':
        return `${Math.round(value)} months`;
      case 'number':
        return Math.abs(value) >= 1000
          ? value.toLocaleString('en-US', { maximumFractionDigits: 0 })
          : String(Math.round(value * 100) / 100);
      default:
        return String(Math.round(value * 1000) / 1000);
    }
  }
  if (Array.isArray(value)) return value.map((v) => formatValue(v, kind)).join(' · ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${label(k)} ${formatValue(v, kind)}`)
      .join(' · ');
  }
  return String(value);
}

/** snake_case -> "Snake case", for keys that came out of the engine unchanged. */
export function label(key: string): string {
  const s = key.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Argument values as they appear next to their label: percents in percent, money in dollars. */
export function formatArg(value: unknown, type: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (type === 'percent') return fmtPercent(value, 2);
    if (type === 'money') return fmtMoney(value);
    if (type === 'years') return `${value} ${value === 1 ? 'year' : 'years'}`;
    return String(Math.round(value * 100) / 100);
  }
  if (Array.isArray(value)) return value.length ? `${value.length} entries` : '—';
  return String(value);
}
