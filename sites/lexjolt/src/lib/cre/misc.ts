/**
 * misc -- the calculators whose maths lives in app/api/calculators.py rather than the engine.
 *
 * Kept separate so the engine modules stay a 1:1 mirror of the Python files; this file is the
 * "belongs to the catalogue, not the library" bucket.
 */
import type { Fns } from './index';
// Explicit .ts extension: Node's type stripping resolves local value imports literally, and the
// parity gate runs these modules under plain Node (no bundler). Vite accepts the extension too.
import { metrics } from './metrics.ts';

export const misc: Fns = {
  /**
   * The catalogue lists the gross-rent multiple twice: once plainly, once as a range screen under a
   * label that asks the question. One function, two entries -- aliasing here (rather than porting the
   * arithmetic twice) is what keeps the two answers identical by construction.
   */
  gross_rent_multiplier_band: (a) => metrics.gross_rent_multiplier(a),
  /**
   * The monthly gap between owning a house and renting it out.
   *
   * Negative means the tenant covers the mortgage and then some. Excludes tax effects and
   * appreciation: both are real, and neither pays this month's mortgage.
   */
  monthly_carry: (a) => {
    const price = Number(a.price);
    const downPct = Number(a.down_pct);
    const annualRate = Number(a.annual_rate);
    const years = Number(a.years);
    const loan = price * (1 - downPct);
    let payment: number;
    if (annualRate <= 0) {
      payment = loan / (years * 12);
    } else {
      const r = annualRate / 12;
      payment = (loan * r) / (1 - Math.pow(1 + r, -years * 12));
    }
    return (
      payment +
      Number(a.monthly_tax) +
      Number(a.monthly_insurance) +
      Number(a.monthly_maintenance) -
      Number(a.monthly_rent) * (1 - Number(a.vacancy_pct))
    );
  },
};
