// Shared Word Bank service - the one place any game module goes for word
// data, so Boggle/Word Search/Wordle (and future word games) don't each
// reimplement dictionary loading or random-word selection.
export { isValidWord, dictionarySize, randomWords } from "./dictionary";
