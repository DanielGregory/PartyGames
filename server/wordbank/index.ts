// Shared Word Bank service - the one place any game module goes for word
// data, so Boggle/Word Search/Wordle (and future word games) don't each
// reimplement dictionary loading or curated-list queries.
export { isValidWord, dictionarySize } from "./dictionary";
export { getWordList, listCategories, type CuratedWord } from "./curated";
