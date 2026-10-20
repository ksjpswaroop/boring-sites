/**
 * commercial -- port of app/engine/commercial.py, restricted to the functions the calculator catalogue calls.
 *
 * Each entry is `(args) => value`, with args already coerced (percent arguments arrive as fractions:
 * 6.5% in the UI is 0.065 here). Return the raw value the Python function returns -- no rounding,
 * no formatting. Formatting belongs to the page, and a rounded value would hide a parity failure.
 *
 * Matched subtleties:
 * - monthly_payment() is imported from mortgage.py in Python; it is module-local here (mortgage.ts is a
 *   separate port) and returns a MONTHLY payment, so every annual debt service multiplies by 12.
 * - Python's round() is half-to-even and amortisation months are int(round(years * 12)); Math.round
 *   would give a different month count for .5 inputs, and one month moves the annuity value.
 * - `binding = min(caps, key=...)` resolves ties by insertion order (ltv, dscr, debt_yield), so the
 *   comparison here is strict `<` in that order rather than Math.min.
 * - size_loan() reports ltv_achieved / dscr_achieved / debt_yield_achieved as None when the
 *   denominator is zero -- null, not 0.
 * - equity_waterfall() walks only the FIRST promote tier that has residual to split (the Python loop
 *   ends with `break`); tiers_applied therefore holds at most one entry.
 */
import type { Fns } from './index';

const MONTHS_PER_YEAR = 12;
const DEFAULT_MIN_DSCR = 1.25;
const DEFAULT_MIN_DEBT_YIELD = 0.1;

/** Python's round(): half-to-even, unlike Math.round's half-up. */
function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

/** app/engine/mortgage.py monthly_payment -- monthly, fully amortising. */
function monthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal < 0) throw new Error(`principal cannot be negative, got ${principal}`);
  if (years <= 0) throw new Error(`years must be positive, got ${years}`);
  if (principal === 0) return 0;
  if (annualRate < 0) throw new Error('annual_rate cannot be negative');
  const n = pyRound(years * MONTHS_PER_YEAR);
  const r = annualRate / MONTHS_PER_YEAR;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function maxLoanByLtv(price: number, ltv: number): number {
  if (!(0 < ltv && ltv <= 1)) throw new Error('ltv must be in (0, 1]');
  return price * ltv;
}

function maxLoanByDscr(
  noiValue: number,
  minDscr: number,
  annualRate: number,
  amortYears: number
): number {
  // A non-positive floor means the lender applies no coverage test at all.
  if (minDscr <= 0) return Infinity;
  if (noiValue <= 0) return 0;
  const maxPayment = noiValue / minDscr / MONTHS_PER_YEAR;
  const n = pyRound(amortYears * MONTHS_PER_YEAR);
  const r = annualRate / MONTHS_PER_YEAR;
  if (r === 0) return maxPayment * n;
  return (maxPayment * (1 - Math.pow(1 + r, -n))) / r;
}

function maxLoanByDebtYield(noiValue: number, minDebtYield: number): number {
  if (minDebtYield <= 0) return Infinity;
  return Math.max(noiValue, 0) / minDebtYield;
}

function yieldOnCost(stabilizedNoi: number, totalCost: number): number | null {
  if (totalCost <= 0) return null;
  return stabilizedNoi / totalCost;
}

export const commercial: Fns = {
  max_loan_by_dscr(a) {
    return maxLoanByDscr(a.noi_value, a.min_dscr, a.annual_rate, a.amort_years);
  },

  max_loan_by_debt_yield(a) {
    return maxLoanByDebtYield(a.noi_value, a.min_debt_yield ?? DEFAULT_MIN_DEBT_YIELD);
  },

  size_loan(a) {
    const price: number = a.price;
    const noi: number = a.noi_value;
    const ltv: number = a.ltv ?? 0.75;
    const minDscr: number = a.min_dscr ?? DEFAULT_MIN_DSCR;
    const minDebtYield: number = a.min_debt_yield ?? DEFAULT_MIN_DEBT_YIELD;
    const annualRate: number = a.annual_rate ?? 0.0622;
    const amortYears: number = a.amort_years ?? 30;

    const caps = {
      ltv: maxLoanByLtv(price, ltv),
      dscr: maxLoanByDscr(noi, minDscr, annualRate, amortYears),
      debt_yield: maxLoanByDebtYield(noi, minDebtYield),
    };
    // Ties resolve to the earlier key, matching Python's min() over the dict's insertion order.
    let binding: keyof typeof caps = 'ltv';
    if (caps.dscr < caps[binding]) binding = 'dscr';
    if (caps.debt_yield < caps[binding]) binding = 'debt_yield';
    const loan = caps[binding];

    const annualDs = loan > 0 ? monthlyPayment(loan, annualRate, amortYears) * MONTHS_PER_YEAR : 0;
    return {
      loan,
      binding_constraint: binding,
      constraint_caps: caps,
      ltv_achieved: price > 0 ? loan / price : null,
      dscr_achieved: annualDs > 0 ? noi / annualDs : null,
      debt_yield_achieved: loan > 0 ? noi / loan : null,
      annual_debt_service: annualDs,
      equity_required: price - loan,
      loan_to_cost: null, // filled by callers who know total cost
    };
  },

  loan_to_cost(a) {
    if (a.total_project_cost <= 0) return null;
    return a.loan / a.total_project_cost;
  },

  dscr_after_rate_move(a) {
    const noi: number = a.noi_value;
    const loan: number = a.loan;
    const baseRate: number = a.base_rate;
    const amortYears: number = a.amort_years;
    const rateDelta: number = a.rate_delta;
    const ioMonths: number = a.io_months ?? 0;

    const coverage = (rate: number): number | null => {
      if (loan <= 0) return null;
      const ds = ioMonths > 0 ? loan * rate : monthlyPayment(loan, rate, amortYears) * MONTHS_PER_YEAR;
      return ds > 0 ? noi / ds : null;
    };

    return {
      base_rate: baseRate,
      dscr_base: coverage(baseRate),
      dscr_stressed: coverage(baseRate + rateDelta),
      rate_stressed: baseRate + rateDelta,
      payment_stressed: loan > 0 ? monthlyPayment(loan, baseRate + rateDelta, amortYears) : 0,
    };
  },

  nnn_effective_rent(a) {
    const baseRent: number = a.base_rent;
    const recoverableOpex: number = a.recoverable_opex;
    const recoveryRatio: number = a.recovery_ratio ?? 1;
    const feeRate: number = a.management_fee_on_recovery ?? 0;
    if (!(0 <= recoveryRatio && recoveryRatio <= 1)) {
      throw new Error('recovery_ratio must be in [0, 1]');
    }
    const recovered = recoverableOpex * recoveryRatio;
    const fee = recovered * feeRate;
    return {
      base_rent: baseRent,
      recoverable_opex: recoverableOpex,
      recovered,
      unrecovered_opex: recoverableOpex - recovered,
      management_fee_on_recovery: fee,
      net_effective_rent: baseRent + recovered - fee,
    };
  },

  expense_stop_rent(a) {
    const baseYear: number = a.base_year_opex;
    const current: number = a.current_opex;
    const tenantShare: number = a.tenant_share ?? 1;
    if (!(0 <= tenantShare && tenantShare <= 1)) {
      throw new Error('tenant_share must be in [0, 1]');
    }
    const increase = Math.max(current - baseYear, 0);
    return {
      base_year_expense: baseYear,
      current_expense: current,
      increase,
      tenant_reimbursement: increase * tenantShare,
      landlord_exposure: increase * (1 - tenantShare),
    };
  },

  lease_rollover_exposure(a) {
    const leases: Array<Record<string, number>> = a.leases ?? [];
    const withinYears: number = a.within_years;
    if (!leases.length) {
      return { annual_rent: 0, rolling_rent: 0, rolling_pct: 0, rolling_leases: 0 };
    }
    const total = leases.reduce((s, l) => s + Number(l.annual_rent), 0);
    const expiring = leases.filter((l) => Number(l.years_remaining) <= withinYears);
    const rolling = expiring.reduce((s, l) => s + Number(l.annual_rent), 0);
    return {
      annual_rent: total,
      rolling_rent: rolling,
      rolling_pct: total > 0 ? rolling / total : 0,
      rolling_leases: expiring.length,
    };
  },

  walt(a) {
    const leases: Array<Record<string, number>> = a.leases ?? [];
    const total = leases.reduce((s, l) => s + Number(l.annual_rent), 0);
    if (total <= 0) return 0;
    return (
      leases.reduce((s, l) => s + Number(l.annual_rent) * Number(l.years_remaining), 0) / total
    );
  },

  value_add_analysis(a) {
    const purchasePrice: number = a.purchase_price;
    const capex: number = a.capex;
    const stabilizedNoi: number = a.stabilized_noi;
    const exitCapRate: number = a.exit_cap_rate;
    const holdYears: number = a.hold_years ?? 3;
    const inPlaceNoi: number = a.in_place_noi ?? 0;
    if (exitCapRate <= 0) throw new Error('exit_cap_rate must be positive');

    const totalCost = purchasePrice + capex;
    const exitValue = stabilizedNoi / exitCapRate;
    const valueCreated = exitValue - totalCost;
    const yoc = yieldOnCost(stabilizedNoi, totalCost);
    return {
      total_cost: totalCost,
      stabilized_noi: stabilizedNoi,
      exit_value: exitValue,
      value_created: valueCreated,
      value_created_per_capex_dollar: capex > 0 ? valueCreated / capex : null,
      going_in_cap: purchasePrice > 0 ? inPlaceNoi / purchasePrice : null,
      yield_on_cost: yoc,
      development_spread: yoc !== null ? yoc - exitCapRate : null,
      annualized_value_creation: holdYears > 0 ? valueCreated / totalCost / holdYears : null,
    };
  },

  yield_on_cost(a) {
    return yieldOnCost(a.stabilized_noi, a.total_cost);
  },

  development_spread(a) {
    return a.yield_on_cost_value - a.exit_cap_rate;
  },

  cash_out_refinance(a) {
    const noi: number = a.noi_value;
    const exitCapRate: number = a.exit_cap_rate;
    const refiLtv: number = a.refi_ltv;
    const existingBalance: number = a.existing_balance;
    const refiRate: number = a.refi_rate;
    const refiAmortYears: number = a.refi_amort_years ?? 30;
    if (exitCapRate <= 0) throw new Error('exit_cap_rate must be positive');

    const appraised = noi / exitCapRate;
    const newLoan = appraised * refiLtv;
    const newDs = newLoan > 0 ? monthlyPayment(newLoan, refiRate, refiAmortYears) * MONTHS_PER_YEAR : 0;
    return {
      appraised_value: appraised,
      new_loan: newLoan,
      existing_balance: existingBalance,
      cash_out: newLoan - existingBalance,
      new_annual_debt_service: newDs,
      post_refi_dscr: newDs > 0 ? noi / newDs : null,
      equity_left_in_deal: appraised - newLoan,
    };
  },

  equity_waterfall(a) {
    const cash: number = a.distributable_cash;
    const lpContribution: number = a.lp_contribution;
    const gpContribution: number = a.gp_contribution;
    const preferredReturn: number = a.preferred_return ?? 0.08;
    const years: number = a.years ?? 1;
    const tiers: Array<Record<string, number>> = a.tiers ?? [
      { multiple: 1.5, gp_split: 0.2 },
      { multiple: 2.0, gp_split: 0.3 },
      { multiple: 1e9, gp_split: 0.4 },
    ];

    const totalCapital = lpContribution + gpContribution;
    if (totalCapital <= 0) throw new Error('capital must be positive');
    if (cash < 0) throw new Error('distributable cash cannot be negative');

    const gpCapitalShare = gpContribution / totalCapital;
    let remaining = cash;

    // Tier 1 -- return of capital, pro-rata on contribution.
    const returnOfCapital = Math.min(remaining, totalCapital);
    let lpDist = returnOfCapital * (1 - gpCapitalShare);
    let gpDist = returnOfCapital * gpCapitalShare;
    remaining -= returnOfCapital;

    // Tier 2 -- preferred return to the LP, simple, on its own capital.
    const prefTarget = lpContribution * preferredReturn * Math.max(years, 0);
    const prefPaid = Math.min(remaining, prefTarget);
    lpDist += prefPaid;
    remaining -= prefPaid;

    // Tier 3 -- the first promote tier with residual to split takes the whole residual.
    const tierLog: Array<Record<string, number>> = [];
    const ordered = [...tiers].sort(
      (x, y) => Number(x.multiple ?? 1e9) - Number(y.multiple ?? 1e9)
    );
    for (const tier of ordered) {
      if (remaining <= 0) break;
      const split = Number(tier.gp_split ?? 0.2);
      if (!(0 <= split && split <= 1)) throw new Error('gp_split must be in [0, 1]');
      const gpTake = remaining * split;
      gpDist += gpTake;
      lpDist += remaining - gpTake;
      tierLog.push({ multiple: Number(tier.multiple ?? 1e9), gp_split: split, gp_take: gpTake });
      remaining = 0;
      break;
    }

    return {
      distributable_cash: cash,
      lp_contribution: lpContribution,
      gp_contribution: gpContribution,
      return_of_capital: returnOfCapital,
      preferred_return_target: prefTarget,
      preferred_return_paid: prefPaid,
      lp_distribution: lpDist,
      gp_distribution: gpDist,
      tiers_applied: tierLog,
      lp_multiple: lpContribution > 0 ? lpDist / lpContribution : null,
      gp_multiple: gpContribution > 0 ? gpDist / gpContribution : null,
      balances: Math.abs(lpDist + gpDist - cash) < 1e-6,
      unpaid_preferred_return: Math.max(prefTarget - prefPaid, 0),
    };
  },

  sources_and_uses(a) {
    const price: number = a.price;
    const loan: number = a.loan;
    const loanFees: number = a.loan_fees ?? 0;
    const uses = {
      purchase_price: price,
      closing_costs: a.closing_costs,
      capex: a.capex,
      loan_fees: loanFees,
      working_capital: a.working_capital ?? 0,
    };
    // Summed in insertion order, as Python sums dict.values().
    const totalUses =
      uses.purchase_price + uses.closing_costs + uses.capex + uses.loan_fees + uses.working_capital;
    const netLoan = loan - loanFees;
    const equity = totalUses - netLoan;
    return {
      uses,
      total_uses: totalUses,
      sources: { senior_loan: loan, sponsor_equity: equity },
      net_loan_proceeds: netLoan,
      total_sources: netLoan + equity,
      equity_required: equity,
      balances: Math.abs(netLoan + equity - totalUses) < 1e-6,
    };
  },

  stabilized_occupancy_needed(a) {
    const gpr: number = a.gross_potential_rent;
    if (gpr <= 0) return null;
    const ratio = (a.total_opex + a.debt_service_annual) / gpr;
    return ratio <= 1 ? ratio : null;
  },
};
