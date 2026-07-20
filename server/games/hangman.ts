import type { BaseGameState, GameModule, Player } from "../types";
import { HANGMAN_WORDS, pickUnused } from "./content";
import { advanceTurn, currentPlayerId, initTurnOrder, isPlayersTurn, type TurnState } from "../turnManager";

const MAX_WRONG_GUESSES = 6;

export type HangmanState = BaseGameState & {
  stage: "guessing" | "reveal";
  word: string;
  usedIndices: number[];
  guessedLetters: string[];
  wrongGuesses: string[];
  turn: TurnState;
  won: boolean | null;
};

function startRound(prev: HangmanState | null, players: Player[]): HangmanState {
  const usedIndices = prev?.usedIndices ?? [];
  const { item, index } = pickUnused(HANGMAN_WORDS, usedIndices);
  const turn = initTurnOrder(
    players.map((p) => p.id),
    { shuffle: true }
  );

  return {
    stage: "guessing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    word: item.toUpperCase(),
    usedIndices: [...usedIndices, index],
    guessedLetters: [],
    wrongGuesses: [],
    turn,
    won: null,
  };
}

function isWordComplete(word: string, guessedLetters: string[]): boolean {
  return [...word].every((ch) => guessedLetters.includes(ch));
}

function applyAction(
  state: HangmanState,
  playerId: string,
  payload: unknown,
  players: Player[]
): HangmanState {
  const action = payload as { type: string; letter?: string };
  if (action.type !== "guess" || state.stage !== "guessing") return state;
  if (!isPlayersTurn(state.turn, playerId)) return state;

  const letter = (action.letter ?? "").toUpperCase();
  if (!/^[A-Z]$/.test(letter) || state.guessedLetters.includes(letter)) return state;

  const guessedLetters = [...state.guessedLetters, letter];
  const isHit = state.word.includes(letter);
  const scoreDeltas = { ...state.scoreDeltas };
  const wrongGuesses = isHit ? state.wrongGuesses : [...state.wrongGuesses, letter];

  if (isHit) {
    scoreDeltas[playerId] = (scoreDeltas[playerId] ?? 0) + 1;
  }

  if (isHit && isWordComplete(state.word, guessedLetters)) {
    return { ...state, guessedLetters, stage: "reveal", roundOver: true, won: true, scoreDeltas };
  }

  if (!isHit && wrongGuesses.length >= MAX_WRONG_GUESSES) {
    return { ...state, guessedLetters, wrongGuesses, stage: "reveal", roundOver: true, won: false, scoreDeltas };
  }

  const turn = advanceTurn(
    state.turn,
    players.filter((p) => !p.connected).map((p) => p.id)
  );
  return { ...state, guessedLetters, wrongGuesses, turn, scoreDeltas };
}

function pattern(word: string, guessedLetters: string[]): (string | null)[] {
  return [...word].map((ch) => (guessedLetters.includes(ch) ? ch : null));
}

function redactState(state: HangmanState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const currentTurn = currentPlayerId(state.turn);
  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    guessedLetters: state.guessedLetters,
    wrongGuesses: state.wrongGuesses,
    maxWrongGuesses: MAX_WRONG_GUESSES,
    currentTurn,
    isYourTurn: currentTurn === forPlayerId,
    pattern: pattern(state.word, state.guessedLetters),
    wordLength: state.word.length,
  };

  if (state.stage === "reveal") {
    return { ...base, word: state.word, won: state.won };
  }

  return base;
}

export const hangmanModule: GameModule<HangmanState> = {
  meta: {
    id: "hangman",
    label: "Hangman",
    description: "Take turns guessing letters to reveal the secret word before you run out of guesses.",
    minPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
