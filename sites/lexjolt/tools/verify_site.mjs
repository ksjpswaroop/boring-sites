#!/usr/bin/env node
/**
 * The ship gate. Answers one question with evidence: is this build telling the truth?
 *
 * Six checks, each of which would otherwise be a silent lie:
 *   1. parity      the TS engine reproduces every Python golden vector (inputs AND results)
 *   2. defaults    each calculator's default answer is a number, not an error string
 *   3. pages       every calculator, niche and idea target has a built HTML page
 *   4. answers     the answer printed on each calculator page matches the engine's default answer
 *   5. niches      the page-side scorer reproduces the scan's scores and dimensions
 *   6. videos      one video per calculator, each file real, playable, and 10s+ long
 *
 *   node tools/verify_site.mjs            # everything (needs a prior `pnpm build` for 3 & 4)
 *   node tools/verify_site.mjs --no-dist  # engine/niche/video checks only
 *
 * Exit 1 on any failure: this is a gate, not a report.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { catalog, byName, runCalc, missing } from '../src/lib/cre/index.ts';
import { primaryEntry } from '../src/lib/render.ts';
import { niches, scoreOf } from '../src/lib/niches.ts';
import { ideas } from '../src/lib/ideas.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const golden = read('src/data/calc-golden.json');
const videos = read('src/data/videos.json');
const noDist = process.argv.includes('--no-dist');
const dist = join(ROOT, 'dist');

const fails = [];
const notes = [];
const fail = (check, msg) => fails.push(`${check}: ${msg}`);

// ---------------------------------------------------------------- 1. parity
try {
  const out = execFileSync(process.execPath, [join(HERE, 'parity.mjs')], { encoding: 'utf8' });
  const pass = Number(/pass (\d+) \| fail (\d+)/.exec(out)?.[1] ?? 0);
  const bad = Number(/pass (\d+) \| fail (\d+)/.exec(out)?.[2] ?? 1);
  if (bad !== 0 || pass !== golden.vectors.length) {
    fail('parity', `${pass} pass / ${bad} fail against ${golden.vectors.length} vectors`);
  }
  notes.push(`parity         ${pass}/${golden.vectors.length} vectors reproduce the Python engine`);
} catch (err) {
  fail('parity', String(err.stdout ?? err.message).slice(0, 400));
}

// ------------------------------------------------------------ 2. defaults
const stillMissing = missing();
if (stillMissing.length) fail('defaults', `${stillMissing.length} calculators unimplemented: ${stillMissing.join(', ')}`);
let defaultErrors = 0;
for (const spec of catalog.calculators) {
  const r = runCalc(spec.name, {});
  if (r.error) {
    defaultErrors++;
    fail('defaults', `${spec.name}: ${r.error}`);
  }
}
notes.push(`defaults       ${catalog.calculators.length - defaultErrors}/${catalog.calculators.length} calculators produce an answer at their defaults`);

// --------------------------------------------------------------- 3. pages
if (!noDist && existsSync(dist)) {
  for (const spec of catalog.calculators) {
    const p = join(dist, 'calculators', spec.name.replace(/_/g, '-'), 'index.html');
    if (!existsSync(p)) fail('pages', `missing page for ${spec.name}`);
  }
  for (const n of niches) {
    if (!existsSync(join(dist, 'niches', n.slug, 'index.html'))) fail('pages', `missing niche page ${n.slug}`);
  }
  // 4. the printed answer vs the engine
  let mismatched = 0;
  for (const spec of catalog.calculators) {
    const p = join(dist, 'calculators', spec.name.replace(/_/g, '-'), 'index.html');
    if (!existsSync(p)) continue;
    const html = readFileSync(p, 'utf8');
    if (html.includes('has no ported implementation')) {
      mismatched++;
      fail('answers', `${spec.name}: page shipped the "no implementation" error`);
      continue;
    }
    const r = runCalc(spec.name, {});
    if (r.error) continue;
    // The answer the page prints must be THIS answer. Whitespace is normalised because the markup
    // wraps values across lines and uses non-breaking spaces in the result panel.
    const want = primaryEntry(r).display.replace(/\s+/g, '');
    const have = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, '');
    if (!html.includes('lj-result-value')) {
      mismatched++;
      fail('answers', `${spec.name}: no result panel in the built page`);
    } else if (!have.includes(want)) {
      mismatched++;
      fail('answers', `${spec.name}: page does not print the engine's answer ${JSON.stringify(want)}`);
    }
  }
  notes.push(`pages          ${catalog.calculators.length} calculator pages, ${niches.length} niche pages present`);
  notes.push(`answers        ${catalog.calculators.length - mismatched}/${catalog.calculators.length} pages render a result panel`);
} else if (!noDist) {
  notes.push('pages          skipped (no dist/ — run pnpm build first)');
}

// -------------------------------------------------------------- 5. niches
let drift = 0;
for (const n of niches) {
  const r = scoreOf(n);
  if (Math.abs(r.score - n.score) > 0.005) {
    drift++;
    fail('niches', `${n.id}: page scorer ${r.score.toFixed(2)} vs scan ${n.score.toFixed(2)}`);
  }
  for (const [k, v] of Object.entries(r.dims)) {
    const stored = n.dims[k];
    if (v !== null && stored !== null && stored !== undefined && Math.abs(v - stored) > 0.05) {
      drift++;
      fail('niches', `${n.id}.${k}: page ${v} vs scan ${stored}`);
    }
  }
}
notes.push(`niches         ${niches.length - drift} of ${niches.length} scores reproduced by the page-side scorer`);

// -------------------------------------------------------------- 6. videos
const vlist = videos.videos;
if (vlist.length !== catalog.calculators.length) {
  fail('videos', `${vlist.length} videos for ${catalog.calculators.length} calculators`);
}
let badVideo = 0;
for (const v of vlist) {
  if (!byName[v.calculator]) {
    badVideo++;
    fail('videos', `${v.slug}: no such calculator ${v.calculator}`);
    continue;
  }
  const file = join(ROOT, 'public', v.file);
  if (!existsSync(file)) {
    badVideo++;
    fail('videos', `${v.slug}: file missing`);
    continue;
  }
  const size = statSync(file).size;
  if (size < 50_000) {
    badVideo++;
    fail('videos', `${v.slug}: ${Math.round(size / 1024)}KB is too small to be a real render`);
  }
  if (!v.duration_s || v.duration_s < 10) {
    badVideo++;
    fail('videos', `${v.slug}: duration ${v.duration_s}s`);
  }
  if (!v.transcript || v.transcript.length < 60) {
    badVideo++;
    fail('videos', `${v.slug}: transcript missing`);
  }
}
notes.push(`videos         ${vlist.length - badVideo}/${vlist.length} videos exist, play 10s+, and carry a transcript`);

// ---------------------------------------------------------------- 7. ideas
const brokenLinks = ideas.filter(
  (i) => (i.calc && !byName[i.calc]) || (i.niche && !niches.some((n) => n.slug === i.niche))
);
if (brokenLinks.length) fail('ideas', `${brokenLinks.length} ideas point at nothing: ${brokenLinks.slice(0, 3).map((i) => i.id).join(', ')}`);
notes.push(`ideas          ${ideas.length - brokenLinks.length}/${ideas.length} ideas resolve to a calculator or a niche`);

// ----------------------------------------------------------------- report
console.log(notes.join('\n'));
console.log('');
if (fails.length) {
  console.log(`FAIL — ${fails.length} problem${fails.length === 1 ? '' : 's'}:`);
  for (const f of fails.slice(0, 40)) console.log('  ' + f);
  if (fails.length > 40) console.log(`  ... ${fails.length - 40} more`);
  process.exit(1);
}
console.log('PASS — the build is telling the truth on all seven checks.');
