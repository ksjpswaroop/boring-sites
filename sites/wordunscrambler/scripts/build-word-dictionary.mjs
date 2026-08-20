import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SOURCE_URL = 'https://raw.githubusercontent.com/wordnik/wordlist/main/wordlist-20210729.txt';
const MIN_LENGTH = 2;
const MAX_LENGTH = 15;

const outputFiles = [
  'src/data/words.json',
  'public/anagram-index.json',
  'apple/WordGameCore/Sources/WordGameCore/Resources/words.json',
  'apple/WordGameCore/Sources/WordGameCore/Resources/anagram-index.json',
];

const root = resolve(import.meta.dirname, '..');

function normalizeSourceWord(line) {
  return line.trim().replace(/^"|"$/g, '').toUpperCase();
}

function signature(word) {
  return word.split('').sort().join('');
}

async function readSourceWords() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Wordnik word list: ${response.status} ${response.statusText}`);
  }

  const sourceText = await response.text();
  return [...new Set(
    sourceText
      .split(/\r?\n/)
      .map(normalizeSourceWord)
      .filter((word) => new RegExp(`^[A-Z]{${MIN_LENGTH},${MAX_LENGTH}}$`).test(word))
  )].sort();
}

function buildAnagramIndex(words) {
  const index = new Map();
  for (const word of words) {
    const key = signature(word);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(word);
  }

  return Object.fromEntries([...index.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function writeJson(path, value) {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value)}\n`);
}

const words = await readSourceWords();
const anagramIndex = buildAnagramIndex(words);

await writeJson(outputFiles[0], words);
await writeJson(outputFiles[1], anagramIndex);
await writeJson(outputFiles[2], words);
await writeJson(outputFiles[3], anagramIndex);

const previousSource = await readFile(resolve(root, 'docs/word-list-source.md'), 'utf8').catch(() => '');
if (!previousSource.includes(SOURCE_URL)) {
  console.warn('Remember to document the word-list source and license.');
}

console.log(`Generated ${words.length.toLocaleString()} words and ${Object.keys(anagramIndex).length.toLocaleString()} anagram signatures.`);
