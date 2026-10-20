/**
 * The coercion layer, ported line-for-line from app/api/calculators.py `_coerce`.
 *
 * It is separate from the maths on purpose: the Python engine's contract is "raw UI strings in,
 * floats out", and a port that skips this layer looks right on hand-typed numbers and wrong on
 * percent arguments — where the UI sends 6.5 and the engine expects 0.065. The golden vectors carry
 * the coerced inputs alongside the result so this layer is graded too, not just the formulas.
 */

export type ArgKind =
  | 'money' | 'number' | 'years' | 'percent' | 'int' | 'numbers' | 'pairs' | 'choice' | string;

export interface ArgSpec {
  name: string;
  label: string;
  type: ArgKind;
  default: number | string | number[] | null;
  min?: number | null;
  max?: number | null;
  step?: number | null;
  unit?: string;
  help?: string;
  keys?: [string, string];
  min_length?: number;
  choices?: string[];
}

export interface CalcSpec {
  name: string;
  label: string;
  group: string;
  description: string;
  args: ArgSpec[];
  result_label: string;
  result_format: string;
  notes: string;
}

export type Coerced = Record<string, unknown>;

/** Python's round() is half-to-even; Math.round is half-up. Months must not drift by one. */
function pyRound(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

function splitPairs(raw: unknown, keys: [string, string]): Array<Record<string, number>> {
  let pieces: unknown[] = [];
  if (typeof raw === 'string') {
    pieces = raw.replace(/\n/g, ',').split(',').filter((p) => p.trim() !== '');
  } else if (Array.isArray(raw)) {
    pieces = raw;
  }
  const out: Array<Record<string, number>> = [];
  for (const piece of pieces) {
    if (piece && typeof piece === 'object') {
      out.push(piece as Record<string, number>);
      continue;
    }
    const text = String(piece);
    if (!text.includes(':')) {
      throw new Error(`${keys.join('/')} entries look like 'key:value', got ${JSON.stringify(piece)}`);
    }
    const [key, value] = [text.slice(0, text.indexOf(':')), text.slice(text.indexOf(':') + 1)];
    const k = Number(key.trim());
    const v = Number(value.trim());
    if (!Number.isFinite(k) || !Number.isFinite(v) || key.trim() === '' || value.trim() === '') {
      throw new Error(`${keys.join('/')} entry ${JSON.stringify(piece)} is not two numbers separated by a colon`);
    }
    out.push({ [keys[0]]: k, [keys[1]]: v });
  }
  return out;
}

export function coerce(spec: CalcSpec, values: Record<string, unknown> = {}): Coerced {
  const out: Coerced = {};
  for (const arg of spec.args) {
    const name = arg.name;
    let raw: unknown = values[name] === undefined ? arg.default : values[name];
    const kind = arg.type;

    if (kind === 'money' || kind === 'number' || kind === 'years' || kind === 'percent' || kind === 'int') {
      if (raw === null || raw === undefined || raw === '') raw = arg.default;
      let value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new Error(`${name} must be a number, got ${JSON.stringify(raw)}`);
      }
      if (kind === 'int') value = pyRound(value);
      if (arg.min !== null && arg.min !== undefined && value < arg.min) {
        throw new Error(`${name} must be at least ${arg.min}`);
      }
      if (arg.max !== null && arg.max !== undefined && value > arg.max) {
        throw new Error(`${name} must be at most ${arg.max}`);
      }
      out[name] = value;
    } else if (kind === 'numbers') {
      let list: unknown[] = [];
      if (typeof raw === 'string') {
        list = raw.replace(/\n/g, ',').split(',').filter((p) => p.trim() !== '');
      } else if (Array.isArray(raw)) {
        list = raw;
      }
      const nums = list.map((p) => Number(p));
      if (nums.some((n) => !Number.isFinite(n))) {
        throw new Error(`${name} must be a list of numbers, got ${JSON.stringify(raw)}`);
      }
      out[name] = nums;
      if (arg.min_length && nums.length < arg.min_length) {
        throw new Error(`${name} needs at least ${arg.min_length} numbers`);
      }
    } else if (kind === 'pairs') {
      out[name] = splitPairs(raw, (arg.keys ?? ['key', 'value']) as [string, string]);
    } else if (kind === 'choice') {
      const allowed = arg.choices ?? [];
      if (!allowed.includes(String(raw))) {
        throw new Error(`${name} must be one of ${allowed.join(', ')}, got ${JSON.stringify(raw)}`);
      }
      out[name] = raw;
    } else {
      out[name] = raw;
    }
  }
  return out;
}

/** NaN and ±Infinity become null, as in the Python `_clean`. JSON cannot carry them. */
export function clean(value: unknown): unknown {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = clean(v);
    return out;
  }
  return value;
}
