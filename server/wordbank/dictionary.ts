import "server-only";
import { readFileSync } from "fs";
import { join } from "path";

// ~274k-word English dictionary, bundled as a static file (see
// ATTRIBUTION.md) and loaded once into memory per warm serverless instance.
// Powers isValidWord() for validating freeform player-submitted words
// (Boggle, Word Search selections, Wordle guesses) and randomWords() for
// picking round content (Wordle's secret, Word Search's grid words) - both
// against the full dictionary rather than a small curated pool.
let dictionary: Set<string> | null = null;
let byLength: Map<number, string[]> | null = null;

function loadDictionary(): Set<string> {
  if (dictionary) return dictionary;
  const path = join(process.cwd(), "server", "wordbank", "words.txt");
  const raw = readFileSync(path, "utf8");
  dictionary = new Set(raw.split("\n").map((w) => w.trim().toLowerCase()).filter(Boolean));
  return dictionary;
}

function loadByLength(): Map<number, string[]> {
  if (byLength) return byLength;
  const map = new Map<number, string[]>();
  for (const word of loadDictionary()) {
    const bucket = map.get(word.length);
    if (bucket) bucket.push(word);
    else map.set(word.length, [word]);
  }
  byLength = map;
  return map;
}

export function isValidWord(word: string): boolean {
  return loadDictionary().has(word.trim().toLowerCase());
}

export function dictionarySize(): number {
  return loadDictionary().size;
}

/**
 * `count` random, non-repeating words from the full dictionary with length
 * in [minLength, maxLength], excluding anything in `exclude`. Powers
 * Wordle's secret word and Word Search's grid words - unlike a curated
 * list, this draws from the whole ~274k-word dictionary so rounds don't
 * repeat the same small pool.
 */
export function randomWords(
  minLength: number,
  maxLength: number,
  count: number,
  exclude: string[] = []
): string[] {
  const map = loadByLength();
  const excludeSet = new Set(exclude);
  let pool: string[] = [];
  for (let len = minLength; len <= maxLength; len++) {
    for (const word of map.get(len) ?? []) {
      if (!excludeSet.has(word)) pool.push(word);
    }
  }
  if (pool.length < count) {
    // Excluded too much of the pool (e.g. a long-running session) - fall
    // back to the unfiltered pool rather than returning too few words.
    pool = [];
    for (let len = minLength; len <= maxLength; len++) pool = pool.concat(map.get(len) ?? []);
  }

  const picked: string[] = [];
  const used = new Set<number>();
  while (picked.length < count && picked.length < pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    if (used.has(i)) continue;
    used.add(i);
    picked.push(pool[i]);
  }
  return picked;
}
