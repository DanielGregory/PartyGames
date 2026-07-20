import type { BaseGameState, GameModule, Player } from "../types";
import { getWordList, isValidWord } from "../wordbank";

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const ROUND_MS = 3 * 60 * 1000;
const POINTS_BY_GUESS_COUNT = [6, 5, 4, 3, 2, 1];

export type LetterState = "green" | "yellow" | "gray";
export type Guess = { word: string; feedback: LetterState[] };

export type WordleState = BaseGameState & {
  stage: "guessing" | "reveal";
  secret: string;
  usedWords: string[];
  timerEndsAt: number;
  guesses: Record<string, Guess[]>;
};

async function startRound(prev: WordleState | null, players: Player[]): Promise<WordleState> {
  void players;
  const usedWords = prev?.usedWords ?? [];
  // Tracked by word string rather than index: getWordList() re-queries
  // Supabase each round and row order isn't guaranteed stable, so an
  // index-based "already used" list (the pattern content.ts's pickUnused
  // uses for static in-repo arrays) would silently drift here.
  const words = (await getWordList("wordle", WORD_LENGTH)).map((w) => w.toLowerCase());
  const available = words.filter((w) => !usedWords.includes(w));
  const pool = available.length > 0 ? available : words;
  const secret = pool[Math.floor(Math.random() * pool.length)];

  return {
    stage: "guessing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    secret,
    usedWords: [...usedWords, secret],
    timerEndsAt: Date.now() + ROUND_MS,
    guesses: {},
  };
}

export function computeFeedback(guess: string, secret: string): LetterState[] {
  const g = guess.split("");
  const s = secret.split("");
  const feedback: LetterState[] = new Array(g.length).fill("gray");
  const remaining: (string | null)[] = [...s];

  for (let i = 0; i < g.length; i++) {
    if (g[i] === s[i]) {
      feedback[i] = "green";
      remaining[i] = null;
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (feedback[i] === "green") continue;
    const idx = remaining.indexOf(g[i]);
    if (idx !== -1) {
      feedback[i] = "yellow";
      remaining[idx] = null;
    }
  }
  return feedback;
}

function pointsForGuessCount(count: number): number {
  return POINTS_BY_GUESS_COUNT[count - 1] ?? 0;
}

function isDone(guesses: Guess[], secret: string): boolean {
  return guesses.some((g) => g.word === secret) || guesses.length >= MAX_GUESSES;
}

function finalizeRound(state: WordleState, players: Player[]): WordleState {
  const scoreDeltas: Record<string, number> = {};
  for (const p of players) {
    const guesses = state.guesses[p.id] ?? [];
    const solvedAt = guesses.findIndex((g) => g.word === state.secret);
    if (solvedAt !== -1) scoreDeltas[p.id] = pointsForGuessCount(solvedAt + 1);
  }
  return { ...state, stage: "reveal", roundOver: true, scoreDeltas };
}

function applyAction(
  state: WordleState,
  playerId: string,
  payload: unknown,
  players: Player[]
): WordleState {
  const action = payload as { type: string; word?: string };

  if (action.type === "time_up" && state.stage === "guessing") {
    return finalizeRound(state, players);
  }

  if (action.type === "guess" && state.stage === "guessing") {
    const word = (action.word ?? "").trim().toLowerCase();
    const myGuesses = state.guesses[playerId] ?? [];
    if (isDone(myGuesses, state.secret)) return state;
    if (word.length !== WORD_LENGTH) return state;
    if (!isValidWord(word)) return state;

    const feedback = computeFeedback(word, state.secret);
    const guesses = { ...state.guesses, [playerId]: [...myGuesses, { word, feedback }] };
    const updated = { ...state, guesses };

    const allDone = players
      .filter((p) => p.connected)
      .every((p) => isDone(updated.guesses[p.id] ?? [], state.secret));

    return allDone ? finalizeRound(updated, players) : updated;
  }

  return state;
}

function redactState(state: WordleState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const myGuesses = state.guesses[forPlayerId] ?? [];
  const finishedCount = Object.values(state.guesses).filter((g) => isDone(g, state.secret)).length;

  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    timerEndsAt: state.timerEndsAt,
    yourGuesses: myGuesses,
    guessesRemaining: MAX_GUESSES - myGuesses.length,
    maxGuesses: MAX_GUESSES,
    solved: myGuesses.some((g) => g.word === state.secret),
    finishedCount,
  };

  if (state.stage === "reveal") {
    const allResults: Record<string, { guesses: number; solved: boolean }> = {};
    for (const [pid, guesses] of Object.entries(state.guesses)) {
      allResults[pid] = { guesses: guesses.length, solved: guesses.some((g) => g.word === state.secret) };
    }
    return { ...base, secret: state.secret, allResults };
  }

  return base;
}

export const wordleModule: GameModule<WordleState> = {
  meta: {
    id: "wordle",
    label: "Wordle",
    description: "Guess the secret 5-letter word in 6 tries. Fewer guesses score more.",
    minPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
