import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

const brandPath = join(root, 'src/config/brand.ts');
assert.equal(existsSync(brandPath), true, 'brand config should exist');
const brandSource = read('src/config/brand.ts');
assert.match(brandSource, /name:\s*'LexJolt'/);
assert.match(brandSource, /origin:\s*'https:\/\/lexjolt\.com'/);
assert.match(brandSource, /email:\s*'hello@lexjolt\.com'/);

const requiredPages = [
  'index',
  'word-unscrambler',
  'word-finder',
  'anagram-rush',
  'daily',
  'faq',
  'about',
  'contact',
  'privacy',
  'terms',
  'accessibility',
  'rush',
];
for (const page of requiredPages) {
  assert.equal(existsSync(join(root, `src/pages/${page}.astro`)), true, `missing route ${page}`);
}

for (const asset of [
  'public/favicon.svg',
  'public/logo.svg',
  'public/og.svg',
  'public/manifest.webmanifest',
  'public/apple-touch-icon.svg',
]) {
  assert.equal(existsSync(join(root, asset)), true, `missing asset ${asset}`);
}

const { normalizeLetters, solve, buildIndex, scrabbleScore, filterResults, dailyJoltPuzzleForDate } = await import(
  pathToFileURL(join(root, 'src/lib/generator.ts')).href
);
assert.equal(normalizeLetters('a e-t_p,r,s!!!'), 'AETPRS');
assert.equal(scrabbleScore('PASTER'), 8);
const index = buildIndex(['PASTER', 'PEARS', 'SPEAR', 'PETS', 'TAP', 'PASTE', 'TEARS']);
const solved = solve('AETPRS', index);
assert.ok(solved.includes('PASTER'), 'AETPRS should produce PASTER');
assert.deepEqual(filterResults(solved, { minLength: 6, maxLength: 6, mustContain: '', exact: false, sort: 'alpha' }), ['PASTER']);
assert.deepEqual(filterResults(solved, { minLength: 2, maxLength: 15, mustContain: '', exact: true, letters: 'AETPRS', sort: 'alpha' }), ['PASTER']);
assert.equal(dailyJoltPuzzleForDate(new Date('2026-08-20T23:59:59Z')).key, dailyJoltPuzzleForDate(new Date('2026-08-20T00:00:01Z')).key);

const lexiconContract = readJson('src/test-vectors/lexicon-contract.json');
const bundledWords = new Set(readJson('src/data/words.json'));
for (const word of lexiconContract.accepted) {
  assert.equal(bundledWords.has(word), true, `${word} should be accepted by the production dictionary`);
}
for (const word of lexiconContract.rejected) {
  assert.equal(bundledWords.has(word), false, `${word} should be rejected by the production dictionary`);
}

const manifest = readJson('src/data/lexicon-manifest.json');
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.wordCount, bundledWords.size);
assert.match(manifest.dictionaryHash, /^[a-f0-9]{64}$/);
assert.equal(manifest.sources.openEnglishWordNet.version, '2025');

const swoopDetails = readJson('public/word-details/sw.json').SWOOP;
assert.ok(swoopDetails, 'SWOOP should have bundled local details');
assert.match(swoopDetails.phonetic, /swu/i);
assert.ok(swoopDetails.meanings.some((meaning) => ['noun', 'verb'].includes(meaning.partOfSpeech)));
assert.ok(swoopDetails.meanings.some((meaning) => meaning.definitions.some((item) => /move/i.test(item.definition))));

const productionIndex = new Map(Object.entries(readJson('public/anagram-index.json')));
assert.ok(solve('SWOOP', productionIndex).includes('SWOOP'));
assert.equal(solve('OO', productionIndex).includes('OO'), false);
for (const puzzle of (await import(pathToFileURL(join(root, 'src/lib/generator.ts')).href)).DAILY_JOLT_PUZZLES) {
  assert.ok(solve(puzzle.letters, productionIndex).length >= 3, `${puzzle.key} should retain at least three answers`);
}

const vercel = JSON.parse(read('vercel.json'));
assert.ok((vercel.redirects || []).some((redirect) => redirect.source === '/rush' && redirect.destination === '/anagram-rush'));
assert.ok((vercel.redirects || []).some((redirect) => redirect.source === '/:path*' && String(redirect.has?.[0]?.value || '').includes('www.lexjolt.com')));
assert.ok((vercel.redirects || []).some((redirect) => redirect.source === '/:path*' && String(redirect.has?.[0]?.value || '').includes('lexjolt.studio')));

const scannedFiles = [
  'vercel.json',
  'public/robots.txt',
  'src/config/brand.ts',
  'src/lib/generator.ts',
  ...requiredPages.map((page) => `src/pages/${page}.astro`),
  'src/components/Generator.astro',
  'src/components/WordFinder.astro',
  'src/components/AnagramRush.astro',
  'src/components/DailyJolt.astro',
  'src/layouts/LexJoltLayout.astro',
  'apple/LexJoltApp/Package.swift',
  'apple/LexJoltiOS/project.yml',
  'apple/LexJoltiOS/Sources/LexJoltiOSApp.swift',
].filter((path) => existsSync(join(root, path)));

const banned = [
  /WordBridge/,
  /wordunscrambler\.example\.com/,
  /hello@wordunscrambler\.example\.com/,
  /com\.boringsites\.wordbridge/,
  /violet/i,
  /purple/i,
];
for (const file of scannedFiles) {
  const source = read(file);
  for (const pattern of banned) {
    assert.doesNotMatch(source, pattern, `${file} contains banned legacy pattern ${pattern}`);
  }
}

const customerVisibleFiles = scannedFiles.filter((file) => !file.startsWith('apple/'));
for (const file of customerVisibleFiles) {
  assert.doesNotMatch(read(file), /localStorage\.setItem\(['"]boring-sites:/, `${file} writes old localStorage namespace`);
}
for (const file of requiredPages.map((page) => `src/pages/${page}.astro`)) {
  assert.doesNotMatch(read(file), /boring-sites/, `${file} contains customer-facing legacy portfolio text`);
}

console.log('LexJolt contract tests passed');
