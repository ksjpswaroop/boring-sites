/**
 * Calculator registry — single source of truth for all 20 calculators.
 *
 * Each calculator has:
 *   - slug, title, description (SEO)
 *   - category (Finance / Fitness / Date / Math)
 *   - icon (emoji)
 *   - inputs (form field definitions)
 *   - compute (pure function from src/lib/calc.ts)
 *   - related (cross-link slugs)
 *   - howItWorks (educational content)
 *   - disclaimer (site-specific)
 *
 * The dynamic route `src/pages/calc/[slug].astro` reads this registry
 * and renders the right calculator for each slug.
 */

import * as calc from '../lib/calc';
import type { CalcInputs, CalcResult } from '../lib/calc';

export type InputType = 'number' | 'percent' | 'currency' | 'date' | 'select' | 'text' | 'textarea';

export interface InputDef {
  name: string;
  label: string;
  type: InputType;
  default?: string | number;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  unit?: string; // e.g. '$', '%', 'kg'
  options?: Array<{ value: string; label: string }>; // for select
  hint?: string;
  width?: 'full' | 'half' | 'third';
}

export type Category = 'Finance' | 'Fitness' | 'Date' | 'Math' | 'Other';

export interface Calculator {
  slug: string;
  title: string;
  description: string;
  category: Category;
  icon: string;
  inputs: InputDef[];
  compute: (i: CalcInputs) => CalcResult;
  related: string[]; // slugs
  howItWorks: string;
  disclaimer?: string;
  popular?: boolean;
}

export const calculators: Calculator[] = [
  // --------------------------------------------------------------------------
  // Finance
  // --------------------------------------------------------------------------
  {
    slug: 'mortgage',
    title: 'Mortgage Calculator',
    description: 'Calculate your monthly mortgage payment, total interest, and total cost. Free, no signup.',
    category: 'Finance',
    icon: '🏠',
    popular: true,
    inputs: [
      { name: 'principal', label: 'Loan amount', type: 'currency', default: 300000, min: 0, step: 1000, unit: '$' },
      { name: 'rate', label: 'Annual interest rate', type: 'percent', default: 6.5, min: 0, max: 30, step: 0.05, unit: '%' },
      { name: 'years', label: 'Term', type: 'number', default: 30, min: 1, max: 50, step: 1, unit: 'years' },
    ],
    compute: calc.mortgage,
    related: ['amortization', 'loan', 'percentage'],
    howItWorks: 'Standard amortization formula: M = P × [r(1+r)^n] / [(1+r)^n − 1], where r is the monthly rate (annual ÷ 12) and n is the number of months (years × 12). Excludes property taxes, insurance, and PMI.',
  },
  {
    slug: 'loan',
    title: 'Loan Calculator',
    description: 'Calculate monthly payments for any fixed-rate loan. Free, no signup.',
    category: 'Finance',
    icon: '💵',
    inputs: [
      { name: 'principal', label: 'Loan amount', type: 'currency', default: 20000, min: 0, step: 100, unit: '$' },
      { name: 'rate', label: 'Annual interest rate', type: 'percent', default: 8, min: 0, max: 50, step: 0.05, unit: '%' },
      { name: 'years', label: 'Term', type: 'number', default: 5, min: 1, max: 30, step: 1, unit: 'years' },
    ],
    compute: calc.loan,
    related: ['mortgage', 'amortization', 'compound-interest'],
    howItWorks: 'Same math as the mortgage calculator — standard amortization. Use it for auto loans, personal loans, or any fixed-rate installment loan.',
  },
  {
    slug: 'amortization',
    title: 'Amortization Calculator',
    description: 'See a full amortization schedule for a loan. Monthly balance, interest, and principal breakdown.',
    category: 'Finance',
    icon: '📊',
    inputs: [
      { name: 'principal', label: 'Loan amount', type: 'currency', default: 300000, min: 0, step: 1000, unit: '$' },
      { name: 'rate', label: 'Annual interest rate', type: 'percent', default: 6.5, min: 0, max: 30, step: 0.05, unit: '%' },
      { name: 'years', label: 'Term', type: 'number', default: 30, min: 1, max: 50, step: 1, unit: 'years' },
    ],
    compute: calc.amortization,
    related: ['mortgage', 'loan', 'compound-interest'],
    howItWorks: 'Walks the loan month-by-month, computing the interest portion (balance × monthly rate) and the principal portion (payment − interest) for each month, until the balance hits zero. (V1.1 will render a chart.)',
  },
  {
    slug: 'compound-interest',
    title: 'Compound Interest Calculator',
    description: 'See how your savings or investments grow with compound interest. Free, no signup.',
    category: 'Finance',
    icon: '📈',
    popular: true,
    inputs: [
      { name: 'principal', label: 'Initial amount', type: 'currency', default: 10000, min: 0, step: 100, unit: '$' },
      { name: 'rate', label: 'Annual interest rate', type: 'percent', default: 7, min: 0, max: 30, step: 0.1, unit: '%' },
      { name: 'years', label: 'Years', type: 'number', default: 20, min: 1, max: 100, step: 1, unit: 'years' },
      { name: 'frequency', label: 'Compounding frequency', type: 'select', default: '12', options: [
        { value: '1', label: 'Annually' },
        { value: '4', label: 'Quarterly' },
        { value: '12', label: 'Monthly' },
        { value: '365', label: 'Daily' },
      ] },
    ],
    compute: calc.compoundInterest,
    related: ['retirement', 'percentage', 'loan'],
    howItWorks: 'A = P × (1 + r/n)^(n×t), where P is principal, r is annual rate, n is compounding frequency, t is years. (V1.1 will render a chart.)',
  },
  {
    slug: 'tax',
    title: 'US Federal Tax Calculator (2024)',
    description: 'Estimate your 2024 US federal income tax. Simplified brackets, single filer. Educational only.',
    category: 'Finance',
    icon: '🧾',
    inputs: [
      { name: 'income', label: 'Annual taxable income', type: 'currency', default: 75000, min: 0, step: 1000, unit: '$' },
    ],
    compute: calc.tax,
    related: ['percentage', 'retirement'],
    howItWorks: 'Walks 2024 US federal tax brackets for a single filer. Does NOT apply the standard deduction, FICA, state taxes, or credits. Use it for a rough estimate, not for filing.',
    disclaimer: 'Educational only. Not tax advice. Verify with a CPA or tax professional.',
  },
  {
    slug: 'retirement',
    title: 'Retirement Calculator',
    description: 'Project your retirement balance based on current savings, monthly contributions, and expected return.',
    category: 'Finance',
    icon: '🌴',
    popular: true,
    inputs: [
      { name: 'currentAge', label: 'Current age', type: 'number', default: 30, min: 18, max: 80, step: 1, unit: 'yrs' },
      { name: 'retireAge', label: 'Retirement age', type: 'number', default: 65, min: 40, max: 90, step: 1, unit: 'yrs' },
      { name: 'current', label: 'Current savings', type: 'currency', default: 50000, min: 0, step: 1000, unit: '$' },
      { name: 'monthly', label: 'Monthly contribution', type: 'currency', default: 500, min: 0, step: 50, unit: '$' },
      { name: 'return', label: 'Expected annual return', type: 'percent', default: 7, min: 0, max: 20, step: 0.5, unit: '%' },
    ],
    compute: calc.retirement,
    related: ['compound-interest', 'percentage', 'tax'],
    howItWorks: 'Future value of current savings + future value of monthly contributions, both compounded monthly. Assumes constant contribution and constant return (real markets vary).',
  },

  // --------------------------------------------------------------------------
  // Fitness
  // --------------------------------------------------------------------------
  {
    slug: 'bmi',
    title: 'BMI Calculator',
    description: 'Calculate your Body Mass Index. Supports metric and US units.',
    category: 'Fitness',
    icon: '⚖️',
    popular: true,
    inputs: [
      { name: 'unit', label: 'Units', type: 'select', default: 'metric', options: [
        { value: 'metric', label: 'Metric (cm, kg)' },
        { value: 'us', label: 'US (ft/in, lb)' },
      ] },
      { name: 'height', label: 'Height (metric)', type: 'number', default: 170, min: 50, max: 250, step: 1, unit: 'cm' },
      { name: 'weight', label: 'Weight (metric)', type: 'number', default: 70, min: 10, max: 500, step: 0.5, unit: 'kg' },
      { name: 'feet', label: 'Height (US feet)', type: 'number', default: 5, min: 1, max: 8, step: 1, unit: 'ft' },
      { name: 'inches', label: 'Height (US inches)', type: 'number', default: 7, min: 0, max: 11, step: 1, unit: 'in' },
    ],
    compute: calc.bmi,
    related: ['ideal-weight', 'body-fat', 'calorie'],
    howItWorks: 'BMI = weight (kg) / height (m)². Categories: <18.5 underweight, 18.5-24.9 normal, 25-29.9 overweight, 30+ obese. (V1.1 will only show inputs for the selected unit.)',
    disclaimer: 'BMI is a population-level heuristic, not a measure of individual health. Athletes and muscular people often score high. Use it as one signal, not the final word.',
  },
  {
    slug: 'calorie',
    title: 'Calorie Calculator (TDEE)',
    description: 'Calculate your Total Daily Energy Expenditure. Mifflin-St Jeor formula.',
    category: 'Fitness',
    icon: '🍽️',
    inputs: [
      { name: 'sex', label: 'Sex', type: 'select', default: 'male', options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
      ] },
      { name: 'age', label: 'Age', type: 'number', default: 30, min: 10, max: 100, step: 1, unit: 'yrs' },
      { name: 'weight', label: 'Weight', type: 'number', default: 70, min: 20, max: 300, step: 0.5, unit: 'kg' },
      { name: 'height', label: 'Height', type: 'number', default: 170, min: 100, max: 250, step: 1, unit: 'cm' },
      { name: 'activity', label: 'Activity level', type: 'select', default: 'moderate', options: [
        { value: 'sedentary', label: 'Sedentary (desk job)' },
        { value: 'light', label: 'Light (1-3 days/wk)' },
        { value: 'moderate', label: 'Moderate (3-5 days/wk)' },
        { value: 'active', label: 'Active (6-7 days/wk)' },
        { value: 'very', label: 'Very active (athlete)' },
      ] },
    ],
    compute: calc.calorie,
    related: ['calorie-deficit', 'bmi', 'body-fat'],
    howItWorks: 'Mifflin-St Jeor: BMR = 10×weight(kg) + 6.25×height(cm) − 5×age(yr) + 5 (male) or − 161 (female). TDEE = BMR × activity multiplier.',
    disclaimer: 'Estimate only. Individual needs vary. Consult a registered dietitian for personalized advice.',
  },
  {
    slug: 'calorie-deficit',
    title: 'Calorie Deficit Calculator',
    description: 'See how much weight you would lose per week at a given calorie deficit.',
    category: 'Fitness',
    icon: '🔥',
    inputs: [
      { name: 'tdee', label: 'Your TDEE', type: 'number', default: 2200, min: 800, max: 6000, step: 50, unit: 'kcal' },
      { name: 'intake', label: 'Daily calorie intake', type: 'number', default: 1700, min: 0, max: 6000, step: 50, unit: 'kcal' },
    ],
    compute: calc.calorieDeficit,
    related: ['calorie', 'bmi'],
    howItWorks: 'Weekly loss = (deficit × 7) / 7700 kcal per kg of fat. Note: actual weight loss also includes water, glycogen, and lean mass, so the first few weeks are usually faster than this rate.',
    disclaimer: 'Estimate. Do not go below 1200 kcal/day (women) or 1500 kcal/day (men) without medical supervision.',
  },
  {
    slug: 'body-fat',
    title: 'Body Fat Calculator (US Navy)',
    description: 'Estimate body fat percentage using the US Navy circumference method.',
    category: 'Fitness',
    icon: '💪',
    inputs: [
      { name: 'sex', label: 'Sex', type: 'select', default: 'male', options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
      ] },
      { name: 'height', label: 'Height', type: 'number', default: 175, min: 100, max: 250, step: 1, unit: 'cm' },
      { name: 'neck', label: 'Neck circumference', type: 'number', default: 38, min: 20, max: 60, step: 0.5, unit: 'cm' },
      { name: 'waist', label: 'Waist circumference', type: 'number', default: 85, min: 40, max: 200, step: 0.5, unit: 'cm' },
      { name: 'hip', label: 'Hip circumference (female only)', type: 'number', default: 95, min: 40, max: 200, step: 0.5, unit: 'cm' },
    ],
    compute: calc.bodyFat,
    related: ['bmi', 'ideal-weight', 'calorie'],
    howItWorks: 'US Navy formula. Men: 86.010 × log10(waist − neck) − 70.041 × log10(height) + 36.76. Women: 163.205 × log10(waist + hip − neck) − 97.684 × log10(height) − 78.387. (Logarithm = log10.)',
  },
  {
    slug: 'ideal-weight',
    title: 'Ideal Weight Calculator',
    description: 'Estimate your ideal body weight using Devine, Robinson, and Miller formulas.',
    category: 'Fitness',
    icon: '🎯',
    inputs: [
      { name: 'sex', label: 'Sex', type: 'select', default: 'male', options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
      ] },
      { name: 'feet', label: 'Height (feet)', type: 'number', default: 5, min: 3, max: 8, step: 1, unit: 'ft' },
      { name: 'inches', label: 'Height (inches)', type: 'number', default: 9, min: 0, max: 11, step: 1, unit: 'in' },
    ],
    compute: calc.idealWeight,
    related: ['bmi', 'body-fat'],
    howItWorks: 'Three classic formulas for ideal body weight based on height (in inches over 5 feet). Devine is most commonly used in medical contexts. All are population averages, not personal targets.',
  },

  // --------------------------------------------------------------------------
  // Date / time
  // --------------------------------------------------------------------------
  {
    slug: 'age',
    title: 'Age Calculator',
    description: 'Calculate exact age in years, months, and days from a date of birth.',
    category: 'Date',
    icon: '🎂',
    popular: true,
    inputs: [
      { name: 'birth', label: 'Date of birth', type: 'date', default: '1995-01-01' },
    ],
    compute: calc.age,
    related: ['date-diff', 'time', 'ovulation'],
    howItWorks: 'Computes the exact difference between the birth date and today, accounting for varying month lengths.',
  },
  {
    slug: 'date-diff',
    title: 'Date Difference Calculator',
    description: 'Calculate the number of days, weeks, or months between two dates.',
    category: 'Date',
    icon: '📅',
    inputs: [
      { name: 'start', label: 'Start date', type: 'date', default: '2026-01-01' },
      { name: 'end', label: 'End date', type: 'date', default: '2026-12-31' },
    ],
    compute: calc.dateDiff,
    related: ['age', 'time', 'ovulation'],
    howItWorks: 'Days = (end − start) in milliseconds ÷ 86,400,000. Months and years are approximate (using 30.44 and 365.25 days).',
  },
  {
    slug: 'time',
    title: 'Time Duration Calculator',
    description: 'Calculate the duration between two times of day.',
    category: 'Date',
    icon: '⏱️',
    inputs: [
      { name: 'start', label: 'Start time', type: 'text', default: '09:00', placeholder: 'HH:MM' },
      { name: 'end', label: 'End time', type: 'text', default: '17:30', placeholder: 'HH:MM' },
    ],
    compute: calc.time,
    related: ['age', 'date-diff'],
    howItWorks: 'Converts each time to minutes since midnight, subtracts, and handles the case where end is past midnight by adding 24 hours.',
  },
  {
    slug: 'ovulation',
    title: 'Ovulation Calculator',
    description: 'Estimate your ovulation day and fertile window based on cycle length.',
    category: 'Date',
    icon: '🌸',
    inputs: [
      { name: 'lastPeriod', label: 'First day of last period', type: 'date', default: '2026-08-01' },
      { name: 'cycle', label: 'Average cycle length', type: 'number', default: 28, min: 20, max: 45, step: 1, unit: 'days' },
    ],
    compute: calc.ovulation,
    related: ['age', 'date-diff'],
    howItWorks: 'Assumes ovulation occurs 14 days before the next period. Fertile window is the 5 days before ovulation through 1 day after. Estimate only — actual cycles vary.',
    disclaimer: 'Estimate only. Not a contraceptive tool. For conception planning, use a basal body temperature or ovulation test kit.',
  },

  // --------------------------------------------------------------------------
  // Math / utility
  // --------------------------------------------------------------------------
  {
    slug: 'percentage',
    title: 'Percentage Calculator',
    description: 'Calculate percentages, percentage changes, and "X is what % of Y" in one tool.',
    category: 'Math',
    icon: '💯',
    popular: true,
    inputs: [
      { name: 'mode', label: 'Mode', type: 'select', default: 'pct-of', options: [
        { value: 'pct-of', label: 'X% of Y' },
        { value: 'is-what-pct', label: 'X is what % of Y' },
        { value: 'change', label: 'X is what % of Y (change)' },
      ] },
      { name: 'x', label: 'X', type: 'number', default: 20 },
      { name: 'y', label: 'Y', type: 'number', default: 150 },
    ],
    compute: calc.percentage,
    related: ['percentage-change', 'average'],
    howItWorks: 'Three modes: (1) X% of Y = X/100 × Y, (2) X is what % of Y = X/Y × 100, (3) X is what % of Y as a change = (X−Y)/Y × 100.',
  },
  {
    slug: 'percentage-change',
    title: 'Percent Change Calculator',
    description: 'Calculate the percentage change between two values.',
    category: 'Math',
    icon: '↗️',
    inputs: [
      { name: 'from', label: 'From', type: 'number', default: 100 },
      { name: 'to', label: 'To', type: 'number', default: 125 },
    ],
    compute: calc.percentageChange,
    related: ['percentage', 'average'],
    howItWorks: 'Change = (to − from) / from × 100. Positive means growth; negative means decline.',
  },
  {
    slug: 'tip',
    title: 'Tip Calculator',
    description: 'Calculate tip and split the bill across multiple people.',
    category: 'Math',
    icon: '🧾',
    inputs: [
      { name: 'bill', label: 'Bill amount', type: 'currency', default: 50, min: 0, step: 0.01, unit: '$' },
      { name: 'percent', label: 'Tip %', type: 'percent', default: 18, min: 0, max: 100, step: 0.5, unit: '%' },
      { name: 'people', label: 'Number of people', type: 'number', default: 2, min: 1, max: 50, step: 1, unit: 'people' },
    ],
    compute: calc.tip,
    related: ['percentage', 'average'],
    howItWorks: 'Tip = bill × tip%. Total = bill + tip. Per-person = total / people.',
  },
  {
    slug: 'average',
    title: 'Average Calculator (Mean / Median / Mode)',
    description: 'Calculate the mean, median, mode, min, and max of a list of numbers.',
    category: 'Math',
    icon: '➗',
    inputs: [
      { name: 'numbers', label: 'Numbers (comma- or space-separated)', type: 'textarea', default: '1, 2, 3, 4, 5', placeholder: 'e.g. 12, 15, 18, 22' },
    ],
    compute: calc.average,
    related: ['percentage', 'gpa'],
    howItWorks: 'Mean = sum / count. Median = middle value (or mean of two middle values). Mode = most frequent value. Min/max = extremes.',
  },
  {
    slug: 'gpa',
    title: 'GPA Calculator',
    description: 'Calculate your GPA on a 4.0 scale. Comma-separated grades and credits.',
    category: 'Math',
    icon: '🎓',
    inputs: [
      { name: 'grades', label: 'Grades (comma-separated)', type: 'text', default: 'A, B+, A-, B, A', placeholder: 'A, B+, A-, B, A' },
      { name: 'credits', label: 'Credits (comma-separated, same count)', type: 'text', default: '3, 4, 3, 3, 4', placeholder: '3, 4, 3, 3, 4' },
    ],
    compute: calc.gpa,
    related: ['average', 'percentage'],
    howItWorks: 'Standard 4.0 scale: A+ = 4.0, A = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, B- = 2.7, C+ = 2.3, C = 2.0, C- = 1.7, D+ = 1.3, D = 1.0, F = 0. Weighted by credit hours.',
  },
  {
    slug: 'word-counter',
    title: 'Word Counter',
    description: 'Count words, characters, sentences, and paragraphs in any text.',
    category: 'Math',
    icon: '🔤',
    inputs: [
      { name: 'text', label: 'Text to count', type: 'textarea', default: 'Type or paste your text here...', placeholder: '' },
    ],
    compute: calc.wordCounter,
    related: ['average'],
    howItWorks: 'Words = whitespace-split count. Sentences = matches of `.`, `!`, or `?`. Paragraphs = blocks separated by blank lines.',
  },
];

// ============================================================================
// Registry helpers
// ============================================================================

const bySlug: Map<string, Calculator> = new Map(calculators.map((c) => [c.slug, c]));

export function getCalculator(slug: string): Calculator | undefined {
  return bySlug.get(slug);
}

export function getAllSlugs(): string[] {
  return calculators.map((c) => c.slug);
}

export function getByCategory(): Record<Category, Calculator[]> {
  const result: Record<Category, Calculator[]> = {
    Finance: [], Fitness: [], Date: [], Math: [], Other: [],
  };
  for (const c of calculators) result[c.category].push(c);
  return result;
}

export function getRelated(slug: string): Calculator[] {
  const c = bySlug.get(slug);
  if (!c) return [];
  return c.related.map((s) => bySlug.get(s)).filter((x): x is Calculator => Boolean(x));
}

export function getPopular(): Calculator[] {
  return calculators.filter((c) => c.popular);
}
