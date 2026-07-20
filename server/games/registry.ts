import type { BaseGameState, GameId, GameModule } from "../types";
import { spyfallModule } from "./spyfall";
import { fibbingItModule } from "./fibbingit";
import { triviaModule } from "./trivia";
import { mostLikelyModule } from "./mostlikely";

export const gameRegistry: Record<GameId, GameModule<BaseGameState & Record<string, unknown>>> = {
  spyfall: spyfallModule as GameModule<BaseGameState & Record<string, unknown>>,
  fibbingit: fibbingItModule as GameModule<BaseGameState & Record<string, unknown>>,
  trivia: triviaModule as GameModule<BaseGameState & Record<string, unknown>>,
  mostlikely: mostLikelyModule as GameModule<BaseGameState & Record<string, unknown>>,
};

export const gameList = Object.values(gameRegistry).map((m) => m.meta);
