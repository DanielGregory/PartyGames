import type { BaseGameState, GameId, GameModule } from "../types";
import { spyfallModule } from "./spyfall";
import { fibbingItModule } from "./fibbingit";
import { triviaModule } from "./trivia";
import { mostLikelyModule } from "./mostlikely";
import { quizMasterModule } from "./quizmaster";
import { connectFourModule } from "./connectfour";
import { hangmanModule } from "./hangman";
import { battleshipModule } from "./battleship";
import { guessWhoModule } from "./guesswho";
import { boggleModule } from "./boggle";
import { wordSearchModule } from "./wordsearch";
import { wordleModule } from "./wordle";
import { pictionaryModule } from "./pictionary";
import { sorryModule } from "./sorry";
import { yahtzeeModule } from "./yahtzee";
import { unoModule } from "./uno";

export const gameRegistry: Record<GameId, GameModule<BaseGameState & Record<string, unknown>>> = {
  spyfall: spyfallModule as GameModule<BaseGameState & Record<string, unknown>>,
  fibbingit: fibbingItModule as GameModule<BaseGameState & Record<string, unknown>>,
  trivia: triviaModule as GameModule<BaseGameState & Record<string, unknown>>,
  mostlikely: mostLikelyModule as GameModule<BaseGameState & Record<string, unknown>>,
  quizmaster: quizMasterModule as GameModule<BaseGameState & Record<string, unknown>>,
  connectfour: connectFourModule as GameModule<BaseGameState & Record<string, unknown>>,
  hangman: hangmanModule as GameModule<BaseGameState & Record<string, unknown>>,
  battleship: battleshipModule as GameModule<BaseGameState & Record<string, unknown>>,
  guesswho: guessWhoModule as GameModule<BaseGameState & Record<string, unknown>>,
  boggle: boggleModule as GameModule<BaseGameState & Record<string, unknown>>,
  wordsearch: wordSearchModule as GameModule<BaseGameState & Record<string, unknown>>,
  wordle: wordleModule as GameModule<BaseGameState & Record<string, unknown>>,
  pictionary: pictionaryModule as GameModule<BaseGameState & Record<string, unknown>>,
  sorry: sorryModule as GameModule<BaseGameState & Record<string, unknown>>,
  yahtzee: yahtzeeModule as GameModule<BaseGameState & Record<string, unknown>>,
  uno: unoModule as GameModule<BaseGameState & Record<string, unknown>>,
};

export const gameList = Object.values(gameRegistry).map((m) => m.meta);
