import type { BaseGameState, GameModule, Player } from "../types";
import { BOGGLE_DICE } from "./content";
import { isValidWord } from "../wordbank";

const GRID_SIZE = 4;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const ROUND_MS = 3 * 60 * 1000;
const MIN_WORD_LENGTH = 3;

export type BoggleState = BaseGameState & {
  stage: "playing" | "reveal";
  grid: string[]; // 16 cells, each "A".."Z" or "QU"
  timerEndsAt: number;
  foundWords: Record<string, string[]>; // word (lowercase) -> playerIds who found it
};

function rollGrid(): string[] {
  const dice = [...BOGGLE_DICE];
  for (let i = dice.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dice[i], dice[j]] = [dice[j], dice[i]];
  }
  return dice.map((faces) => faces[Math.floor(Math.random() * faces.length)]);
}

function neighborsOf(index: number): number[] {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  const result: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        result.push(r * GRID_SIZE + c);
      }
    }
  }
  return result;
}

const NEIGHBOR_CACHE: number[][] = Array.from({ length: CELL_COUNT }, (_, i) => neighborsOf(i));

/** Does a path exist through the grid, visiting each cell at most once,
 * whose cell letters concatenate to exactly `word`? */
export function canFormWord(grid: string[], word: string): boolean {
  const upper = word.toUpperCase();

  function dfs(pos: number, matchedLen: number, visited: Set<number>): boolean {
    if (matchedLen === upper.length) return true;
    for (const n of NEIGHBOR_CACHE[pos]) {
      if (visited.has(n)) continue;
      const letter = grid[n];
      if (upper.startsWith(letter, matchedLen)) {
        visited.add(n);
        if (dfs(n, matchedLen + letter.length, visited)) return true;
        visited.delete(n);
      }
    }
    return false;
  }

  for (let start = 0; start < grid.length; start++) {
    const letter = grid[start];
    if (upper.startsWith(letter, 0)) {
      if (dfs(start, letter.length, new Set([start]))) return true;
    }
  }
  return false;
}

function pointsForLength(length: number): number {
  if (length <= 4) return 1;
  if (length === 5) return 2;
  if (length === 6) return 3;
  if (length === 7) return 5;
  return 11;
}

function startRound(prev: BoggleState | null, players: Player[]): BoggleState {
  void players;
  return {
    stage: "playing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    grid: rollGrid(),
    timerEndsAt: Date.now() + ROUND_MS,
    foundWords: {},
  };
}

function reveal(state: BoggleState): BoggleState {
  const scoreDeltas: Record<string, number> = {};
  for (const [word, finders] of Object.entries(state.foundWords)) {
    if (finders.length !== 1) continue; // dedupe rule: shared finds score nobody
    const [playerId] = finders;
    scoreDeltas[playerId] = (scoreDeltas[playerId] ?? 0) + pointsForLength(word.length);
  }
  return { ...state, stage: "reveal", roundOver: true, scoreDeltas };
}

function applyAction(state: BoggleState, playerId: string, payload: unknown): BoggleState {
  const action = payload as { type: string; word?: string };

  if (action.type === "time_up" && state.stage === "playing") {
    return reveal(state);
  }

  if (action.type === "submit_word" && state.stage === "playing") {
    const word = (action.word ?? "").trim().toLowerCase();
    if (word.length < MIN_WORD_LENGTH) return state;
    if (state.foundWords[word]?.includes(playerId)) return state;
    if (!isValidWord(word)) return state;
    if (!canFormWord(state.grid, word)) return state;

    const finders = state.foundWords[word] ?? [];
    return {
      ...state,
      foundWords: { ...state.foundWords, [word]: [...finders, playerId] },
    };
  }

  return state;
}

function redactState(state: BoggleState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    grid: state.grid,
    timerEndsAt: state.timerEndsAt,
    totalWordsFound: Object.keys(state.foundWords).length,
  };

  if (state.stage === "reveal") {
    return { ...base, foundWords: state.foundWords };
  }

  const yourWords = Object.entries(state.foundWords)
    .filter(([, finders]) => finders.includes(forPlayerId))
    .map(([word]) => word);

  return { ...base, yourWords };
}

export const boggleModule: GameModule<BoggleState> = {
  meta: {
    id: "boggle",
    label: "Boggle",
    description: "Find as many words as you can on a shared letter grid before time runs out.",
    minPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
