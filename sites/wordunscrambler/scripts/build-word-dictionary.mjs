import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(import.meta.dirname, '..');
const cacheRoot = resolve(root, '../../../.cache/lexjolt-lexicon');
const MIN_LENGTH = 2;
const MAX_LENGTH = 15;

const sources = {
  openEnglishWordNet: {
    version: '2025',
    url: 'https://en-word.net/static/english-wordnet-2025-json.zip',
    sha256: '7d749f6e2c39e6970e4997839dcf6e42fd281f3c2fae0171d2192bae8cfa4b51',
  },
  scowl: {
    version: 'v2',
    repository: 'https://github.com/en-wl/wordlist.git',
    commit: '1e5b7d3a72f47a71da5d28686c1dd4b397178485',
    size: 60,
    spelling: 'A',
    variantLevel: '1',
  },
  cmuPronouncingDictionary: {
    commit: '74790861f652b15e4ac49015a90074ad62a27690',
    url: 'https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict',
    sha256: '81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22',
  },
};

const posNames = { n: 'noun', v: 'verb', a: 'adjective', s: 'adjective', r: 'adverb' };
const functionWordPos = new Set(['c', 'd', 'i', 'pn', 'pp']);
const scowlExcludedPos = 'abbr,pre,suf,wp,we,x';
const alphaWord = /^[a-z]{2,15}$/;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function ensureDownload({ url, sha256: expectedHash }, destination, override) {
  const sourcePath = override ? resolve(override) : destination;
  if (!override && !existsSync(destination)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to download ${url}: ${response.status}`);
    await mkdir(resolve(destination, '..'), { recursive: true });
    await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  }

  const data = await readFile(sourcePath);
  const actualHash = sha256(data);
  if (actualHash !== expectedHash) {
    throw new Error(`Checksum mismatch for ${sourcePath}: expected ${expectedHash}, received ${actualHash}`);
  }
  return sourcePath;
}

async function ensureOewnDirectory(zipPath) {
  const directory = join(cacheRoot, `oewn-${sources.openEnglishWordNet.version}-json`);
  if (!existsSync(join(directory, 'entries-a.json'))) {
    await rm(directory, { recursive: true, force: true });
    await mkdir(directory, { recursive: true });
    execFileSync('unzip', ['-q', zipPath, '-d', directory]);
  }
  return directory;
}

async function ensureScowlDirectory(override) {
  if (override) {
    const directory = resolve(override);
    await access(join(directory, 'scowl'));
    await access(join(directory, 'scowl.db'));
    return directory;
  }

  const directory = join(cacheRoot, `scowl-${sources.scowl.commit}`);
  if (!existsSync(join(directory, '.git'))) {
    await mkdir(cacheRoot, { recursive: true });
    execFileSync('git', ['clone', '--quiet', sources.scowl.repository, directory]);
    execFileSync('git', ['checkout', '--quiet', sources.scowl.commit], { cwd: directory });
  }
  const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: directory, encoding: 'utf8' }).trim();
  if (currentCommit !== sources.scowl.commit) {
    throw new Error(`SCOWL checkout mismatch: expected ${sources.scowl.commit}, received ${currentCommit}`);
  }
  if (!existsSync(join(directory, 'scowl.db'))) {
    execFileSync('make', [], { cwd: directory, stdio: 'inherit' });
  }
  return directory;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function loadOpenEnglishWordNet(directory) {
  const files = await readdir(directory);
  const entryFiles = files.filter((file) => file.startsWith('entries-') && file.endsWith('.json')).sort();
  const synsetFiles = files
    .filter((file) => file.endsWith('.json') && !file.startsWith('entries-') && file !== 'frames.json')
    .sort();
  const entries = new Map();
  const formToLemma = new Map();
  let rejectedByShape = 0;

  for (const file of entryFiles) {
    const data = await readJson(join(directory, file));
    for (const [writtenForm, posMap] of Object.entries(data)) {
      if (!alphaWord.test(writtenForm)) {
        rejectedByShape += 1;
        continue;
      }
      entries.set(writtenForm, posMap);
      for (const value of Object.values(posMap)) {
        for (const form of value.form || []) {
          if (alphaWord.test(form) && !formToLemma.has(form)) formToLemma.set(form, writtenForm);
        }
      }
    }
  }

  const synsets = new Map();
  for (const file of synsetFiles) {
    const data = await readJson(join(directory, file));
    for (const [id, synset] of Object.entries(data)) synsets.set(id, synset);
  }
  return { entries, formToLemma, synsets, rejectedByShape };
}

function loadScowl(scowlDirectory, oewnEntries) {
  const list = execFileSync(join(scowlDirectory, 'scowl'), [
    'word-list',
    String(sources.scowl.size),
    sources.scowl.spelling,
    sources.scowl.variantLevel,
    '--wo-poses',
    scowlExcludedPos,
  ], { cwd: scowlDirectory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const eligible = new Set(list.split(/\r?\n/).filter((word) => alphaWord.test(word)));

  const rows = execFileSync('sqlite3', [
    '-separator', '\t',
    join(scowlDirectory, 'scowl.db'),
    `select distinct w.word, l.word, g.base_pos
       from words w
       join words l on l.word_id = w.lemma_id
       join groups g on g.group_id = w.group_id
      where w.word = lower(w.word);`,
  ], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });

  const lemmaByWord = new Map();
  const functionWords = new Set();
  for (const line of rows.split(/\r?\n/)) {
    if (!line) continue;
    const [word, lemma, basePos] = line.split('\t');
    if (!eligible.has(word) || !alphaWord.test(word)) continue;
    if (oewnEntries.has(lemma)) {
      const current = lemmaByWord.get(word);
      if (!current || lemma === word) lemmaByWord.set(word, lemma);
    }
    if (functionWordPos.has(basePos)) functionWords.add(word);
  }
  return { lemmaByWord, functionWords };
}

const arpabetToIpa = {
  AA: 'ɑ', AE: 'æ', AH: 'ʌ', AO: 'ɔ', AW: 'aʊ', AY: 'aɪ', B: 'b', CH: 'tʃ', D: 'd', DH: 'ð',
  EH: 'ɛ', ER: 'ɝ', EY: 'eɪ', F: 'f', G: 'ɡ', HH: 'h', IH: 'ɪ', IY: 'i', JH: 'dʒ', K: 'k',
  L: 'l', M: 'm', N: 'n', NG: 'ŋ', OW: 'oʊ', OY: 'ɔɪ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't',
  TH: 'θ', UH: 'ʊ', UW: 'u', V: 'v', W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

function cmuToIpa(phonemes) {
  return phonemes.split(' ').map((phoneme) => {
    const stress = phoneme.match(/[012]$/)?.[0];
    const ipa = arpabetToIpa[phoneme.replace(/[012]$/, '')] || '';
    return `${stress === '1' ? 'ˈ' : stress === '2' ? 'ˌ' : ''}${ipa}`;
  }).join('');
}

async function loadCmuPronunciations(path) {
  const pronunciations = new Map();
  for (const line of (await readFile(path, 'utf8')).split(/\r?\n/)) {
    const match = line.match(/^([^ ]+) (.+)$/);
    if (!match) continue;
    const word = match[1].replace(/\(\d+\)$/, '');
    if (!alphaWord.test(word) || pronunciations.has(word)) continue;
    const ipa = cmuToIpa(match[2]);
    if (ipa) pronunciations.set(word, `/${ipa}/`);
  }
  return pronunciations;
}

function buildWordInfo(word, lemma, entry, synsets, cmuPronunciations) {
  if (!entry) return null;
  const meanings = [];
  for (const [pos, value] of Object.entries(entry)) {
    const partOfSpeech = posNames[pos[0]];
    if (!partOfSpeech) continue;
    const definitions = [];
    for (const sense of value.sense || []) {
      const synset = synsets.get(sense.synset);
      const definition = synset?.definition?.[0];
      if (!definition || definitions.some((item) => item.definition === definition)) continue;
      const example = sense.sent?.[0] || synset.example?.[0];
      definitions.push({ definition, ...(example ? { example } : {}) });
      if (definitions.length === 2) break;
    }
    if (definitions.length) meanings.push({ partOfSpeech, definitions });
    if (meanings.length === 2) break;
  }
  if (!meanings.length) return null;

  const entryPronunciations = Object.values(entry).flatMap((value) => value.pronunciation || []);
  const preferred = entryPronunciations.find((item) => item.variety === 'US') || entryPronunciations[0];
  const phonetic = preferred?.value
    ? `/${preferred.value}/`
    : cmuPronunciations.get(word) || cmuPronunciations.get(lemma) || '';
  return { word: word.toUpperCase(), phonetic, meanings, source: 'local' };
}

function buildAnagramIndex(words) {
  const index = new Map();
  for (const word of words) {
    const key = word.split('').sort().join('');
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(word);
  }
  return Object.fromEntries([...index.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function writeJson(relativePath, value) {
  const path = resolve(root, relativePath);
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value)}\n`);
}

async function buildSQLite(path, words, details, manifest) {
  await mkdir(resolve(path, '..'), { recursive: true });
  await rm(path, { force: true });
  const database = new DatabaseSync(path);
  database.exec(`
    pragma journal_mode = OFF;
    pragma synchronous = OFF;
    create table words (word text primary key, signature text not null);
    create index words_signature on words(signature);
    create table details (word text primary key, phonetic text not null, meanings_json text not null);
    create table metadata (key text primary key, value text not null);
  `);
  const insertWord = database.prepare('insert into words (word, signature) values (?, ?)');
  const insertDetail = database.prepare('insert into details (word, phonetic, meanings_json) values (?, ?, ?)');
  const insertMetadata = database.prepare('insert into metadata (key, value) values (?, ?)');
  database.exec('begin');
  for (const word of words) insertWord.run(word, word.split('').sort().join(''));
  for (const [word, info] of details) insertDetail.run(word, info.phonetic, JSON.stringify(info.meanings));
  insertMetadata.run('manifest', JSON.stringify(manifest));
  database.exec('commit');
  database.exec('analyze; vacuum;');
  database.close();
}

async function main() {
  await mkdir(cacheRoot, { recursive: true });
  const oewnZip = await ensureDownload(
    sources.openEnglishWordNet,
    join(cacheRoot, `oewn-${sources.openEnglishWordNet.version}.zip`),
    process.env.LEXJOLT_OEWN_ZIP,
  );
  const cmuPath = await ensureDownload(
    sources.cmuPronouncingDictionary,
    join(cacheRoot, `cmudict-${sources.cmuPronouncingDictionary.commit}.dict`),
    process.env.LEXJOLT_CMUDICT,
  );
  const [oewnDirectory, scowlDirectory] = await Promise.all([
    ensureOewnDirectory(oewnZip),
    ensureScowlDirectory(process.env.LEXJOLT_SCOWL_DIR),
  ]);

  const [{ entries, formToLemma, synsets, rejectedByShape }, cmuPronunciations] = await Promise.all([
    loadOpenEnglishWordNet(oewnDirectory),
    loadCmuPronunciations(cmuPath),
  ]);
  const { lemmaByWord, functionWords } = loadScowl(scowlDirectory, entries);
  for (const [form, lemma] of formToLemma) if (!lemmaByWord.has(form)) lemmaByWord.set(form, lemma);

  const allowlist = await readJson(resolve(root, 'src/data/lexicon-allowlist.json'));
  const denylist = new Set(await readJson(resolve(root, 'src/data/lexicon-denylist.json')));
  const accepted = new Set(entries.keys());
  for (const [word] of lemmaByWord) accepted.add(word);
  for (const word of functionWords) accepted.add(word);
  for (const word of allowlist.map((item) => item.toLowerCase()).filter((item) => alphaWord.test(item))) accepted.add(word);
  for (const word of denylist) accepted.delete(word.toLowerCase());

  const words = [...accepted].map((word) => word.toUpperCase()).sort();
  const dictionaryHash = sha256(`${words.join('\n')}\n`);
  const details = new Map();
  for (const upperWord of words) {
    const word = upperWord.toLowerCase();
    const lemma = entries.has(word) ? word : lemmaByWord.get(word) || formToLemma.get(word);
    const info = buildWordInfo(word, lemma, lemma ? entries.get(lemma) : null, synsets, cmuPronunciations);
    if (info) details.set(upperWord, info);
  }

  const anagramIndex = buildAnagramIndex(words);
  const manifest = {
    schemaVersion: 1,
    generatedAt: '2025-12-31T00:00:00.000Z',
    language: 'en-US',
    minimumLength: MIN_LENGTH,
    maximumLength: MAX_LENGTH,
    wordCount: words.length,
    signatureCount: Object.keys(anagramIndex).length,
    detailCount: details.size,
    pronunciationCount: [...details.values()].filter((item) => item.phonetic).length,
    dictionaryHash,
    sources,
  };

  await writeJson('src/data/words.json', words);
  await writeJson('public/anagram-index.json', anagramIndex);
  await writeJson('apple/WordGameCore/Sources/WordGameCore/Resources/words.json', words);
  await writeJson('apple/WordGameCore/Sources/WordGameCore/Resources/anagram-index.json', anagramIndex);
  await writeJson('src/data/lexicon-manifest.json', manifest);
  await writeJson('apple/WordGameCore/Sources/WordGameCore/Resources/lexicon-manifest.json', manifest);

  const shardRoot = resolve(root, 'public/word-details');
  await rm(shardRoot, { recursive: true, force: true });
  await mkdir(shardRoot, { recursive: true });
  const shards = new Map();
  for (const [word, info] of details) {
    const prefix = word.slice(0, 2).toLowerCase();
    if (!shards.has(prefix)) shards.set(prefix, {});
    shards.get(prefix)[word] = info;
  }
  for (const [prefix, shard] of shards) await writeJson(`public/word-details/${prefix}.json`, shard);

  await buildSQLite(
    resolve(root, 'apple/WordGameCore/Sources/WordGameCore/Resources/lexicon.sqlite'),
    words,
    details,
    manifest,
  );

  const report = `# Lexicon Build Report\n\n` +
    `- Generated: ${manifest.generatedAt}\n` +
    `- Accepted words: ${words.length.toLocaleString()}\n` +
    `- Anagram signatures: ${manifest.signatureCount.toLocaleString()}\n` +
    `- Local definitions: ${details.size.toLocaleString()}\n` +
    `- Local pronunciations: ${manifest.pronunciationCount.toLocaleString()}\n` +
    `- Open English WordNet entries rejected by shape/casing: ${rejectedByShape.toLocaleString()}\n` +
    `- Dictionary SHA-256: \`${dictionaryHash}\`\n`;
  await writeFile(resolve(root, 'docs/lexicon-build-report.md'), report);
  console.log(`Generated ${words.length.toLocaleString()} words, ${details.size.toLocaleString()} local detail records, and ${Object.keys(anagramIndex).length.toLocaleString()} signatures.`);
}

await main();
