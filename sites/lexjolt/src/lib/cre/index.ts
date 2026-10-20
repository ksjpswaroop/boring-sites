/**
 * The calculator runtime: catalogue + coercion + the 71 ported functions, in one place.
 *
 * `runCalc` mirrors app/api/calculators.py `run()` exactly, including its failure shape -- an
 * `error` string and a null result rather than a thrown exception -- because the pages render that
 * message verbatim and a thrown error would blank the calculator instead of explaining it.
 *
 * The maths lives in sibling modules keyed by Python module name, so a reviewer can open
 * `tax.ts` next to `app/engine/tax.py` and read the same functions in the same order.
 */
// Import attribute, not style: the verify gate imports this module under plain Node, where a bare
// JSON import throws. Vite honours the same attribute.
import catalogJson from '../../data/calc-catalog.json' with { type: 'json' };
// Local value imports carry the .ts extension: Node's type stripping resolves them literally, and the
// verify gate imports this module under plain Node so it can grade the same code the pages ship.
import { coerce, clean } from './coerce.ts';
import type { CalcSpec } from './coerce.ts';
import { metrics } from './metrics.ts';
import { mortgage } from './mortgage.ts';
import { commercial } from './commercial.ts';
import { tax } from './tax.ts';
import { market } from './market.ts';
import { misc } from './misc.ts';

export type Fns = Record<string, (a: Record<string, any>) => unknown>;

const FNS: Fns = { ...metrics, ...mortgage, ...commercial, ...tax, ...market, ...misc };

export interface Catalog {
  groups: string[];
  calculators: CalcSpec[];
}

export const catalog = catalogJson as unknown as Catalog;

export const byName: Record<string, CalcSpec> = Object.fromEntries(
  catalog.calculators.map((c) => [c.name, c])
);

export const byGroup: Record<string, CalcSpec[]> = catalog.groups.reduce(
  (acc, g) => ({ ...acc, [g]: catalog.calculators.filter((c) => c.group === g) }),
  {} as Record<string, CalcSpec[]>
);

export interface RunResult {
  name: string;
  label: string;
  group: string;
  inputs: Record<string, unknown>;
  result: unknown;
  result_label: string;
  result_format: string;
  error?: string;
}

export function runCalc(name: string, values: Record<string, unknown> = {}): RunResult {
  const spec = byName[name];
  if (!spec) throw new Error(`unknown calculator ${JSON.stringify(name)}`);
  const fn = FNS[name];
  const base = {
    name,
    label: spec.label,
    group: spec.group,
    result_label: spec.result_label,
    result_format: spec.result_format,
  };
  let inputs: Record<string, unknown> = values;
  try {
    inputs = coerce(spec, values);
    if (!fn) throw new Error(`calculator ${name} has no ported implementation yet`);
    const raw = fn(inputs);
    return { ...base, inputs, result: clean(raw) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const divide = /division by zero|Infinity/i.test(message);
    return {
      ...base,
      inputs,
      result: null,
      error: divide
        ? 'undefined: this calculation divides by zero with these inputs'
        : message || 'the inputs are not valid for this calculation',
    };
  }
}

/** Which calculators exist in the catalog but have no implementation yet. Empty is the goal. */
export function missing(): string[] {
  return catalog.calculators.map((c) => c.name).filter((n) => !FNS[n]);
}
