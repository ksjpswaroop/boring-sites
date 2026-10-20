#!/usr/bin/env node
/**
 * Browser smoke test over raw CDP -- a real Chromium, a real page, real input events.
 *
 * Why not a DOM library: the calculator's whole claim is that typing in an input changes the number
 * on screen. A jsdom test would assert that the handler exists; this asserts that the number moved.
 * Why not Playwright: no dependency to install, and Node 26 ships a global WebSocket, so CDP is
 * thirty lines away.
 *
 *   node tools/smoke_browser.mjs                      # against http://localhost:3000
 *   node tools/smoke_browser.mjs http://localhost:4321
 *
 * Exit 1 on any failed assertion.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=/tmp/lexjolt-smoke-profile',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} };
process.on('exit', cleanup);

async function targets() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

const ws = new WebSocket(await targets());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) =>
  new Promise((res) => { const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params })); });

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
}

await send('Page.enable');
await send('Runtime.enable');

async function goto(path) {
  await send('Page.navigate', { url: BASE + path });
  for (let i = 0; i < 80; i++) {
    const ready = await evaluate('document.readyState === "complete"').catch(() => false);
    if (ready) break;
    await sleep(100);
  }
  await sleep(350); // let the module script hydrate
}

const fails = [];
const check = (name, ok, detail) => {
  if (!ok) fails.push(`${name}: ${detail}`);
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : ' — ' + detail}`);
};

// ---------------------------------------------------------------- calculator
await goto('/calculators/cap-rate');
const before = await evaluate(`document.querySelector('[data-result]').textContent.trim()`);
const after = await evaluate(`(() => {
  const el = document.querySelector('input[name=noi_value]');
  el.value = '80000';
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return document.querySelector('[data-result]').textContent.trim();
})()`);
check('cap-rate recomputes on input', before !== after && after.length > 0, `${before} -> ${after}`);
check('cap-rate answer is 16.0%', after === '16.0%', `saw ${after}`);
const qs = await evaluate('location.search');
check('inputs are mirrored into the URL', qs.includes('noi_value=80000'), `search=${qs}`);

// -------------------------------------------------------- breakdown result
await goto('/calculators/capital-gains-tax');
const tax = await evaluate(`(() => {
  const big = document.querySelector('[data-result]').textContent.trim();
  const sub = document.querySelector('.lj-result-sub')?.textContent.trim();
  const rows = [...document.querySelectorAll('[data-result] ~ dl div dt')].length;
  return { big, sub, rows };
})()`);
check('breakdown result headlines the total', tax.sub === 'Total tax' && tax.big.startsWith('$'), JSON.stringify(tax));
check('breakdown lists the other values', tax.rows >= 3, `rows=${tax.rows}`);

// ------------------------------------------------------------------ niches
await goto('/niches');
const s0 = await evaluate(`document.querySelector('#scorer-result .lj-result-value').textContent.trim()`);
const s1 = await evaluate(`(() => {
  const el = document.querySelector('input[name=median_views]');
  el.value = '90000';
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return document.querySelector('#scorer-result .lj-result-value').textContent.trim();
})()`);
check('niche scorer responds to inputs', s0 !== s1, `${s0} -> ${s1}`);
check('niche scorer prints a score /10', /^\d+\.\d+ \/ 10$/.test(s1), `saw ${s1}`);
const dims = await evaluate(`document.querySelectorAll('#scorer-dims > div').length`);
check('niche scorer shows all six dimensions', dims === 6, `dims=${dims}`);

// ------------------------------------------------------------------- ideas
await goto('/ideas');
const total = await evaluate(`document.querySelectorAll('[data-idea]').length`);
const shownAfterFilter = await evaluate(`(() => {
  const sel = document.querySelector('#idea-niche');
  sel.value = sel.options[1].value;
  sel.dispatchEvent(new Event('input', { bubbles: true }));
  return [...document.querySelectorAll('[data-idea]')].filter((e) => !e.hidden).length;
})()`);
const label = await evaluate(`document.getElementById('idea-count').textContent.trim()`);
check('ideas filter narrows the list', shownAfterFilter > 0 && shownAfterFilter < total, `${total} -> ${shownAfterFilter}`);
check('ideas count label agrees', label.startsWith(String(shownAfterFilter)), `label=${label}`);

// ------------------------------------------------------------------ videos
await goto('/videos');
const vids = await evaluate(`document.querySelectorAll('video').length`);
const playable = await evaluate(`(() => {
  const v = document.querySelector('video');
  return { src: v.currentSrc || v.getAttribute('src'), ready: v.readyState };
})()`);
check('video gallery lists a video per calculator', vids === 72, `count=${vids}`);
check('first video has a real source', !!playable.src && playable.src.includes('.mp4'), JSON.stringify(playable));

// ------------------------------------------------------------------ sitemap
const pages = ['/', '/calculators', '/niches', '/ideas', '/videos', '/about', '/privacy', '/terms', '/contact'];
for (const p of pages) {
  await goto(p);
  const t = await evaluate('document.title');
  check(`page ${p} renders a title`, !!t && t.length > 4, `title=${JSON.stringify(t)}`);
}

ws.close();
cleanup();
console.log('');
if (fails.length) {
  console.log(`FAIL — ${fails.length} problem${fails.length === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('PASS — the browser agrees with the engine.');
