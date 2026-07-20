import type { BaseGameState, GameModule, Player } from "../types";
import { randomWords } from "../wordbank";

const GRID_SIZE = 10;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const DEFAULT_TARGET_WORD_COUNT = 8;
const LENGTH_PRESETS: Record<string, [number, number]> = {
  short: [3, 6],
  medium: [4, 8],
  long: [6, 10],
};
const DEFAULT_LENGTH_PRESET = "medium";
const DEFAULT_ROUND_MS = 3 * 60 * 1000;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const POINTS_PER_WORD = 2; // flat, regardless of length - matches Trivia's per-correct value

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export type WordSearchState = BaseGameState & {
  stage: "searching" | "reveal";
  usedWords: string[];
  targetWordCount: number;
  roundMs: number;
  minWordLengthPreset: string;
  gridSize: number;
  grid: string[];
  targetWords: string[];
  placements: Record<string, number[]>; // hidden until found (or reveal)
  foundWords: Record<string, { playerId: string; cells: number[] }>;
  timerEndsAt: number;
};

/** Places `word` on the grid, preferring a placement that overlaps existing
 * letters (a real crossing, like hand-made word search puzzles) over one
 * that lands in empty space - tries a budget of random placements and keeps
 * the one with the most overlap, stopping early once a solid crossing is
 * found. Falls back to any valid (possibly non-overlapping) placement if no
 * overlap is possible for this word. */
function tryPlaceWord(grid: (string | null)[], word: string): number[] | null {
  let best: number[] | null = null;
  let bestOverlap = -1;

  for (let attempt = 0; attempt < 300; attempt++) {
    const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const startRow = Math.floor(Math.random() * GRID_SIZE);
    const startCol = Math.floor(Math.random() * GRID_SIZE);
    const endRow = startRow + dr * (word.length - 1);
    const endCol = startCol + dc * (word.length - 1);
    if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) continue;

    const cells: number[] = [];
    let ok = true;
    let overlap = 0;
    for (let i = 0; i < word.length; i++) {
      const r = startRow + dr * i;
      const c = startCol + dc * i;
      const index = r * GRID_SIZE + c;
      const existing = grid[index];
      if (existing !== null) {
        if (existing !== word[i]) {
          ok = false;
          break;
        }
        overlap++;
      }
      cells.push(index);
    }
    if (!ok) continue;

    if (overlap > bestOverlap) {
      best = cells;
      bestOverlap = overlap;
    }
    if (bestOverlap >= 2) break; // good enough crossing - stop burning attempts
  }

  if (best) {
    best.forEach((index, i) => {
      grid[index] = word[i];
    });
  }
  return best;
}

function startRound(
  prev: WordSearchState | null,
  players: Player[],
  config?: Record<string, unknown>
): WordSearchState {
  void players;
  const usedWords = prev?.usedWords ?? [];
  const targetWordCount =
    prev?.targetWordCount ??
    (typeof config?.wordCount === "number" ? config.wordCount : DEFAULT_TARGET_WORD_COUNT);
  const roundMs =
    prev?.roundMs ?? (typeof config?.roundMinutes === "number" ? config.roundMinutes * 60 * 1000 : DEFAULT_ROUND_MS);
  const lengthPresetKey =
    prev?.minWordLengthPreset ?? (typeof config?.wordLength === "string" ? config.wordLength : DEFAULT_LENGTH_PRESET);
  const [minLen, maxLen] = LENGTH_PRESETS[lengthPresetKey] ?? LENGTH_PRESETS[DEFAULT_LENGTH_PRESET];

  // Pull more candidates than needed since not every word will find a
  // placement on the grid (collisions get retried, not guaranteed).
  const candidates = randomWords(minLen, maxLen, targetWordCount * 3, usedWords).map((w) => w.toUpperCase());

  const grid: (string | null)[] = new Array(CELL_COUNT).fill(null);
  const placements: Record<string, number[]> = {};
  const targetWords: string[] = [];

  for (const word of candidates) {
    if (targetWords.length >= targetWordCount) break;
    const cells = tryPlaceWord(grid, word);
    if (cells) {
      placements[word] = cells;
      targetWords.push(word);
    }
  }

  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === null) grid[i] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }

  return {
    stage: "searching",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    usedWords: [...usedWords, ...targetWords.map((w) => w.toLowerCase())],
    targetWordCount,
    roundMs,
    minWordLengthPreset: lengthPresetKey,
    gridSize: GRID_SIZE,
    grid: grid as string[],
    targetWords,
    placements,
    foundWords: {},
    timerEndsAt: Date.now() + roundMs,
  };
}

/** The straight (horizontal/vertical/diagonal) line of cells between two
 * indices, inclusive - or null if they don't form one. */
function straightLine(start: number, end: number): number[] | null {
  const r1 = Math.floor(start / GRID_SIZE);
  const c1 = start % GRID_SIZE;
  const r2 = Math.floor(end / GRID_SIZE);
  const c2 = end % GRID_SIZE;
  const dr = r2 - r1;
  const dc = c2 - c1;
  if (dr === 0 && dc === 0) return null;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;

  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const stepR = Math.sign(dr);
  const stepC = Math.sign(dc);
  const cells: number[] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push((r1 + stepR * i) * GRID_SIZE + (c1 + stepC * i));
  }
  return cells;
}

function applyAction(state: WordSearchState, playerId: string, payload: unknown): WordSearchState {
  const action = payload as { type: string; startCell?: number; endCell?: number };

  if (action.type === "time_up" && state.stage === "searching") {
    return { ...state, stage: "reveal", roundOver: true };
  }

  if (
    action.type === "select" &&
    state.stage === "searching" &&
    typeof action.startCell === "number" &&
    typeof action.endCell === "number"
  ) {
    const line = straightLine(action.startCell, action.endCell);
    if (!line) return state;

    const forward = line.map((i) => state.grid[i]).join("");
    const backward = [...line].reverse().map((i) => state.grid[i]).join("");
    const match = state.targetWords.find((w) => !state.foundWords[w] && (w === forward || w === backward));
    if (!match) return state;

    const foundWords = { ...state.foundWords, [match]: { playerId, cells: line } };
    const scoreDeltas = {
      ...state.scoreDeltas,
      [playerId]: (state.scoreDeltas[playerId] ?? 0) + POINTS_PER_WORD,
    };
    const allFound = state.targetWords.every((w) => foundWords[w]);

    return {
      ...state,
      foundWords,
      scoreDeltas,
      stage: allFound ? "reveal" : state.stage,
      roundOver: allFound,
    };
  }

  return state;
}

function redactState(state: WordSearchState): BaseGameState & Record<string, unknown> {
  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    gridSize: state.gridSize,
    grid: state.grid,
    targetWords: state.targetWords,
    timerEndsAt: state.timerEndsAt,
    foundWords: state.foundWords,
  };

  if (state.stage === "reveal") {
    return { ...base, solution: state.placements };
  }

  return base;
}

export const wordSearchModule: GameModule<WordSearchState> = {
  meta: {
    id: "wordsearch",
    label: "Word Search",
    description: "Race to find every hidden word in the grid before time runs out.",
    minPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
