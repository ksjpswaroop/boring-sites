/**
 * The result panel markup, shared by the server render and the client re-compute.
 *
 * One function, two callers: the page ships the default-answer HTML (so the number is in the DOM
 * for a reader and for a crawler) and the same function rebuilds it when an input changes. Two
 * implementations would eventually disagree, and the disagreement would be invisible until someone
 * compared a screenshot with the default page.
 *
 * Breakdown results are the hard case. A capital-gains answer is {tax_section_1245: 0, total_tax:
 * 36000, ...} and the FIRST key is zero: printing it as "the answer" is technically true and
 * completely misleading. So the headline is chosen by name (total first, then the result label,
 * then the calculator's own name), and every key keeps its own unit -- dollars next to basis points
 * next to months, each formatted as what it is.
 */
import type { RunResult } from './cre/index.ts';
import { formatValue, label } from './format.ts';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TOK_BPS = /(^|_)bps(_|$)/;
const TOK_MONTHS = /(^|_)months?(_|$)/;
const TOK_PERCENT = /(^|_)(rate|pct|percent|share|spread|yield|ratio|treasury|cap)(_|$)/;
const TOK_MONEY =
  /(^|_)(amount|price|value|income|rent|tax|payment|cost|gain|noi|basis|saved|interest|depreciation|equity|cash|proceeds|balance|due|revenue|expense|opex)(_|$)/;

/** The unit of one breakdown key. Whole tokens only: "tax_unrecaptured_1250" must not read as a rate. */
export function kindOfKey(key: string, value: unknown, resultFormat: string): string {
  if (TOK_BPS.test(key)) return 'bps';
  if (TOK_MONTHS.test(key)) return 'months';
  if (TOK_PERCENT.test(key)) return 'percent';
  if (TOK_MONEY.test(key)) return 'money';
  if (resultFormat === 'percent' && typeof value === 'number' && Math.abs(value) <= 1) return 'percent';
  return 'number';
}

/** Which value in a breakdown is THE answer, by name rather than by insertion order. */
export function primaryKey(d: Record<string, unknown>, name: string, resultLabel: string): string {
  const numeric = Object.entries(d)
    .filter(([, v]) => typeof v === 'number')
    .map(([k]) => k);
  const total = numeric.find((k) => k.startsWith('total'));
  if (total) return total;
  const lab = resultLabel.toLowerCase();
  const byLabel = numeric.find((k) => lab.includes(k.replace(/_/g, ' ')) || lab.includes(k));
  if (byLabel) return byLabel;
  const byName = numeric.find((k) => name.includes(k));
  if (byName) return byName;
  return numeric[0] ?? Object.keys(d)[0] ?? '';
}

export interface PrimaryEntry {
  key: string | null;
  value: unknown;
  kind: string;
  display: string;
}

/** The headline number, its unit, and its printed form -- the one function the page and the gate share. */
export function primaryEntry(r: RunResult): PrimaryEntry {
  const res = r.result;
  const isObj = res !== null && typeof res === 'object' && !Array.isArray(res);
  if (!isObj) {
    const kind = r.result_format === 'object' ? 'number' : r.result_format;
    return { key: null, value: res, kind, display: formatValue(res, kind as never) };
  }
  const d = res as Record<string, unknown>;
  const k = primaryKey(d, r.name, r.result_label);
  const kind = kindOfKey(k, d[k], r.result_format);
  return { key: k, value: d[k], kind, display: formatValue(d[k], kind as never) };
}

export function resultHtml(r: RunResult): string {
  const labelText = esc(r.result_label);
  if (r.error) {
    return `<div class="lj-result-label">${labelText}</div>
      <p class="lj-result-error">${esc(r.error)}</p>
      <p class="lj-note" style="margin-top:10px">Change an input to see the number. Nothing here is stored.</p>`;
  }

  const p = primaryEntry(r);
  const big = p.display;
  const small = big.length > 13;
  const isObj = p.key !== null;

  let extra = '';
  if (isObj) {
    const d = r.result as Record<string, unknown>;
    const rows = Object.entries(d)
      .filter(([k]) => k !== p.key)
      .map(([k, v]) => {
        const kind = kindOfKey(k, v, r.result_format);
        return `<div><dt>${esc(label(k))}</dt><dd>${esc(formatValue(v, kind as never))}</dd></div>`;
      })
      .join('');
    if (rows) extra = `<dl>${rows}</dl>`;
  }

  return `<div class="lj-result-label">${labelText}</div>
    <div class="lj-result-value${small ? ' is-small' : ''}" data-result>${esc(big)}</div>
    ${isObj ? `<p class="lj-result-sub">${esc(label(p.key as string))}</p>` : ''}
    ${extra}
    <p class="lj-note" style="margin-top:12px">Computed in your browser from the inputs above. Nothing is stored.</p>`;
}
