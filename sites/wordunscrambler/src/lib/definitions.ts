export interface WordDefinition {
  definition: string;
  example?: string;
}

export interface WordMeaning {
  partOfSpeech: string;
  definitions: WordDefinition[];
}

export interface WordInfo {
  word: string;
  phonetic: string;
  audioUrl?: string;
  meanings: WordMeaning[];
  source: 'local' | 'api';
}

type DictionaryApiResponse = Array<{
  word?: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string; example?: string }>;
  }>;
}>;

type DetailShard = Record<string, WordInfo>;

const wordCache = new Map<string, WordInfo | null>();
const shardCache = new Map<string, Promise<DetailShard>>();

function normalizeWord(word: string): string {
  return word.toUpperCase().replace(/[^A-Z]/g, '');
}

async function loadDetailShard(prefix: string): Promise<DetailShard> {
  const existing = shardCache.get(prefix);
  if (existing) return existing;

  const request = fetch(`/word-details/${prefix}.json`)
    .then(async (response) => {
      if (response.status === 404) return {};
      if (!response.ok) throw new Error(`Unable to load local word details: ${response.status}`);
      return response.json() as Promise<DetailShard>;
    })
    .catch((error) => {
      shardCache.delete(prefix);
      throw error;
    });
  shardCache.set(prefix, request);
  return request;
}

export async function getLocalWordInfo(word: string): Promise<WordInfo | null> {
  const normalized = normalizeWord(word);
  if (normalized.length < 2) return null;
  try {
    const shard = await loadDetailShard(normalized.slice(0, 2).toLowerCase());
    return shard[normalized] ?? null;
  } catch {
    return null;
  }
}

async function getApiWordInfo(normalized: string, signal?: AbortSignal): Promise<WordInfo | null> {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized.toLowerCase())}`,
      { signal },
    );
    if (response.status === 404) {
      wordCache.set(normalized, null);
      return null;
    }
    if (!response.ok) return null;

    const entries = await response.json() as DictionaryApiResponse;
    const entry = entries[0];
    if (!entry) return null;
    const meanings = (entry.meanings || [])
      .slice(0, 2)
      .map((meaning) => ({
        partOfSpeech: meaning.partOfSpeech || 'word',
        definitions: (meaning.definitions || [])
          .filter((definition) => definition.definition)
          .slice(0, 2)
          .map((definition) => ({ definition: definition.definition!, example: definition.example })),
      }))
      .filter((meaning) => meaning.definitions.length > 0);
    if (!meanings.length) return null;

    return {
      word: (entry.word || normalized).toUpperCase(),
      phonetic: entry.phonetic || entry.phonetics?.find((item) => item.text)?.text || '',
      audioUrl: entry.phonetics?.find((item) => item.audio)?.audio || undefined,
      meanings,
      source: 'api',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    return null;
  }
}

export async function getWordInfo(word: string, signal?: AbortSignal): Promise<WordInfo | null> {
  const normalized = normalizeWord(word);
  if (!normalized) return null;
  if (wordCache.has(normalized)) return wordCache.get(normalized)!;

  const local = await getLocalWordInfo(normalized);
  if (local) {
    wordCache.set(normalized, local);
    return local;
  }

  const api = await getApiWordInfo(normalized, signal);
  if (api) wordCache.set(normalized, api);
  return api;
}
