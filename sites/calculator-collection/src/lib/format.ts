/**
 * Number / currency / percent formatters.
 * Used by all calculators in the registry.
 */

export const fmtCurrency = (n: number, currency: string = 'USD'): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);

export const fmtNumber = (n: number, decimals: number = 2): string =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(n);

export const fmtPercent = (n: number, decimals: number = 1): string =>
  `${fmtNumber(n, decimals)}%`;

export const fmtInteger = (n: number): string =>
  new Intl.NumberFormat('en-US').format(Math.round(n));

/**
 * Convert a number to a human-readable "10K" / "1.2M" form.
 * Used for axis labels on charts.
 */
export const fmtCompact = (n: number): string =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
