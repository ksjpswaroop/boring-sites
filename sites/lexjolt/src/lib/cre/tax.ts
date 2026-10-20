/**
 * tax -- port of app/engine/tax.py, restricted to the functions the calculator catalogue calls.
 *
 * Each entry is `(args) => value`, with args already coerced (percent arguments arrive as fractions:
 * 6.5% in the UI is 0.065 here). Return the raw value the Python function returns -- no rounding,
 * no formatting. Formatting belongs to the page, and a rounded value would hide a parity failure.
 *
 * Port notes for the subtle rules:
 *   - Mid-month convention: first year is `12.5 - month` months (January 11.5, December 0.5), and
 *     the schedule's final row absorbs the remainder so the rows sum to exactly the basis.
 *   - Bracket/ceiling maths: section 1250 is `min(ordinary_rate, 0.25)` applied to the gain, and
 *     the 1245 layer is carved out of total gain FIRST (ordinary, uncapped) before 1250 is sized.
 *   - Ordering of operations is copied verbatim, including `sum()` accumulating deductions
 *     left-to-right, so a 1-dollar drift cannot appear from a "cleaner" rearrangement.
 */
import type { Fns } from './index';

// ---------------------------------------------------------------------------
// 2026 statutory figures (constant tables, same content as the Python module)
// ---------------------------------------------------------------------------

/** IRC 1411: 3.8% NIIT above these MAGI thresholds. */
const NIIT_THRESHOLD: Record<string, number> = {
  single: 200_000.0,
  mfj: 250_000.0,
  mfs: 125_000.0,
  hoh: 200_000.0,
};
const NIIT_RATE = 0.038;

/** OBBBA (P.L. 119-21) / Rev. Proc. 2025-32: $15M per person, permanent from 2026. */
const ESTATE_EXEMPTION_2026: Record<string, number> = { single: 15_000_000.0, mfj: 30_000_000.0 };
const ESTATE_TAX_RATE = 0.4;
const ANNUAL_GIFT_EXCLUSION_2026 = 19_000.0;

/** Section 121: primary-residence exclusion, $250k single / $500k MFJ. */
const SECTION_121_EXCLUSION: Record<string, number> = {
  single: 250_000.0,
  mfj: 500_000.0,
  mfs: 250_000.0,
  hoh: 250_000.0,
};
const SECTION_121_MIN_OCCUPANCY_YEARS = 2.0; // of the 5 years before sale

/** IRC 469(i): $25k special allowance, phased out 50c per dollar of MAGI over the start. */
const PASSIVE_LOSS_ALLOWANCE: Record<string, number> = {
  single: 25_000.0,
  mfj: 25_000.0,
  mfs: 12_500.0,
  hoh: 25_000.0,
};
const PASSIVE_PHASEOUT_START: Record<string, number> = {
  single: 100_000.0,
  mfj: 100_000.0,
  mfs: 50_000.0,
  hoh: 100_000.0,
};
const PASSIVE_PHASEOUT_RANGE: Record<string, number> = {
  single: 50_000.0,
  mfj: 50_000.0,
  mfs: 25_000.0,
  hoh: 50_000.0,
};

/** 26 U.S.C. 168(c): 27.5 yr residential rental, 39 yr nonresidential real property. */
const RESIDENTIAL_RECOVERY_YEARS = 27.5;
const NONRESIDENTIAL_RECOVERY_YEARS = 39.0;

type Row = { year: number; months: number; pct_of_basis: number; deduction: number; cumulative: number };

/** Python's `%r` for a str is single-quoted; used only where the message quotes a filing status. */
function pyReprStr(s: string): string {
  return `'${s}'`;
}

function num(a: Record<string, any>, key: string, fallback: number): number {
  const v = a[key];
  return v === undefined || v === null ? fallback : Number(v);
}

/** Python's default-true bool; the UI may hand back `"false"` if a bool arg is added later. */
function flag(a: Record<string, any>, key: string, fallback: boolean): boolean {
  const v = a[key];
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'string') return !['false', '0', '', 'no', 'off'].includes(v.toLowerCase());
  return Boolean(v);
}

// ---------------------------------------------------------------------------
// Depreciation
// ---------------------------------------------------------------------------

function recovery_years(residential: boolean): number {
  return residential ? RESIDENTIAL_RECOVERY_YEARS : NONRESIDENTIAL_RECOVERY_YEARS;
}

function depreciable_basis(
  purchase_price: number,
  land_pct: number,
  closing_costs = 0.0,
  capital_improvements = 0.0,
  allocate_closings_to_building = true
): Record<string, number> {
  // Land is never depreciable; the split must come from the assessor, not a rule of thumb.
  if (!(land_pct >= 0 && land_pct < 1)) throw new Error('land_pct must be in [0, 1)');
  if (purchase_price <= 0) throw new Error('purchase_price must be positive');
  const building_share = 1 - land_pct;
  let building = purchase_price * building_share;
  let land = purchase_price * land_pct;
  if (allocate_closings_to_building) {
    building += closing_costs * building_share;
    land += closing_costs * land_pct;
  } else {
    building += closing_costs;
  }
  building += capital_improvements;
  return {
    total_cost: purchase_price + closing_costs + capital_improvements,
    land,
    depreciable_basis: building,
    land_pct,
  };
}

function straight_line_annual(basis: number, years: number): number {
  if (years <= 0) throw new Error('years must be positive');
  return basis / years;
}

/** Pub 946 mid-month convention: placed in service at the month's midpoint. */
function mid_month_months_in_first_year(month: number): number {
  if (!(month >= 1 && month <= 12)) throw new Error('month must be 1..12');
  return 12.5 - month;
}

function depreciation_schedule(
  basis: number,
  years: number,
  placed_in_service_month: number,
  months_held?: number | null,
  disposal_month?: number | null
): Row[] {
  if (basis < 0) throw new Error('basis cannot be negative');
  if (years <= 0) throw new Error('years must be positive');
  const pool_months = years * 12.0;
  const first_months = mid_month_months_in_first_year(placed_in_service_month);
  const per_month = basis / pool_months;

  const month_blocks: number[] = [first_months];
  let consumed = first_months;
  while (consumed + 12.0 <= pool_months - 1e-9) {
    month_blocks.push(12.0);
    consumed += 12.0;
  }
  const tail = pool_months - consumed;
  if (tail > 1e-9) month_blocks.push(tail);

  const held = months_held === undefined ? null : months_held;
  const disposal = disposal_month === undefined ? null : disposal_month;

  const rows: Row[] = [];
  let used = 0.0;
  let cum = 0.0; // left-to-right accumulation, exactly like Python's sum()
  for (let i = 0; i < month_blocks.length; i++) {
    const months = month_blocks[i];
    const year_no = i + 1;
    if (held !== null && used >= held) break;
    let effective = months;
    if (held !== null && used + months <= held) {
      effective = months;
    } else if (held !== null) {
      effective = held - used;
    } else if (disposal !== null && year_no === 2) {
      // Sold in the year after acquisition: the sale year earns disposal_month - 0.5 months.
      effective = Math.min(months, Math.max(disposal - 0.5, 0.0));
    }
    const deduction = effective * per_month;
    cum = cum + deduction;
    rows.push({
      year: year_no,
      months: effective,
      pct_of_basis: (effective / pool_months) * 100.0,
      deduction,
      cumulative: cum,
    });
    used += effective;
    if (held !== null && used >= held - 1e-9) break;
  }
  return rows;
}

function annual_depreciation(basis: number, years: number, placed_in_service_month = 1): number {
  const rows = depreciation_schedule(basis, years, placed_in_service_month);
  return rows.length ? rows[0].deduction : 0.0;
}

/** Recapture base: depreciation allowed or allowable over the hold (26 U.S.C. 1250(b)(3)). */
function depreciation_taken_over_hold(
  basis: number,
  years: number,
  placed_in_service_month: number,
  hold_years: number
): number {
  void placed_in_service_month; // Python signature keeps it but the maths is pro-rata months
  return basis * Math.min(1.0, (hold_years * 12.0) / (years * 12.0));
}

// ---------------------------------------------------------------------------
// Sale taxation
// ---------------------------------------------------------------------------

function sale_gain_components(
  sale_price: number,
  selling_costs: number,
  purchase_price: number,
  capital_improvements: number,
  depreciation_claimed: number,
  cost_seg_depreciation = 0.0
): Record<string, number | boolean> {
  // Three tax layers: 1245 ordinary (uncapped), 1250 max 25%, then LTCG.
  const amount_realized = sale_price - selling_costs;
  const adjusted_basis = purchase_price + capital_improvements - depreciation_claimed - cost_seg_depreciation;
  const total_gain = amount_realized - adjusted_basis;
  if (total_gain < 0) {
    return {
      amount_realized,
      adjusted_basis,
      total_gain,
      section_1245_recapture: 0.0,
      unrecaptured_1250_gain: 0.0,
      long_term_capital_gain: total_gain,
      is_loss: true,
    };
  }
  const s1245 = Math.min(cost_seg_depreciation, total_gain);
  const remaining = total_gain - s1245;
  const s1250 = Math.min(depreciation_claimed, remaining);
  const ltcg = remaining - s1250;
  return {
    amount_realized,
    adjusted_basis,
    total_gain,
    section_1245_recapture: s1245,
    unrecaptured_1250_gain: s1250,
    long_term_capital_gain: ltcg,
    is_loss: false,
  };
}

function niit(
  net_investment_income: number,
  magi: number,
  filing_status = 'mfj',
  net_investment_income_for_threshold?: number | null
): Record<string, number> {
  // IRC 1411: 3.8% on the lesser of NII or MAGI over the threshold.
  const threshold = NIIT_THRESHOLD[filing_status];
  if (threshold === undefined) throw new Error(`unknown filing_status ${pyReprStr(filing_status)}`);
  const base =
    net_investment_income_for_threshold === undefined || net_investment_income_for_threshold === null
      ? net_investment_income
      : net_investment_income_for_threshold;
  const excess = Math.max(magi - threshold, 0.0);
  const taxable = Math.max(Math.min(base, excess), 0.0);
  return {
    magi,
    threshold,
    magi_over_threshold: excess,
    niit_base: net_investment_income,
    niit_taxable: taxable,
    niit_tax: taxable * NIIT_RATE,
  };
}

function capital_gains_tax(
  s1245_recapture: number,
  unrecaptured_1250_gain: number,
  long_term_capital_gain: number,
  ordinary_rate = 0.24,
  ltcg_rate = 0.15,
  state_rate = 0.0,
  magi = 250_000.0,
  filing_status = 'mfj',
  apply_niit = true
): Record<string, number | boolean | string> {
  const net_gain = s1245_recapture + unrecaptured_1250_gain + long_term_capital_gain;
  if (net_gain < 0) {
    // A section 1231 loss is an ordinary loss, deductible without the 1211 capital-loss cap.
    return {
      tax_section_1245: 0.0,
      tax_unrecaptured_1250: 0.0,
      rate_applied_to_1250: 0.0,
      tax_long_term_capital_gain: 0.0,
      federal_tax: 0.0,
      niit_tax: 0.0,
      state_tax: 0.0,
      total_tax: 0.0,
      effective_rate_on_gain: 0.0,
      net_gain,
      net_loss: -net_gain,
      is_loss: true,
      note:
        'Sold at a loss. No recapture and no gains tax arises. The loss is a section 1231 ' +
        'loss, deductible against ordinary income subject to the five-year lookback of ' +
        'IRC 1231(c).',
    };
  }
  if (s1245_recapture < 0 || unrecaptured_1250_gain < 0 || long_term_capital_gain < 0) {
    throw new Error(
      'gain components cannot be negative when the total gain is positive: ' +
        `got 1245=${s1245_recapture}, 1250=${unrecaptured_1250_gain}, ltcg=${long_term_capital_gain}`
    );
  }
  const tax_1245 = s1245_recapture * ordinary_rate;
  // The 25% is a ceiling on the 1250 rate, not a flat rate (IRC 1(h)(1)(E)).
  const rate_1250 = Math.min(ordinary_rate, 0.25);
  const tax_1250 = unrecaptured_1250_gain * rate_1250;
  const tax_ltcg = long_term_capital_gain * ltcg_rate;
  const federal = tax_1245 + tax_1250 + tax_ltcg;

  const nii = s1245_recapture + unrecaptured_1250_gain + long_term_capital_gain;
  const niit_result = apply_niit
    ? niit(nii, magi, filing_status)
    : { niit_tax: 0.0, niit_taxable: 0.0, threshold: 0.0 };
  const state = (s1245_recapture + unrecaptured_1250_gain + long_term_capital_gain) * state_rate;

  const total = federal + (apply_niit ? niit_result.niit_tax : 0.0) + state;
  return {
    tax_section_1245: tax_1245,
    tax_unrecaptured_1250: tax_1250,
    rate_applied_to_1250: rate_1250,
    tax_long_term_capital_gain: tax_ltcg,
    federal_tax: federal,
    niit_tax: apply_niit ? niit_result.niit_tax : 0.0,
    state_tax: state,
    total_tax: total,
    effective_rate_on_gain: nii > 0 ? total / nii : 0.0,
  };
}

/** Section 121: principal-residence exclusion, needs 2 of the last 5 years of occupancy. */
function section_121_exclusion(filing_status = 'mfj', years_occupied = 5.0): number {
  if (years_occupied < SECTION_121_MIN_OCCUPANCY_YEARS) return 0.0;
  const v = SECTION_121_EXCLUSION[filing_status];
  return v === undefined ? 250_000.0 : v;
}

// ---------------------------------------------------------------------------
// Operating-phase taxation
// ---------------------------------------------------------------------------

/** IRC 469(i): active participation allowance, phased out 50c per dollar of MAGI over the start. */
function passive_loss_allowed(
  rental_loss: number,
  magi: number,
  filing_status = 'mfj',
  active_participation = true
): Record<string, number> {
  if (rental_loss >= 0) {
    return { allowed: 0.0, suspended: 0.0, allowance: 0.0, phaseout_reduction: 0.0 };
  }
  if (!active_participation) {
    return { allowed: 0.0, suspended: -rental_loss, allowance: 0.0, phaseout_reduction: 0.0 };
  }
  const allowance = PASSIVE_LOSS_ALLOWANCE[filing_status] ?? 25_000.0;
  const start = PASSIVE_PHASEOUT_START[filing_status] ?? 100_000.0;
  const over = Math.max(magi - start, 0.0);
  // The phaseout range table caps the reduction at the allowance itself.
  const reduction = Math.min(over * 0.5, allowance);
  const allowance_after = Math.max(allowance - reduction, 0.0);
  const allowed = Math.min(-rental_loss, allowance_after);
  return {
    allowed,
    suspended: Math.max(-rental_loss - allowed, 0.0),
    allowance: allowance_after,
    phaseout_reduction: reduction,
  };
}

function operating_tax(
  noi_value: number,
  interest_deductible: number,
  depreciation_deductible: number,
  ordinary_rate = 0.24,
  state_rate = 0.0,
  magi = 250_000.0,
  filing_status = 'mfj',
  active_participation = true,
  real_estate_professional = false
): Record<string, number> {
  const taxable = noi_value - interest_deductible - depreciation_deductible;
  if (taxable >= 0) {
    const tax = taxable * (ordinary_rate + state_rate);
    return {
      taxable_income: taxable,
      tax,
      allowed_loss: 0.0,
      suspended_loss: 0.0,
      tax_shield: 0.0,
      effective_rate: ordinary_rate + state_rate,
    };
  }
  // IRC 469(c)(7): a real-estate professional escapes the passive loss limits entirely.
  if (real_estate_professional) {
    const allowed = -taxable;
    const shield = allowed * (ordinary_rate + state_rate);
    return {
      taxable_income: taxable,
      tax: -shield,
      allowed_loss: allowed,
      suspended_loss: 0.0,
      tax_shield: shield,
      effective_rate: ordinary_rate + state_rate,
    };
  }
  const result = passive_loss_allowed(taxable, magi, filing_status, active_participation);
  const benefit = result.allowed * (ordinary_rate + state_rate);
  return {
    taxable_income: taxable,
    // `|| 0` collapses IEEE negative zero, as Python's `-benefit if benefit else 0.0` does.
    tax: benefit ? -benefit : 0.0,
    allowed_loss: result.allowed,
    suspended_loss: result.suspended,
    tax_shield: benefit,
    effective_rate: ordinary_rate + state_rate,
  };
}

// ---------------------------------------------------------------------------
// Deferral, acceleration, and transfer
// ---------------------------------------------------------------------------

/** IRC 1031: defers both gain and recapture; the gain reduces replacement basis. */
function section_1031_deferral(
  total_gain: number,
  unrecaptured_1250_gain: number,
  ordinary_rate: number,
  ltcg_rate: number
): Record<string, number> {
  if (total_gain <= 0) return { tax_deferred: 0.0, basis_reduction: 0.0, total_gain };
  const recapture = Math.min(unrecaptured_1250_gain, total_gain);
  const appreciation = total_gain - recapture;
  const tax = recapture * Math.min(ordinary_rate, 0.25) + appreciation * ltcg_rate;
  return {
    total_gain,
    recapture_deferred: recapture,
    appreciation_deferred: appreciation,
    tax_deferred: tax,
    basis_reduction: total_gain,
  };
}

function cost_segregation_benefit(
  building_basis: number,
  reallocated_pct: number,
  bonus_depreciation_rate = 1.0,
  ordinary_rate = 0.37,
  horizon_years = 10,
  discount_rate = 0.06
): Record<string, number> {
  if (!(reallocated_pct >= 0 && reallocated_pct <= 1)) {
    throw new Error('reallocated_pct must be in [0, 1]');
  }
  const reallocated = building_basis * reallocated_pct;
  const annual_accelerated_deduction = reallocated * bonus_depreciation_rate;
  const remaining_basis = building_basis - reallocated;
  const annual_slow = remaining_basis / 39.0;

  const pv_fast = annual_accelerated_deduction;
  let pv_slow = 0.0;
  // Discount year by year from t=1; `**` in Python == Math.pow, same IEEE result.
  for (let t = 1; t <= horizon_years; t++) {
    pv_slow += annual_slow / Math.pow(1 + discount_rate, t);
  }

  const tax_saved_fast = pv_fast * ordinary_rate;
  const tax_saved_slow = pv_slow * ordinary_rate;
  // Short-life components recapture at ordinary rates, not the 25% ceiling.
  const extra_recapture_exposure = reallocated * (ordinary_rate - 0.25);
  return {
    reallocated_amount: reallocated,
    first_year_deduction: annual_accelerated_deduction,
    pv_tax_saved_accelerated: tax_saved_fast,
    pv_tax_saved_straight_line: tax_saved_slow,
    net_pv_benefit: tax_saved_fast - tax_saved_slow - extra_recapture_exposure * 0.5,
    extra_recapture_exposure,
  };
}

/** IRC 1400Z-2: original gain deferred; new appreciation excluded after a 10-year hold. */
function opportunity_zone_deferral(capital_gain: number, years_held = 10): Record<string, number> {
  if (capital_gain <= 0) {
    return { deferred_gain: 0.0, tax_now: 0.0, excluded_new_appreciation: 0.0 };
  }
  return {
    deferred_gain: capital_gain,
    tax_now: 0.0,
    years_held,
    excludes_new_appreciation_after_year: 10,
  };
}

function estate_tax(
  estate_value: number,
  filing_status = 'mfj',
  exemption_used = 0.0,
  rate = ESTATE_TAX_RATE
): Record<string, number | string> {
  const gross_exemption = ESTATE_EXEMPTION_2026[filing_status] ?? 15_000_000.0;
  const remaining = Math.max(gross_exemption - exemption_used, 0.0);
  const taxable_estate = Math.max(estate_value - remaining, 0.0);
  return {
    estate_value,
    filing_status,
    gross_exemption,
    exemption_used,
    remaining_exemption: remaining,
    taxable_estate,
    estate_tax: taxable_estate * rate,
    effective_rate_on_estate: estate_value > 0 ? (taxable_estate * rate) / estate_value : 0.0,
  };
}

/** IRC 1014: the step-up extinguishes both the deferred gain and the deferred recapture. */
function step_up_basis_benefit(
  unrealized_gain: number,
  deferred_recapture: number,
  ordinary_rate = 0.24,
  ltcg_rate = 0.15,
  state_rate = 0.0
): Record<string, number> {
  const ltcg_part = Math.max(unrealized_gain - deferred_recapture, 0.0);
  const tax_avoided =
    deferred_recapture * Math.min(ordinary_rate, 0.25) +
    ltcg_part * ltcg_rate +
    unrealized_gain * state_rate;
  return {
    unrealized_gain,
    deferred_recapture,
    ltcg_portion: ltcg_part,
    tax_avoided_by_step_up: tax_avoided,
    effective_value_preserved: 1.0,
  };
}

function gift_and_annual_exclusion(annual_gifts: number, years = 1): Record<string, number> {
  const per_year = annual_gifts * ANNUAL_GIFT_EXCLUSION_2026;
  return {
    per_year_excluded: per_year,
    total_excluded: per_year * years,
    annual_exclusion: ANNUAL_GIFT_EXCLUSION_2026,
    years,
  };
}

/** IRC 199A: 20% QBI deduction, only if the rental is a section 162 trade or business. */
function qbi_deduction(
  qualified_business_income: number,
  taxable_income_before_qbi: number,
  filing_status = 'mfj',
  rental_is_trade_or_business = true
): Record<string, number | boolean | string> {
  void taxable_income_before_qbi; // the 199A taxable-income limit is flagged in `note`, not modelled
  void filing_status;
  if (!rental_is_trade_or_business || qualified_business_income <= 0) {
    return {
      qbi: qualified_business_income,
      deduction: 0.0,
      qualified: false,
      note: 'rental activity not treated as a section 162 trade or business',
    };
  }
  const deduction = qualified_business_income * 0.2;
  return {
    qbi: qualified_business_income,
    deduction,
    qualified: true,
    note: 'subject to the taxable-income limitation and wage/capital limits above the threshold',
  };
}

function tax_assumptions(): Record<string, unknown> {
  return {
    tax_year: 2026,
    residential_recovery_years: RESIDENTIAL_RECOVERY_YEARS,
    nonresidential_recovery_years: NONRESIDENTIAL_RECOVERY_YEARS,
    recapture_rate_cap: 0.25,
    niit_rate: NIIT_RATE,
    niit_thresholds: { ...NIIT_THRESHOLD },
    passive_loss_allowance: { ...PASSIVE_LOSS_ALLOWANCE },
    passive_phaseout_start: { ...PASSIVE_PHASEOUT_START },
    section_121_exclusion: { ...SECTION_121_EXCLUSION },
    estate_exemption: { ...ESTATE_EXEMPTION_2026 },
    estate_tax_rate: ESTATE_TAX_RATE,
    annual_gift_exclusion: ANNUAL_GIFT_EXCLUSION_2026,
    authority:
      'IRS Pub 946, Pub 925, Pub 544; IRC 168, 469, 1031, 1014, 121, 199A, 1411; OBBBA P.L. 119-21; Rev. Proc. 2025-32',
  };
}

// ---------------------------------------------------------------------------
// The catalogue-facing table: one entry per Python function the calculators call.
// Defaults below mirror the Python signature defaults, because arguments the
// catalogue does not expose (filing_status, booleans, rates) never arrive in `a`.
// ---------------------------------------------------------------------------

export const tax: Fns = {
  depreciable_basis: (a) =>
    depreciable_basis(
      num(a, 'purchase_price', 0),
      num(a, 'land_pct', 0),
      num(a, 'closing_costs', 0.0),
      num(a, 'capital_improvements', 0.0),
      flag(a, 'allocate_closings_to_building', true)
    ),
  straight_line_annual: (a) => straight_line_annual(num(a, 'basis', 0), num(a, 'years', 0)),
  annual_depreciation: (a) =>
    annual_depreciation(num(a, 'basis', 0), num(a, 'years', 0), num(a, 'placed_in_service_month', 1)),
  depreciation_taken_over_hold: (a) =>
    depreciation_taken_over_hold(
      num(a, 'basis', 0),
      num(a, 'years', 0),
      num(a, 'placed_in_service_month', 1),
      num(a, 'hold_years', 0)
    ),
  cost_segregation_benefit: (a) =>
    cost_segregation_benefit(
      num(a, 'building_basis', 0),
      num(a, 'reallocated_pct', 0),
      num(a, 'bonus_depreciation_rate', 1.0),
      num(a, 'ordinary_rate', 0.37),
      num(a, 'horizon_years', 10),
      num(a, 'discount_rate', 0.06)
    ),
  sale_gain_components: (a) =>
    sale_gain_components(
      num(a, 'sale_price', 0),
      num(a, 'selling_costs', 0),
      num(a, 'purchase_price', 0),
      num(a, 'capital_improvements', 0),
      num(a, 'depreciation_claimed', 0),
      num(a, 'cost_seg_depreciation', 0.0)
    ),
  capital_gains_tax: (a) =>
    capital_gains_tax(
      num(a, 's1245_recapture', 0),
      num(a, 'unrecaptured_1250_gain', 0),
      num(a, 'long_term_capital_gain', 0),
      num(a, 'ordinary_rate', 0.24),
      num(a, 'ltcg_rate', 0.15),
      num(a, 'state_rate', 0.0),
      num(a, 'magi', 250_000.0),
      a.filing_status ?? 'mfj',
      flag(a, 'apply_niit', true)
    ),
  niit: (a) =>
    niit(
      num(a, 'net_investment_income', 0),
      num(a, 'magi', 0),
      a.filing_status ?? 'mfj',
      a.net_investment_income_for_threshold ?? null
    ),
  passive_loss_allowed: (a) =>
    passive_loss_allowed(
      num(a, 'rental_loss', 0),
      num(a, 'magi', 0),
      a.filing_status ?? 'mfj',
      flag(a, 'active_participation', true)
    ),
  qbi_deduction: (a) =>
    qbi_deduction(
      num(a, 'qualified_business_income', 0),
      num(a, 'taxable_income_before_qbi', 0),
      a.filing_status ?? 'mfj',
      flag(a, 'rental_is_trade_or_business', true)
    ),
  section_121_exclusion: (a) =>
    section_121_exclusion(a.filing_status ?? 'mfj', num(a, 'years_occupied', 5.0)),
  section_1031_deferral: (a) =>
    section_1031_deferral(
      num(a, 'total_gain', 0),
      num(a, 'unrecaptured_1250_gain', 0),
      num(a, 'ordinary_rate', 0.24),
      num(a, 'ltcg_rate', 0.15)
    ),
  opportunity_zone_deferral: (a) =>
    opportunity_zone_deferral(num(a, 'capital_gain', 0), num(a, 'years_held', 10)),
  step_up_basis_benefit: (a) =>
    step_up_basis_benefit(
      num(a, 'unrealized_gain', 0),
      num(a, 'deferred_recapture', 0),
      num(a, 'ordinary_rate', 0.24),
      num(a, 'ltcg_rate', 0.15),
      num(a, 'state_rate', 0.0)
    ),
  estate_tax: (a) =>
    estate_tax(
      num(a, 'estate_value', 0),
      a.filing_status ?? 'mfj',
      num(a, 'exemption_used', 0.0),
      num(a, 'rate', ESTATE_TAX_RATE)
    ),
  gift_and_annual_exclusion: (a) =>
    gift_and_annual_exclusion(num(a, 'annual_gifts', 0), num(a, 'years', 1)),
  tax_assumptions: () => tax_assumptions(),
};

// Referenced by recovery-period callers in the Python module; kept so the table above has the
// same named helpers available if the catalogue later exposes them.
void recovery_years;
void operating_tax;
void PASSIVE_PHASEOUT_RANGE;
