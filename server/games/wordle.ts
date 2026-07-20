import type { BaseGameState, GameModule, Player } from "../types";
import { isValidWord, randomWords } from "../wordbank";

const DEFAULT_WORD_LENGTH = 5;
const DEFAULT_ROUND_MS = 3 * 60 * 1000;
// Fewer guesses for shorter words, more for longer - one more try than the
// word's own length, matching classic Wordle's 6-tries-for-5-letters ratio.
function maxGuessesFor(wordLength: number): number {
  return wordLength + 1;
}
function pointsTable(maxGuesses: number): number[] {
  return Array.from({ length: maxGuesses }, (_, i) => maxGuesses - i);
}

export type LetterState = "green" | "yellow" | "gray";
export type Guess = { word: string; feedback: LetterState[] };

export type WordleState = BaseGameState & {
  stage: "guessing" | "reveal";
  wordLength: number;
  maxGuesses: number;
  secret: string;
  usedWords: string[];
  roundMs: number;
  timerEndsAt: number;
  guesses: Record<string, Guess[]>;
};

function startRound(
  prev: WordleState | null,
  players: Player[],
  config?: Record<string, unknown>
): WordleState {
  void players;
  const usedWords = prev?.usedWords ?? [];
  const wordLength =
    prev?.wordLength ?? (typeof config?.wordLength === "number" ? config.wordLength : DEFAULT_WORD_LENGTH);
  const roundMs =
    prev?.roundMs ?? (typeof config?.roundMinutes === "number" ? config.roundMinutes * 60 * 1000 : DEFAULT_ROUND_MS);
  const [secret] = randomWords(wordLength, wordLength, 1, usedWords);

  return {
    stage: "guessing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    wordLength,
    maxGuesses: maxGuessesFor(wordLength),
    secret,
    usedWords: [...usedWords, secret],
    roundMs,
    timerEndsAt: Date.now() + roundMs,
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

function isDone(guesses: Guess[], secret: string, maxGuesses: number): boolean {
  return guesses.some((g) => g.word === secret) || guesses.length >= maxGuesses;
}

function finalizeRound(state: WordleState, players: Player[]): WordleState {
  const points = pointsTable(state.maxGuesses);
  const scoreDeltas: Record<string, number> = {};
  for (const p of players) {
    const guesses = state.guesses[p.id] ?? [];
    const solvedAt = guesses.findIndex((g) => g.word === state.secret);
    if (solvedAt !== -1) scoreDeltas[p.id] = points[solvedAt] ?? 0;
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
    if (isDone(myGuesses, state.secret, state.maxGuesses)) return state;
    if (word.length !== state.wordLength) return state;
    if (!isValidWord(word)) return state;

    const feedback = computeFeedback(word, state.secret);
    const guesses = { ...state.guesses, [playerId]: [...myGuesses, { word, feedback }] };
    const updated = { ...state, guesses };

    const allDone = players
      .filter((p) => p.connected)
      .every((p) => isDone(updated.guesses[p.id] ?? [], state.secret, state.maxGuesses));

    return allDone ? finalizeRound(updated, players) : updated;
  }

  return state;
}

function redactState(state: WordleState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const myGuesses = state.guesses[forPlayerId] ?? [];
  const finishedCount = Object.values(state.guesses).filter((g) =>
    isDone(g, state.secret, state.maxGuesses)
  ).length;

  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    wordLength: state.wordLength,
    timerEndsAt: state.timerEndsAt,
    yourGuesses: myGuesses,
    guessesRemaining: state.maxGuesses - myGuesses.length,
    maxGuesses: state.maxGuesses,
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
    description: "Guess the secret word in one more try than its length. Fewer guesses score more.",
    minPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
