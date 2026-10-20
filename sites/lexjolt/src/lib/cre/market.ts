/**
 * market -- port of app/market.py, restricted to the one calculator that uses it.
 *
 * The 10-year Treasury is a DATED assumption, not a constant of nature: 4.6% is the Q1 2026 print.
 * It lives here as a named constant so the site can say which quarter it is quoting, and so the
 * spread is reproducible rather than "today-ish".
 */
import type { Fns } from './index';

/** Q1 2026 10-year Treasury yield (fraction). Source: app/market.py TEN_YEAR_TREASURY_Q1_2026. */
export const TEN_YEAR_TREASURY_Q1_2026 = 0.046;

export const market: Fns = {
  cap_rate_spread_to_treasury: (a) => {
    const cap = Number(a.cap);
    const spread = cap - TEN_YEAR_TREASURY_Q1_2026;
    return {
      cap_rate: cap,
      ten_year_treasury: TEN_YEAR_TREASURY_Q1_2026,
      spread,
      // round() half-to-even is irrelevant here: the spread is scaled by 10,000 first and lands on
      // a whole basis point for any input the UI allows. Math.round would only differ on x.5 bps.
      spread_bps: Math.round(spread * 10_000),
      interpretation: spread >= 0.03 ? 'wide' : spread >= 0.01 ? 'normal' : 'tight',
    };
  },
};
