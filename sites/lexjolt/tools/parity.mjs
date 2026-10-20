#!/usr/bin/env node
/**
 * The port gate: does the TypeScript engine reproduce the Python engine on every golden vector?
 *
 * It grades BOTH halves of each vector -- the coerced inputs and the result -- because a port can
 * produce the right number for the wrong reason (coercing 6.5 as 65, then dividing by ten somewhere
 * else), and that kind of bug only shows up on the inputs the UI actually sends.
 *
 *   node tools/parity.mjs              # every vector
 *   node tools/parity.mjs tax          # only calculators whose module is tax
 *   node tools/parity.mjs --missing    # which catalogue entries have no implementation
 *
 * Exit 1 on any mismatch: this is a gate, not a report.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { coerce, clean } from '../src/lib/cre/coerce.ts';
import { metrics } from '../src/lib/cre/metrics.ts';
import { mortgage } from '../src/lib/cre/mortgage.ts';
import { commercial } from '../src/lib/cre/commercial.ts';
import { tax } from '../src/lib/cre/tax.ts';
import { market } from '../src/lib/cre/market.ts';
import { misc } from '../src/lib/cre/misc.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const data = (f) => JSON.parse(readFileSync(join(HERE, '..', 'src', 'data', f), 'utf8'));

const catalog = data('calc-catalog.json');
const golden = data('calc-golden.json');

const MODULES = { metrics, mortgage, commercial, tax, market, misc };
const FNS = Object.assign({}, ...Object.values(MODULES));
const SPEC = Object.fromEntries(catalog.calculators.map((c) => [c.name, c]));
const MODULE_OF = (name) => {
  for (const [mod, fns] of Object.entries(MODULES)) if (fns[name]) return mod;
  return null;
};

const args = process.argv.slice(2);
const filter = args.find((a) => !a.startsWith('--')) ?? '';
const TOL = 1e-9;

function close(a, b, path = '') {
  if (a === null || b === null) return a === b;
  if (typeof a === 'number' && typeof b === 'number') {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    if (Math.abs(a - b) <= TOL * scale) return true;
    return `${path}: python ${a} vs ts ${b}`;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return `${path}: shape ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
    }
    for (let i = 0; i < a.length; i++) {
      const r = close(a[i], b[i], `${path}[${i}]`);
      if (r !== true) return r;
    }
    return true;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.join() !== kb.join()) return `${path}: keys ${ka.join()} vs ${kb.join()}`;
    for (const k of ka) {
      const r = close(a[k], b[k], `${path}.${k}`);
      if (r !== true) return r;
    }
    return true;
  }
  return a === b ? true : `${path}: python ${JSON.stringify(a)} vs ts ${JSON.stringify(b)}`;
}

if (args.includes('--missing')) {
  const missing = catalog.calculators.filter((c) => !FNS[c.name]).map((c) => c.name);
  console.log(`ported: ${catalog.calculators.length - missing.length}/${catalog.calculators.length}`);
  if (missing.length) console.log('missing:\n  ' + missing.join('\n  '));
  process.exit(missing.length ? 1 : 0);
}

let pass = 0;
const failures = [];
const byCalc = new Map();

for (const v of golden.vectors) {
  if (filter) {
    const mod = MODULE_OF(v.name);
    if (!(v.name.includes(filter) || (mod && mod === filter))) continue;
  }
  const spec = SPEC[v.name];
  const fn = FNS[v.name];
  const row = byCalc.get(v.name) ?? { pass: 0, fail: 0 };
  byCalc.set(v.name, row);

  if (!fn) {
    failures.push(`${v.name}: not implemented (module ${MODULE_OF(v.name) ?? 'unknown'})`);
    row.fail++;
    continue;
  }
  let inputs;
  try {
    inputs = coerce(spec, v.values);
  } catch (err) {
    failures.push(`${v.name}: coercion threw ${err.message}`);
    row.fail++;
    continue;
  }
  const inCheck = close(v.inputs, inputs, `${v.name}.inputs`);
  if (inCheck !== true) {
    failures.push(inCheck);
    row.fail++;
    continue;
  }
  let result;
  try {
    result = clean(fn(inputs));
  } catch (err) {
    failures.push(`${v.name}: threw ${err.message} (python returned ${JSON.stringify(v.result)})`);
    row.fail++;
    continue;
  }
  const outCheck = close(v.result, result, `${v.name}.result`);
  if (outCheck !== true) {
    failures.push(outCheck);
    row.fail++;
    continue;
  }
  pass++;
  row.pass++;
}

const total = [...byCalc.values()].reduce((n, r) => n + r.pass + r.fail, 0);
const ported = Object.keys(FNS).length;
console.log(`catalogue ${catalog.calculators.length} | implemented ${ported} | vectors ${total}`);
console.log(`pass ${pass} | fail ${total - pass}`);
if (failures.length) {
  console.log('\nfailures:');
  for (const f of failures.slice(0, 40)) console.log('  ' + f);
  if (failures.length > 40) console.log(`  ... ${failures.length - 40} more`);
}
process.exit(failures.length ? 1 : 0);
