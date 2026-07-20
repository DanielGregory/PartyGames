import type { BaseGameState, GameModule, Player } from "../types";
import { BIG_BOGGLE_DICE, BOGGLE_DICE } from "./content";
import { isValidWord } from "../wordbank";

const DEFAULT_GRID_SIZE = 4;
const DEFAULT_ROUND_MS = 3 * 60 * 1000;
const DEFAULT_MIN_WORD_LENGTH = 3;

export type BoggleState = BaseGameState & {
  stage: "playing" | "reveal";
  gridSize: number;
  grid: string[]; // gridSize x gridSize cells, each "A".."Z" or "QU"
  roundMs: number;
  minWordLength: number;
  timerEndsAt: number;
  foundWords: Record<string, string[]>; // word (lowercase) -> playerIds who found it
};

function diceSetFor(gridSize: number): string[][] {
  return gridSize >= 5 ? BIG_BOGGLE_DICE : BOGGLE_DICE;
}

function rollGrid(gridSize: number): string[] {
  const dice = [...diceSetFor(gridSize)];
  for (let i = dice.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dice[i], dice[j]] = [dice[j], dice[i]];
  }
  return dice.slice(0, gridSize * gridSize).map((faces) => faces[Math.floor(Math.random() * faces.length)]);
}

function isAdjacent(a: number, b: number, gridSize: number): boolean {
  if (a === b) return false;
  const r1 = Math.floor(a / gridSize);
  const c1 = a % gridSize;
  const r2 = Math.floor(b / gridSize);
  const c2 = b % gridSize;
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
}

/** Is `cells` a valid drag path: in-bounds, no repeated cell, each step
 * adjacent to the last? */
function isValidPath(cells: number[], gridSize: number): boolean {
  if (cells.length === 0) return false;
  const cellCount = gridSize * gridSize;
  if (new Set(cells).size !== cells.length) return false;
  for (const c of cells) {
    if (!Number.isInteger(c) || c < 0 || c >= cellCount) return false;
  }
  for (let i = 1; i < cells.length; i++) {
    if (!isAdjacent(cells[i - 1], cells[i], gridSize)) return false;
  }
  return true;
}

function pointsForLength(length: number): number {
  if (length <= 4) return 1;
  if (length === 5) return 2;
  if (length === 6) return 3;
  if (length === 7) return 5;
  return 11;
}

function startRound(
  prev: BoggleState | null,
  players: Player[],
  config?: Record<string, unknown>
): BoggleState {
  void players;
  const gridSize =
    prev?.gridSize ?? (config?.boardSize === "big" ? 5 : DEFAULT_GRID_SIZE);
  const roundMs =
    prev?.roundMs ?? (typeof config?.roundMinutes === "number" ? config.roundMinutes * 60 * 1000 : DEFAULT_ROUND_MS);
  const minWordLength =
    prev?.minWordLength ??
    (typeof config?.minWordLength === "number" ? config.minWordLength : DEFAULT_MIN_WORD_LENGTH);

  return {
    stage: "playing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    gridSize,
    grid: rollGrid(gridSize),
    roundMs,
    minWordLength,
    timerEndsAt: Date.now() + roundMs,
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
  const action = payload as { type: string; cells?: unknown };

  if (action.type === "time_up" && state.stage === "playing") {
    return reveal(state);
  }

  if (action.type === "submit_path" && state.stage === "playing") {
    const cells = Array.isArray(action.cells) ? (action.cells as unknown[]) : [];
    const path = cells.filter((c): c is number => typeof c === "number");
    if (path.length !== cells.length) return state; // malformed entry
    if (!isValidPath(path, state.gridSize)) return state;

    const word = path.map((c) => state.grid[c]).join("").toLowerCase();
    if (word.length < state.minWordLength) return state;
    if (state.foundWords[word]?.includes(playerId)) return state;
    if (!isValidWord(word)) return state;

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
    gridSize: state.gridSize,
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
