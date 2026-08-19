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

const cache = new Map<string, WordInfo | null>();

const localFallbacks: Record<string, WordInfo> = {
  ATE: {
    word: 'ATE',
    phonetic: '/eIt/',
    meanings: [{
      partOfSpeech: 'verb',
      definitions: [{ definition: 'Past tense of eat.', example: 'She ate breakfast before the game.' }],
    }],
    source: 'local',
  },
  EAT: {
    word: 'EAT',
    phonetic: '/iːt/',
    meanings: [{
      partOfSpeech: 'verb',
      definitions: [{ definition: 'To take food into the mouth and swallow it.', example: 'They eat dinner together every night.' }],
    }],
    source: 'local',
  },
  TEA: {
    word: 'TEA',
    phonetic: '/tiː/',
    meanings: [{
      partOfSpeech: 'noun',
      definitions: [{ definition: 'A hot drink made by infusing dried leaves in water.', example: 'He poured a cup of tea.' }],
    }],
    source: 'local',
  },
  DOG: {
    word: 'DOG',
    phonetic: '/dɔːɡ/',
    meanings: [{
      partOfSpeech: 'noun',
      definitions: [{ definition: 'A domesticated animal often kept as a companion or working animal.', example: 'The dog waited by the door.' }],
    }],
    source: 'local',
  },
  GOD: {
    word: 'GOD',
    phonetic: '/ɡɑːd/',
    meanings: [{
      partOfSpeech: 'noun',
      definitions: [{ definition: 'A being worshiped as having supernatural power.', example: 'The poem refers to a god of thunder.' }],
    }],
    source: 'local',
  },
  ALL: {
    word: 'ALL',
    phonetic: '/ɔːl/',
    meanings: [{
      partOfSpeech: 'determiner',
      definitions: [{ definition: 'The whole amount, quantity, or extent of something.', example: 'All players must check in before noon.' }],
    }],
    source: 'local',
  },
};

export function getLocalWordInfo(word: string): WordInfo | null {
  return localFallbacks[word.toUpperCase()] ?? null;
}

export async function getWordInfo(word: string, signal?: AbortSignal): Promise<WordInfo | null> {
  const normalized = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!normalized) return null;
  if (cache.has(normalized)) return cache.get(normalized)!;

  const local = getLocalWordInfo(normalized);
  if (local) {
    cache.set(normalized, local);
    return local;
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized.toLowerCase())}`,
      { signal },
    );

    if (!response.ok) {
      cache.set(normalized, null);
      return null;
    }

    const entries = await response.json() as DictionaryApiResponse;
    const entry = entries[0];
    if (!entry) {
      cache.set(normalized, null);
      return null;
    }

    const phonetic =
      entry.phonetic ||
      entry.phonetics?.find((item) => item.text)?.text ||
      '';
    const audioUrl = entry.phonetics?.find((item) => item.audio)?.audio || undefined;
    const meanings = (entry.meanings || [])
      .slice(0, 2)
      .map((meaning) => ({
        partOfSpeech: meaning.partOfSpeech || 'word',
        definitions: (meaning.definitions || [])
          .filter((definition) => definition.definition)
          .slice(0, 2)
          .map((definition) => ({
            definition: definition.definition!,
            example: definition.example,
          })),
      }))
      .filter((meaning) => meaning.definitions.length > 0);

    if (meanings.length === 0) {
      cache.set(normalized, null);
      return null;
    }

    const info: WordInfo = {
      word: (entry.word || normalized).toUpperCase(),
      phonetic,
      audioUrl,
      meanings,
      source: 'api',
    };
    cache.set(normalized, info);
    return info;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    cache.set(normalized, null);
    return null;
  }
}
