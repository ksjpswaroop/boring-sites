/**
 * metrics -- port of app/engine/metrics.py, restricted to the functions the calculator catalogue calls.
 *
 * Each entry is `(args) => value`, with args already coerced (percent arguments arrive as fractions:
 * 6.5% in the UI is 0.065 here). Return the raw value the Python function returns -- no rounding,
 * no formatting. Formatting belongs to the page, and a rounded value would hide a parity failure.
 *
 * What had to be matched exactly, and why:
 *  - `irr` rebuilds the scan grid with the same repeated `+=` as Python (not a computed range), so the
 *    float drift in the grid is identical and it lands on the same one of the several roots an
 *    irregular deal can produce. Both the grid scan and the bisection are ported operation-for-operation.
 *  - `operating_expenses` adds its line items in Python dict insertion order; the order is preserved
 *    here so the total matches to the last bit, not merely within tolerance.
 *  - Optional Python parameters the catalogue does not expose (`explicit_annual_rent`, `repairs`,
 *    `hoa`, `other`, `other_pct_of_egi`, `psf_load`, `other_capex`) fall back to the signature
 *    defaults, not to whatever a missing destructure would give.
 *  - No division is guarded where Python does not guard it: a zero denominator yields Infinity here
 *    and `clean()` turns that into null, which is the same outcome as the Python caller.
 */
import type { Fns } from './index';

const MONTHS_PER_YEAR = 12;

/** Python's `%r` for the values these guards report: a whole number prints as 1.0, not 1. */
function pyRepr(value: unknown): string {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'number') return Number.isInteger(value) ? `${value}.0` : String(value);
  return String(value);
}

// ---------------------------------------------------------------------------
// Discounted cash-flow primitives
// ---------------------------------------------------------------------------

/** End-of-period NPV; cashflows[0] sits at t=0, so it is never discounted. */
function npv(rate: number, cashflows: number[]): number {
  if (rate <= -1) throw new Error('rate must be greater than -100%');
  let total = 0;
  for (let i = 0; i < cashflows.length; i++) total += cashflows[i] / (1 + rate) ** i;
  return total;
}

/**
 * Internal rate of return, or null when no real solution exists.
 *
 * Scans a grid for a sign change -- real estate cash flows frequently have more than one -- then
 * bisects the first bracket whose low side is positive. Bisection rather than Newton because Newton
 * can silently diverge on the sign patterns a rehab-plus-terminal-sale deal produces.
 */
function irr(cashflows: number[], tol = 1e-10, maxIter = 300): number | null {
  const values = cashflows.map((cf) => Number(cf));
  if (values.length < 2) throw new Error('need at least two cash flows');
  if (!values.some((v) => v > 0) || !values.some((v) => v < 0)) return null;

  // Same grid, same accumulated rounding as the Python loop.
  const grid: number[] = [];
  let r = -0.9999;
  while (r < -0.5) {
    grid.push(r);
    r += 0.1;
  }
  r = -0.5;
  while (r <= 1.0) {
    grid.push(r);
    r += 0.01;
  }
  r = 1.0;
  while (r <= 10.0) {
    grid.push(r);
    r += 0.25;
  }
  grid.push(100.0);

  let bracket: [number, number] | null = null;
  let prevR = grid[0];
  let prevF = npv(prevR, values);
  for (let i = 1; i < grid.length; i++) {
    const curR = grid[i];
    const curF = npv(curR, values);
    if (prevF === 0.0) return prevR;
    if (prevF * curF < 0) {
      bracket = [prevR, curR];
      break;
    }
    prevR = curR;
    prevF = curF;
  }
  if (bracket === null) return null;

  let [low, high] = bracket;
  let fLow = npv(low, values);
  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2.0;
    const fMid = npv(mid, values);
    if (Math.abs(fMid) < tol || (high - low) / 2.0 < 1e-12) return mid;
    if (fLow * fMid < 0) high = mid;
    else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2.0;
}

/** Modified IRR: interim cash flows are compounded forward at the reinvestment rate. */
function mirr(cashflows: number[], financeRate: number, reinvestRate: number): number | null {
  const values = cashflows.map((cf) => Number(cf));
  const n = values.length - 1;
  if (n < 1) throw new Error('need at least two cash flows');
  let negatives = 0;
  let positivesFv = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < 0) negatives += v / (1 + financeRate) ** i;
    else if (v > 0) positivesFv += v * (1 + reinvestRate) ** (n - i);
  }
  if (negatives === 0 || positivesFv <= 0) return null;
  return (positivesFv / -negatives) ** (1.0 / n) - 1.0;
}

/** A non-positive cash flow never pays the investment back: the Python returns float("inf"). */
function paybackYears(initialInvestment: number, annualCashflow: number): number {
  if (annualCashflow <= 0) return Number.POSITIVE_INFINITY;
  return initialInvestment / annualCashflow;
}

// ---------------------------------------------------------------------------
// Income-statement metrics
// ---------------------------------------------------------------------------

function grossPotentialRent(
  units: number,
  monthlyRentPerUnit: number,
  sqft: number,
  rentPsfYear: number,
  explicitAnnualRent: number | null
): number {
  if (explicitAnnualRent !== null && explicitAnnualRent !== undefined && explicitAnnualRent > 0) {
    return Number(explicitAnnualRent);
  }
  if (units && monthlyRentPerUnit) return units * monthlyRentPerUnit * MONTHS_PER_YEAR;
  if (sqft && rentPsfYear) return sqft * rentPsfYear;
  throw new Error('provide units+monthly rent, sqft+psf rent, or explicit annual rent');
}

function effectiveGrossIncome(
  grossRent: number,
  vacancyPct: number,
  creditLossPct: number,
  otherAnnualIncome: number
): number {
  const pcts: Array<[string, number]> = [
    ['vacancy_pct', vacancyPct],
    ['credit_loss_pct', creditLossPct],
  ];
  for (const [name, pct] of pcts) {
    if (!(pct >= 0 && pct < 1)) throw new Error(`${name} must be in [0, 1), got ${pyRepr(pct)}`);
  }
  return grossRent * (1 - vacancyPct - creditLossPct) + otherAnnualIncome;
}

/**
 * Itemised operating expenses plus the total, so the page can show the breakdown a lender's
 * underwriter would rather than one opaque number. Insertion order is the Python dict's.
 */
function operatingExpenses(
  egi: number,
  units: number,
  sqft: number,
  propertyTax: number,
  insurance: number,
  managementPct: number,
  maintenancePerUnitYear: number,
  repairsPerUnitYear: number,
  replacementsPerUnitYear: number,
  payroll: number,
  utilities: number,
  hoa: number,
  other: number,
  otherPctOfEgi: number,
  psfLoad: number
): Record<string, number> {
  if (!(managementPct >= 0 && managementPct < 1)) throw new Error('management_pct must be in [0, 1)');
  const items: Record<string, number> = {
    property_tax: Number(propertyTax),
    insurance: Number(insurance),
    management: egi * managementPct,
    maintenance: units * maintenancePerUnitYear,
    repairs: units * repairsPerUnitYear,
    replacements_reserve: units * replacementsPerUnitYear + sqft * psfLoad,
    payroll: Number(payroll),
    utilities: Number(utilities),
    hoa: Number(hoa),
    other: Number(other),
    other_pct_of_egi: egi * otherPctOfEgi,
  };
  let total = 0;
  for (const [key, value] of Object.entries(items)) if (key !== 'total') total += value;
  items.total = total;
  return items;
}

function expenseRatio(totalOpex: number, egi: number): number {
  if (egi <= 0) throw new Error('EGI must be positive');
  return totalOpex / egi;
}

function capRate(noiValue: number, price: number): number {
  if (price <= 0) throw new Error('price must be positive');
  return noiValue / price;
}

function valueFromCapRate(noiValue: number, cap: number): number {
  if (cap <= 0) throw new Error('cap rate must be positive');
  return noiValue / cap;
}

function grossRentMultiplier(price: number, grossAnnualRent: number): number {
  if (grossAnnualRent <= 0) throw new Error('gross rent must be positive');
  return price / grossAnnualRent;
}

/** Under 15 conventionally favours buying, over 20 favours renting. */
function priceToRent(price: number, monthlyRent: number): number {
  const annual = monthlyRent * MONTHS_PER_YEAR;
  if (annual <= 0) throw new Error('monthly rent must be positive');
  return price / annual;
}

function onePercentRule(monthlyRent: number, price: number): number {
  if (price <= 0) throw new Error('price must be positive');
  return monthlyRent / price;
}

/** Back-of-envelope NOI proxy: half of gross rent, annualised. */
function fiftyPercentRule(grossMonthlyRent: number): number {
  return grossMonthlyRent * 0.5 * MONTHS_PER_YEAR;
}

function dscr(noiValue: number, annualDebtService: number): number | null {
  if (annualDebtService <= 0) return null;
  return noiValue / annualDebtService;
}

function debtYield(noiValue: number, loanAmount: number): number | null {
  if (loanAmount <= 0) return null;
  return noiValue / loanAmount;
}

function cashOnCash(annualCashflow: number, cashInvested: number): number | null {
  if (cashInvested <= 0) return null;
  return annualCashflow / cashInvested;
}

/** Occupancy at which cash flow hits zero; null when the deal cannot break even even at 100%. */
function breakevenOccupancy(
  grossPotentialRentValue: number,
  totalOpex: number,
  annualDebtService: number
): number | null {
  if (grossPotentialRentValue <= 0) throw new Error('gross potential rent must be positive');
  const ratio = (totalOpex + annualDebtService) / grossPotentialRentValue;
  if (ratio > 1) return null;
  return ratio;
}

function equityMultiple(totalDistributions: number, totalInvested: number): number | null {
  if (totalInvested <= 0) return null;
  return totalDistributions / totalInvested;
}

function averageAnnualReturn(multiple: number | null, years: number): number | null {
  if (years <= 0 || multiple === null || multiple === undefined || multiple <= 0) return null;
  return multiple ** (1.0 / years) - 1.0;
}

function cashInvested(
  downPayment: number,
  closingCosts: number,
  rehabCost: number,
  pointsPaid: number,
  otherCapex: number
): number {
  return (
    Number(downPayment) +
    Number(closingCosts) +
    Number(rehabCost) +
    Number(pointsPaid) +
    Number(otherCapex)
  );
}

/** Cash flow + appreciation + amortisation, over the equity that bought it. */
function totalReturn(
  cumulativeCashflow: number,
  appreciation: number,
  principalPaydown: number,
  initialEquity: number
): number | null {
  if (initialEquity <= 0) return null;
  return (cumulativeCashflow + appreciation + principalPaydown) / initialEquity;
}

function rentToIncome(annualRent: number, medianHouseholdIncome: number): number {
  if (medianHouseholdIncome <= 0) throw new Error('income must be positive');
  return annualRent / medianHouseholdIncome;
}

export const metrics: Fns = {
  npv: (a) => npv(a.rate, a.cashflows),
  irr: (a) => irr(a.cashflows, a.tol ?? 1e-10, a.max_iter ?? 300),
  mirr: (a) => mirr(a.cashflows, a.finance_rate, a.reinvest_rate),
  payback_years: (a) => paybackYears(a.initial_investment, a.annual_cashflow),

  gross_potential_rent: (a) =>
    grossPotentialRent(
      a.units ?? 0,
      a.monthly_rent_per_unit ?? 0,
      a.sqft ?? 0,
      a.rent_psf_year ?? 0,
      a.explicit_annual_rent ?? null
    ),
  effective_gross_income: (a) =>
    effectiveGrossIncome(
      a.gross_rent,
      a.vacancy_pct ?? 0,
      a.credit_loss_pct ?? 0,
      a.other_annual_income ?? 0
    ),
  operating_expenses: (a) =>
    operatingExpenses(
      a.egi,
      a.units ?? 0,
      a.sqft ?? 0,
      a.property_tax ?? 0,
      a.insurance ?? 0,
      a.management_pct ?? 0,
      a.maintenance_per_unit_year ?? 0,
      a.repairs_per_unit_year ?? 0,
      a.replacements_per_unit_year ?? 0,
      a.payroll ?? 0,
      a.utilities ?? 0,
      a.hoa ?? 0,
      a.other ?? 0,
      a.other_pct_of_egi ?? 0,
      a.psf_load ?? 0
    ),
  noi: (a) => a.egi - a.total_opex,
  expense_ratio: (a) => expenseRatio(a.total_opex, a.egi),

  cap_rate: (a) => capRate(a.noi_value, a.price),
  value_from_cap_rate: (a) => valueFromCapRate(a.noi_value, a.cap),
  gross_rent_multiplier: (a) => grossRentMultiplier(a.price, a.gross_annual_rent),
  price_to_rent: (a) => priceToRent(a.price, a.monthly_rent),
  one_percent_rule: (a) => onePercentRule(a.monthly_rent, a.price),
  fifty_percent_rule: (a) => fiftyPercentRule(a.gross_monthly_rent),

  dscr: (a) => dscr(a.noi_value, a.annual_debt_service),
  debt_yield: (a) => debtYield(a.noi_value, a.loan_amount),
  cash_on_cash: (a) => cashOnCash(a.annual_cashflow, a.cash_invested),
  breakeven_occupancy: (a) =>
    breakevenOccupancy(a.gross_potential_rent, a.total_opex, a.annual_debt_service ?? 0),

  equity_multiple: (a) => equityMultiple(a.total_distributions, a.total_invested),
  average_annual_return: (a) => averageAnnualReturn(a.multiple, a.years),
  cash_invested: (a) =>
    cashInvested(
      a.down_payment,
      a.closing_costs ?? 0,
      a.rehab_cost ?? 0,
      a.points_paid ?? 0,
      a.other_capex ?? 0
    ),
  total_return: (a) =>
    totalReturn(a.cumulative_cashflow, a.appreciation, a.principal_paydown, a.initial_equity),
  rent_to_income: (a) => rentToIncome(a.annual_rent, a.median_household_income),
};
