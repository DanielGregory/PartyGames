import "server-only";
import { readFileSync } from "fs";
import { join } from "path";

// ~274k-word English dictionary, bundled as a static file (see
// ATTRIBUTION.md) and loaded once into memory per warm serverless instance.
// Powers isValidWord() for any game module that needs to validate freeform
// player-submitted words (Boggle, Word Search selections, Wordle guesses)
// against real English - as opposed to getWordList() in curated.ts, which
// serves small hand-picked lists for prompts/answers/themes.
let dictionary: Set<string> | null = null;

function loadDictionary(): Set<string> {
  if (dictionary) return dictionary;
  const path = join(process.cwd(), "server", "wordbank", "words.txt");
  const raw = readFileSync(path, "utf8");
  dictionary = new Set(raw.split("\n").map((w) => w.trim().toLowerCase()).filter(Boolean));
  return dictionary;
}

export function isValidWord(word: string): boolean {
  return loadDictionary().has(word.trim().toLowerCase());
}

export function dictionarySize(): number {
  return loadDictionary().size;
}
