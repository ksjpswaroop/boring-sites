/**
 * All 20 calculator compute functions, in one file.
 * Each takes a typed input record and returns a CalcResult.
 *
 * Pure functions, deterministic, no I/O. They run client-side only.
 * The Calculator.astro component owns input collection + URL state + result rendering.
 */

import { fmtCurrency, fmtNumber, fmtPercent, fmtInteger } from './format';

export type CalcInputs = Record<string, number | string>;
export type CalcResult = {
  primary: Array<{ label: string; value: string }>;
  secondary?: Array<{ label: string; value: string }>;
  notes?: string[];
};

const num = (v: number | string | undefined, fallback = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
};

// ============================================================================
// Finance
// ============================================================================

export function mortgage(i: CalcInputs): CalcResult {
  const P = num(i.principal);
  const annualRate = num(i.rate) / 100;
  const years = num(i.years);
  const r = annualRate / 12;
  const n = years * 12;
  const M = r === 0 ? P / n : (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  const total = M * n;
  const interest = total - P;
  return {
    primary: [{ label: 'Monthly payment', value: fmtCurrency(M) }],
    secondary: [
      { label: 'Total paid', value: fmtCurrency(total) },
      { label: 'Total interest', value: fmtCurrency(interest) },
    ],
  };
}

export function loan(i: CalcInputs): CalcResult {
  return mortgage(i); // Same math, different name
}

export function percentage(i: CalcInputs): CalcResult {
  const mode = String(i.mode || 'pct-of');
  const X = num(i.x);
  const Y = num(i.y);
  let result = 0;
  if (mode === 'pct-of') result = (X / 100) * Y;
  else if (mode === 'is-what-pct') result = Y === 0 ? 0 : (X / Y) * 100;
  else if (mode === 'change') result = Y === 0 ? 0 : ((X - Y) / Y) * 100;
  return { primary: [{ label: 'Result', value: mode === 'change' ? fmtPercent(result) : fmtNumber(result) }] };
}

export function percentageChange(i: CalcInputs): CalcResult {
  const from = num(i.from);
  const to = num(i.to);
  const change = from === 0 ? 0 : ((to - from) / from) * 100;
  const diff = to - from;
  return {
    primary: [{ label: 'Percent change', value: fmtPercent(change) }],
    secondary: [{ label: 'Absolute change', value: fmtNumber(diff) }],
  };
}

export function tax(i: CalcInputs): CalcResult {
  // Simplified 2024 US federal brackets (single filer). Educational only.
  const income = num(i.income);
  const brackets = [
    { upTo: 11600, rate: 0.10 },
    { upTo: 47150, rate: 0.12 },
    { upTo: 100525, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243725, rate: 0.32 },
    { upTo: 609350, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ];
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (income <= b.upTo) {
      tax += (income - prev) * b.rate;
      break;
    }
    tax += (b.upTo - prev) * b.rate;
    prev = b.upTo;
  }
  const effective = income > 0 ? (tax / income) * 100 : 0;
  return {
    primary: [{ label: 'Estimated federal tax', value: fmtCurrency(tax) }],
    secondary: [
      { label: 'After-tax income', value: fmtCurrency(income - tax) },
      { label: 'Effective rate', value: fmtPercent(effective) },
    ],
    notes: ['Simplified 2024 US federal brackets, single filer. Standard deduction not applied.'],
  };
}

export function retirement(i: CalcInputs): CalcResult {
  const currentAge = num(i.currentAge);
  const retireAge = num(i.retireAge);
  const current = num(i.current);
  const monthly = num(i.monthly);
  const annualReturn = num(i.return) / 100;
  const years = Math.max(0, retireAge - currentAge);
  const months = years * 12;
  const r = annualReturn / 12;
  const fvLump = current * Math.pow(1 + r, months);
  const fvContrib = r === 0 ? monthly * months : monthly * ((Math.pow(1 + r, months) - 1) / r);
  const balance = fvLump + fvContrib;
  const contributed = current + monthly * months;
  const growth = balance - contributed;
  return {
    primary: [{ label: 'Projected balance at retirement', value: fmtCurrency(balance) }],
    secondary: [
      { label: 'Total contributed', value: fmtCurrency(contributed) },
      { label: 'Investment growth', value: fmtCurrency(growth) },
    ],
  };
}

export function compoundInterest(i: CalcInputs): CalcResult {
  const P = num(i.principal);
  const r = num(i.rate) / 100;
  const t = num(i.years);
  const n = num(i.frequency) || 12;
  const A = P * Math.pow(1 + r / n, n * t);
  const interest = A - P;
  return {
    primary: [{ label: 'Final amount', value: fmtCurrency(A) }],
    secondary: [
      { label: 'Total interest earned', value: fmtCurrency(interest) },
      { label: 'Effective annual rate', value: fmtPercent(((Math.pow(1 + r / n, n) - 1) * 100)) },
    ],
  };
}

export function amortization(i: CalcInputs): CalcResult {
  // Returns a chart-ready table + summary.
  const P = num(i.principal);
  const annualRate = num(i.rate) / 100;
  const years = num(i.years);
  const r = annualRate / 12;
  const n = years * 12;
  const M = r === 0 ? P / n : (P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  const schedule: Array<{ month: number; balance: number; interest: number; principal: number }> = [];
  let balance = P;
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const principal = M - interest;
    balance = Math.max(0, balance - principal);
    if (m === 1 || m % 12 === 0 || m === n) {
      schedule.push({ month: m, balance, interest, principal });
    }
  }
  const total = M * n;
  const totalInterest = total - P;
  return {
    primary: [{ label: 'Monthly payment', value: fmtCurrency(M) }],
    secondary: [
      { label: 'Total interest', value: fmtCurrency(totalInterest) },
      { label: 'Total paid', value: fmtCurrency(total) },
    ],
    notes: [`Schedule shows ${schedule.length} milestones. Final balance: ${fmtCurrency(balance)}`],
    // Custom: schedule data exposed for Chart.js rendering
    ...({ schedule } as any),
  };
}

// ============================================================================
// Fitness
// ============================================================================

export function bmi(i: CalcInputs): CalcResult {
  let heightM: number, weightKg: number;
  if (i.unit === 'metric') {
    heightM = num(i.height) / 100;
    weightKg = num(i.weight);
  } else {
    const inches = num(i.feet) * 12 + num(i.inches);
    heightM = inches * 0.0254;
    weightKg = num(i.weight) * 0.453592;
  }
  const bmi = heightM === 0 ? 0 : weightKg / (heightM * heightM);
  const category =
    bmi < 18.5 ? 'Underweight' :
    bmi < 25 ? 'Normal' :
    bmi < 30 ? 'Overweight' :
    'Obese';
  return {
    primary: [{ label: 'BMI', value: fmtNumber(bmi, 1) }],
    secondary: [{ label: 'Category', value: category }],
  };
}

export function calorie(i: CalcInputs): CalcResult {
  // Mifflin-St Jeor
  const sex = String(i.sex);
  const age = num(i.age);
  const weight = num(i.weight);
  const height = num(i.height);
  const bmr = sex === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very: 1.9,
  };
  const tdee = bmr * (activityMultipliers[String(i.activity)] || 1.2);
  return {
    primary: [{ label: 'TDEE (maintenance calories)', value: fmtInteger(tdee) + ' kcal' }],
    secondary: [
      { label: 'BMR (basal metabolic rate)', value: fmtInteger(bmr) + ' kcal' },
      { label: 'Mild weight loss (~0.25 kg/wk)', value: fmtInteger(tdee - 250) + ' kcal' },
      { label: 'Weight loss (~0.5 kg/wk)', value: fmtInteger(tdee - 500) + ' kcal' },
    ],
  };
}

export function calorieDeficit(i: CalcInputs): CalcResult {
  const tdee = num(i.tdee);
  const intake = num(i.intake);
  const deficit = tdee - intake;
  const weeklyLossKg = (deficit * 7) / 7700; // 7700 kcal ≈ 1 kg of fat
  const weeklyLossLb = weeklyLossKg * 2.20462;
  return {
    primary: [{ label: 'Daily deficit', value: fmtInteger(deficit) + ' kcal' }],
    secondary: [
      { label: 'Weekly loss', value: fmtNumber(weeklyLossLb, 2) + ' lb (' + fmtNumber(weeklyLossKg, 2) + ' kg)' },
    ],
    notes: deficit <= 0 ? ['You are not in a deficit — increase activity or reduce intake.'] : undefined,
  };
}

export function bodyFat(i: CalcInputs): CalcResult {
  // US Navy method
  const height = num(i.height); // cm
  const neck = num(i.neck); // cm
  const waist = num(i.waist); // cm
  let bf = 0;
  if (String(i.sex) === 'male') {
    if (waist - neck > 0) {
      bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
    }
  } else {
    const hip = num(i.hip);
    if (waist + hip - neck > 0) {
      bf = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
    }
  }
  return { primary: [{ label: 'Body fat %', value: fmtPercent(bf, 1) }] };
}

export function idealWeight(i: CalcInputs): CalcResult {
  const inches = num(i.feet) * 12 + num(i.inches);
  const over5ft = Math.max(0, inches - 60);
  const sex = String(i.sex);
  const devine = sex === 'male' ? 50 + 2.3 * over5ft : 45.5 + 2.3 * over5ft;
  const robinson = sex === 'male' ? 52 + 1.9 * over5ft : 49 + 1.7 * over5ft;
  const miller = sex === 'male' ? 56.2 + 1.41 * over5ft : 53.1 + 1.36 * over5ft;
  return {
    primary: [{ label: 'Devine formula', value: fmtNumber(devine) + ' kg' }],
    secondary: [
      { label: 'Robinson formula', value: fmtNumber(robinson) + ' kg' },
      { label: 'Miller formula', value: fmtNumber(miller) + ' kg' },
    ],
  };
}

// ============================================================================
// Date / time
// ============================================================================

export function age(i: CalcInputs): CalcResult {
  const birth = new Date(String(i.birth));
  const now = new Date();
  if (isNaN(birth.getTime())) return { primary: [{ label: 'Age', value: '—' }] };
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) { months--; const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0); days += prevMonth.getDate(); }
  if (months < 0) { years--; months += 12; }
  return {
    primary: [{ label: 'Age', value: `${years} years` }],
    secondary: [
      { label: 'In months', value: fmtInteger(years * 12 + months) },
      { label: 'In days', value: fmtInteger(Math.floor((now.getTime() - birth.getTime()) / 86400000)) },
      { label: 'Detailed', value: `${years}y ${months}m ${days}d` },
    ],
  };
}

export function dateDiff(i: CalcInputs): CalcResult {
  const start = new Date(String(i.start));
  const end = new Date(String(i.end));
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { primary: [{ label: 'Difference', value: '—' }] };
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return {
    primary: [{ label: 'Days between', value: fmtInteger(days) }],
    secondary: [
      { label: 'Weeks', value: fmtNumber(days / 7) },
      { label: 'Months (approx)', value: fmtNumber(days / 30.44) },
      { label: 'Years (approx)', value: fmtNumber(days / 365.25) },
    ],
  };
}

export function time(i: CalcInputs): CalcResult {
  const start = String(i.start);
  const end = String(i.end);
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60; // wraps over midnight
  return {
    primary: [{ label: 'Duration', value: `${Math.floor(minutes / 60)}h ${minutes % 60}m` }],
    secondary: [{ label: 'In minutes', value: fmtInteger(minutes) }],
  };
}

export function ovulation(i: CalcInputs): CalcResult {
  const last = new Date(String(i.lastPeriod));
  const cycle = num(i.cycle) || 28;
  if (isNaN(last.getTime())) return { primary: [{ label: 'Ovulation', value: '—' }] };
  const ovulationDay = new Date(last);
  ovulationDay.setDate(ovulationDay.getDate() + (cycle - 14));
  const fertileStart = new Date(ovulationDay);
  fertileStart.setDate(fertileStart.getDate() - 5);
  const fertileEnd = new Date(ovulationDay);
  fertileEnd.setDate(fertileEnd.getDate() + 1);
  const next = new Date(last);
  next.setDate(next.getDate() + cycle);
  return {
    primary: [{ label: 'Estimated ovulation', value: ovulationDay.toISOString().slice(0, 10) }],
    secondary: [
      { label: 'Fertile window', value: `${fertileStart.toISOString().slice(0, 10)} → ${fertileEnd.toISOString().slice(0, 10)}` },
      { label: 'Next period', value: next.toISOString().slice(0, 10) },
    ],
  };
}

// ============================================================================
// Math / utility
// ============================================================================

export function gpa(i: CalcInputs): CalcResult {
  const grades = String(i.grades || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const credits = String(i.credits || '').split(',').map(s => parseFloat(s.trim())).filter(n => Number.isFinite(n));
  const map: Record<string, number> = { 'A+': 4.0, A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7, 'C+': 2.3, C: 2.0, 'C-': 1.7, 'D+': 1.3, D: 1.0, 'F': 0 };
  if (grades.length === 0 || grades.length !== credits.length) {
    return { primary: [{ label: 'GPA', value: '—' }], notes: ['Provide matching comma-separated grades and credits.'] };
  }
  let totalPoints = 0;
  let totalCredits = 0;
  for (let j = 0; j < grades.length; j++) {
    const points = map[grades[j]] ?? 0;
    totalPoints += points * credits[j];
    totalCredits += credits[j];
  }
  const gpa = totalCredits === 0 ? 0 : totalPoints / totalCredits;
  return {
    primary: [{ label: 'GPA (4.0 scale)', value: fmtNumber(gpa, 2) }],
    secondary: [
      { label: 'Total credits', value: fmtNumber(totalCredits, 1) },
      { label: 'Total points', value: fmtNumber(totalPoints, 2) },
    ],
  };
}

export function tip(i: CalcInputs): CalcResult {
  const bill = num(i.bill);
  const pct = num(i.percent);
  const people = Math.max(1, num(i.people) || 1);
  const tipAmt = bill * (pct / 100);
  const total = bill + tipAmt;
  const perPerson = total / people;
  const tipPerPerson = tipAmt / people;
  return {
    primary: [{ label: 'Total with tip', value: fmtCurrency(total) }],
    secondary: [
      { label: 'Tip amount', value: fmtCurrency(tipAmt) },
      { label: 'Per person (total)', value: fmtCurrency(perPerson) },
      { label: 'Per person (tip)', value: fmtCurrency(tipPerPerson) },
    ],
  };
}

export function average(i: CalcInputs): CalcResult {
  const nums = String(i.numbers || '').split(/[,\s]+/).map(s => parseFloat(s)).filter(n => Number.isFinite(n));
  if (nums.length === 0) return { primary: [{ label: 'Mean', value: '—' }] };
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  const median = nums.length % 2 === 0 ? (sorted[nums.length / 2 - 1] + sorted[nums.length / 2]) / 2 : sorted[(nums.length - 1) / 2];
  const counts: Record<number, number> = {};
  for (const n of nums) counts[n] = (counts[n] || 0) + 1;
  const mode = Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
  return {
    primary: [{ label: 'Mean', value: fmtNumber(mean) }],
    secondary: [
      { label: 'Median', value: fmtNumber(median) },
      { label: 'Mode', value: fmtNumber(mode) },
      { label: 'Min / Max', value: `${fmtNumber(sorted[0])} / ${fmtNumber(sorted[sorted.length - 1])}` },
      { label: 'Count', value: fmtInteger(nums.length) },
    ],
  };
}

export function wordCounter(i: CalcInputs): CalcResult {
  const text = String(i.text || '');
  const trimmed = text.trim();
  const words = trimmed === '' ? [] : trimmed.split(/\s+/);
  const sentences = trimmed === '' ? 0 : (trimmed.match(/[.!?]+/g) || []).length;
  const paragraphs = trimmed === '' ? 0 : trimmed.split(/\n\s*\n/).filter(p => p.trim()).length;
  const charsNoSpace = text.replace(/\s/g, '').length;
  return {
    primary: [{ label: 'Words', value: fmtInteger(words.length) }],
    secondary: [
      { label: 'Characters', value: fmtInteger(text.length) },
      { label: 'Characters (no spaces)', value: fmtInteger(charsNoSpace) },
      { label: 'Sentences', value: fmtInteger(sentences) },
      { label: 'Paragraphs', value: fmtInteger(paragraphs) },
    ],
  };
}
