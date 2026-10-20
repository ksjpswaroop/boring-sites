/**
 * mortgage -- port of app/engine/mortgage.py, restricted to the functions the calculator catalogue calls.
 *
 * Each entry is `(args) => value`, with args already coerced (percent arguments arrive as fractions:
 * 6.5% in the UI is 0.065 here). Return the raw value the Python function returns -- no rounding,
 * no formatting. Formatting belongs to the page, and a rounded value would hide a parity failure.
 *
 * What had to be matched exactly, and why:
 *  - Rates are annual on the way in and monthly in the formula: r = annual_rate / 12, while the term
 *    is rounded to whole months with Python's half-to-even `round` (25.18 years is 302 payments, not
 *    303). Using Math.round there drifts a schedule by one payment.
 *  - A zero principal is a real state (all-cash purchase, or a loan sized to nothing on inadequate
 *    NOI): `monthly_payment` returns 0 and the amortisation table is empty, but `payment_from_months`
 *    still rejects it. That asymmetry is the Python's, and copying it keeps DSCR-sized zero loans
 *    representable without loosening the commercial-loan entry point.
 *  - The schedule clamps negative amortisation to zero principal rather than letting the balance grow,
 *    and caps the extra payment at the remaining balance; both clamps are reproduced in order.
 *  - `months_until_pmi_drops` returns 0 (never carried PMI) which is distinct from null (never drops).
 *  - Division by a zero monthly saving is left unguarded: it yields Infinity, and the caller's
 *    `clean()` renders that as null, exactly as `float("inf")` does in Python.
 */
import type { Fns } from './index';

const MONTHS_PER_YEAR = 12;

/** Python's half-to-even round: round(302.5) is 302, Math.round would give 303. */
function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

/** Python's `%r` for the values these guards report: a whole number prints as 1.0, not 1. */
function pyRepr(value: unknown): string {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'number') return Number.isInteger(value) ? `${value}.0` : String(value);
  return String(value);
}

function validatePositive(name: string, value: number | null | undefined): void {
  if (value === null || value === undefined || value <= 0) {
    throw new Error(`${name} must be positive, got ${pyRepr(value)}`);
  }
}

function validateNonNegative(name: string, value: number | null | undefined): void {
  if (value === null || value === undefined || value < 0) {
    throw new Error(`${name} cannot be negative, got ${pyRepr(value)}`);
  }
}

/** Fully-amortising monthly payment, from the annuity-present-value identity. */
function monthlyPayment(principal: number, annualRate: number, years: number): number {
  validateNonNegative('principal', principal);
  validatePositive('years', years);
  if (principal === 0) return 0.0;
  if (annualRate < 0) throw new Error('annual_rate cannot be negative');
  const n = pyRound(years * MONTHS_PER_YEAR);
  const r = annualRate / MONTHS_PER_YEAR;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - (1 + r) ** -n);
}

/** Commercial loans are quoted in months, so this entry point refuses a zero principal. */
function paymentFromMonths(principal: number, annualRate: number, months: number): number {
  validatePositive('principal', principal);
  if (months <= 0) throw new Error('months must be positive');
  const r = annualRate / MONTHS_PER_YEAR;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - (1 + r) ** -months);
}

/** The inverse of the payment formula -- the identity behind DSCR-based loan sizing. */
function loanFromPayment(payment: number, annualRate: number, years: number): number {
  validatePositive('payment', payment);
  validatePositive('years', years);
  const n = pyRound(years * MONTHS_PER_YEAR);
  const r = annualRate / MONTHS_PER_YEAR;
  if (r === 0) return payment * n;
  return (payment * (1 - (1 + r) ** -n)) / r;
}

/** Annual debt service per $1 of loan. */
function loanConstant(annualRate: number, years: number): number {
  validatePositive('years', years);
  return monthlyPayment(1.0, annualRate, years) * MONTHS_PER_YEAR;
}

/**
 * Month-by-month amortisation table.
 *
 * `months` caps the table length (defaults to the full term); `firstPaymentMonth` is how many months
 * had already elapsed before the first row, for continuing a schedule mid-stream.
 */
function amortizationSchedule(
  principal: number,
  annualRate: number,
  years: number,
  extraPrincipal = 0.0,
  months: number | null = null,
  firstPaymentMonth = 0
): Array<Record<string, number>> {
  if (principal < 0) throw new Error(`principal cannot be negative, got ${pyRepr(principal)}`);
  if (principal === 0) return [];
  validatePositive('principal', principal);
  validatePositive('years', years);
  if (extraPrincipal < 0) throw new Error('extra_principal cannot be negative');
  const termMonths = pyRound(years * MONTHS_PER_YEAR);
  const limit = months === null ? termMonths : Math.min(Math.trunc(months), termMonths);
  const r = annualRate / MONTHS_PER_YEAR;
  const payment = r === 0 ? principal / termMonths : monthlyPayment(principal, annualRate, years);

  const rows: Array<Record<string, number>> = [];
  let balance = principal;
  let cumulativeInterest = 0.0;
  let cumulativePrincipal = 0.0;
  for (let i = 0; i < limit; i++) {
    if (balance <= 0) break;
    const interest = balance * r;
    let principalPart = payment - interest;
    if (principalPart < 0) principalPart = 0.0; // negative amortisation: rate exceeds payment
    const extra = Math.min(extraPrincipal, Math.max(balance - principalPart, 0.0));
    if (principalPart + extra > balance) principalPart = balance - extra;
    balance = balance - principalPart - extra;
    cumulativeInterest += interest;
    cumulativePrincipal += principalPart + extra;
    rows.push({
      month: firstPaymentMonth + i + 1,
      payment: payment,
      interest: interest,
      principal: principalPart,
      extra_principal: extra,
      total_outlay: payment + extra,
      balance: Math.max(balance, 0.0),
      cumulative_interest: cumulativeInterest,
      cumulative_principal: cumulativePrincipal,
    });
  }
  return rows;
}

function balanceAfter(
  principal: number,
  annualRate: number,
  years: number,
  monthsElapsed: number,
  extraPrincipal = 0.0
): number {
  if (monthsElapsed <= 0) return Number(principal);
  const rows = amortizationSchedule(principal, annualRate, years, extraPrincipal, monthsElapsed);
  return rows.length ? rows[rows.length - 1].balance : Number(principal);
}

function totalInterest(
  principal: number,
  annualRate: number,
  years: number,
  extraPrincipal = 0.0
): number {
  const rows = amortizationSchedule(principal, annualRate, years, extraPrincipal);
  return rows.length ? rows[rows.length - 1].cumulative_interest : 0.0;
}

function interestSavedByExtra(
  principal: number,
  annualRate: number,
  years: number,
  extraPrincipal: number
): Record<string, number> {
  const base = amortizationSchedule(principal, annualRate, years);
  const boosted = amortizationSchedule(principal, annualRate, years, extraPrincipal);
  const baseInterest = base.length ? base[base.length - 1].cumulative_interest : 0.0;
  const boostedInterest = boosted.length ? boosted[boosted.length - 1].cumulative_interest : 0.0;
  return {
    baseline_months: base.length,
    boosted_months: boosted.length,
    months_saved: base.length - boosted.length,
    baseline_interest: baseInterest,
    boosted_interest: boostedInterest,
    interest_saved: baseInterest - boostedInterest,
  };
}

/** Mortgage insurance while LTV is above 80%. */
function pmiMonthly(loanAmount: number, price: number, annualPmiRate: number): number {
  if (price <= 0) throw new Error('price must be positive');
  if (loanAmount / price <= 0.8) return 0.0;
  return (loanAmount * annualPmiRate) / MONTHS_PER_YEAR;
}

/** 0 means the loan never carried PMI; null means the scheduled balance never reaches the threshold. */
function monthsUntilPmiDrops(
  principal: number,
  annualRate: number,
  years: number,
  price: number,
  thresholdLtv: number
): number | null {
  if (price <= 0) throw new Error('price must be positive');
  const target = price * thresholdLtv;
  if (principal <= target) return 0;
  const rows = amortizationSchedule(principal, annualRate, years);
  for (const row of rows) {
    if (row.balance <= target) return Math.trunc(row.month);
  }
  return null;
}

/** Discount points at closing: 1 point = 1% of the loan. */
function pointsCost(loanAmount: number, points: number): number {
  if (points < 0) throw new Error('points cannot be negative');
  return (loanAmount * points) / 100.0;
}

function rateBuydownPayback(
  loanAmount: number,
  baseRate: number,
  boughtRate: number,
  years: number,
  points: number
): Record<string, number> {
  const basePayment = monthlyPayment(loanAmount, baseRate, years);
  const boughtPayment = monthlyPayment(loanAmount, boughtRate, years);
  const cost = pointsCost(loanAmount, points);
  const monthlySaving = basePayment - boughtPayment;
  return {
    monthly_saving: monthlySaving,
    cost: cost,
    months_to_breakeven: monthlySaving > 0 ? cost / monthlySaving : Number.POSITIVE_INFINITY,
  };
}

/** Balance-weighted average rate across a capital stack. */
function blendedRate(loans: Array<Record<string, number>>): number {
  let total = 0;
  for (const loan of loans) total += Number(loan.amount);
  if (total <= 0) throw new Error('total loan amount must be positive');
  let weighted = 0;
  for (const loan of loans) weighted += Number(loan.amount) * Number(loan.rate);
  return weighted / total;
}

export const mortgage: Fns = {
  monthly_payment: (a) => monthlyPayment(a.principal, a.annual_rate, a.years),
  payment_from_months: (a) => paymentFromMonths(a.principal, a.annual_rate, a.months),
  loan_from_payment: (a) => loanFromPayment(a.payment, a.annual_rate, a.years),
  loan_constant: (a) => loanConstant(a.annual_rate, a.years),
  total_interest: (a) =>
    totalInterest(a.principal, a.annual_rate, a.years, a.extra_principal ?? 0),
  interest_saved_by_extra: (a) =>
    interestSavedByExtra(a.principal, a.annual_rate, a.years, a.extra_principal),
  balance_after: (a) => balanceAfter(a.principal, a.annual_rate, a.years, a.months_elapsed),
  pmi_monthly: (a) => pmiMonthly(a.loan_amount, a.price, a.annual_pmi_rate ?? 0.0075),
  months_until_pmi_drops: (a) =>
    monthsUntilPmiDrops(
      a.principal,
      a.annual_rate,
      a.years,
      a.price,
      a.threshold_ltv ?? 0.8
    ),
  points_cost: (a) => pointsCost(a.loan_amount, a.points),
  rate_buydown_payback: (a) =>
    rateBuydownPayback(a.loan_amount, a.base_rate, a.bought_rate, a.years, a.points),
  blended_rate: (a) => blendedRate(a.loans),
};
