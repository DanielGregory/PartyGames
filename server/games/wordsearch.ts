import type { BaseGameState, GameModule, Player } from "../types";
import { getWordList } from "../wordbank";

const GRID_SIZE = 10;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const TARGET_WORD_COUNT = 8;
const ROUND_MS = 3 * 60 * 1000;
const CATEGORIES = ["animals", "fruits", "space", "ocean"];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
  category: string;
  usedCategories: string[];
  gridSize: number;
  grid: string[];
  targetWords: string[];
  placements: Record<string, number[]>; // hidden until found (or reveal)
  foundWords: Record<string, { playerId: string; cells: number[] }>;
  timerEndsAt: number;
};

function pickCategory(used: string[]): string {
  const available = CATEGORIES.filter((c) => !used.includes(c));
  const pool = available.length > 0 ? available : CATEGORIES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tryPlaceWord(grid: (string | null)[], word: string): number[] | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const startRow = Math.floor(Math.random() * GRID_SIZE);
    const startCol = Math.floor(Math.random() * GRID_SIZE);
    const endRow = startRow + dr * (word.length - 1);
    const endCol = startCol + dc * (word.length - 1);
    if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) continue;

    const cells: number[] = [];
    let ok = true;
    for (let i = 0; i < word.length; i++) {
      const r = startRow + dr * i;
      const c = startCol + dc * i;
      const index = r * GRID_SIZE + c;
      const existing = grid[index];
      if (existing !== null && existing !== word[i]) {
        ok = false;
        break;
      }
      cells.push(index);
    }
    if (!ok) continue;

    cells.forEach((index, i) => {
      grid[index] = word[i];
    });
    return cells;
  }
  return null;
}

async function startRound(
  prev: WordSearchState | null,
  players: Player[],
  config?: Record<string, unknown>
): Promise<WordSearchState> {
  void players;
  const usedCategories = prev?.usedCategories ?? [];
  const category =
    typeof config?.category === "string" && CATEGORIES.includes(config.category)
      ? config.category
      : pickCategory(usedCategories);

  const words = (await getWordList(category)).map((w) => w.toUpperCase());
  const candidates = shuffle(words).slice(0, TARGET_WORD_COUNT);

  const grid: (string | null)[] = new Array(CELL_COUNT).fill(null);
  const placements: Record<string, number[]> = {};
  const targetWords: string[] = [];

  for (const word of candidates) {
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
    category,
    usedCategories: [...usedCategories, category],
    gridSize: GRID_SIZE,
    grid: grid as string[],
    targetWords,
    placements,
    foundWords: {},
    timerEndsAt: Date.now() + ROUND_MS,
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
    const scoreDeltas = { ...state.scoreDeltas, [playerId]: (state.scoreDeltas[playerId] ?? 0) + match.length };
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
    category: state.category,
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
