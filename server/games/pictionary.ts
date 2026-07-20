import type { BaseGameState, GameModule, Player } from "../types";
import { DRAWING_WORDS } from "./content";

const DEFAULT_ROUND_MS = 2 * 60 * 1000;
const CHOOSE_MS = 15 * 1000;
const WORD_CHOICE_COUNT = 3;
const RANK_POINTS = [3, 2, 1]; // 1st, 2nd, 3rd+ correct guessers
const MAX_TOTAL_POINTS = 4000; // soft cap on stroke data per round
const MAX_GUESS_FEED = 50;

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; lineWidth: number };
type GuessEntry = { playerId: string; text: string; correct: boolean };

export type PictionaryState = BaseGameState & {
  stage: "choosing" | "drawing" | "reveal";
  drawerId: string;
  drawnHistory: string[];
  totalRounds: number; // 0 means no cap - host ends the game manually
  roundMs: number;
  usedWords: string[];
  wordChoices: string[] | null; // only populated during "choosing"
  word: string | null;
  strokes: Stroke[];
  guesses: GuessEntry[];
  correctGuessers: string[]; // in guess order
  chooseEndsAt: number;
  timerEndsAt: number | null; // set once the word is chosen
};

function pickNextDrawer(players: Player[], history: string[]): { drawerId: string; history: string[] } {
  const candidates = players.filter((p) => !history.includes(p.id));
  const pool = candidates.length > 0 ? candidates : players;
  const drawer = pool[Math.floor(Math.random() * pool.length)];
  const nextHistory = candidates.length > 0 ? [...history, drawer.id] : [drawer.id];
  return { drawerId: drawer.id, history: nextHistory };
}

function pickWordChoices(usedWords: string[]): string[] {
  const available = DRAWING_WORDS.filter((w) => !usedWords.includes(w));
  const pool = available.length >= WORD_CHOICE_COUNT ? available : DRAWING_WORDS;
  const copy = [...pool];
  const choices: string[] = [];
  for (let i = 0; i < WORD_CHOICE_COUNT && copy.length > 0; i++) {
    const index = Math.floor(Math.random() * copy.length);
    choices.push(copy[index]);
    copy.splice(index, 1);
  }
  return choices;
}

function normalize(word: string): string {
  return word.trim().toLowerCase();
}

function startRound(
  prev: PictionaryState | null,
  players: Player[],
  config?: Record<string, unknown>
): PictionaryState {
  const { drawerId, history } = pickNextDrawer(players, prev?.drawnHistory ?? []);
  const totalRounds = prev?.totalRounds ?? (typeof config?.rounds === "number" ? config.rounds : 0);
  const roundMs =
    prev?.roundMs ?? (typeof config?.roundMinutes === "number" ? config.roundMinutes * 60 * 1000 : DEFAULT_ROUND_MS);
  const usedWords = prev?.usedWords ?? [];

  return {
    stage: "choosing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    drawerId,
    drawnHistory: history,
    totalRounds,
    roundMs,
    usedWords,
    wordChoices: pickWordChoices(usedWords),
    word: null,
    strokes: [],
    guesses: [],
    correctGuessers: [],
    chooseEndsAt: Date.now() + CHOOSE_MS,
    timerEndsAt: null,
  };
}

function beginDrawing(state: PictionaryState, word: string): PictionaryState {
  return {
    ...state,
    stage: "drawing",
    word,
    usedWords: [...state.usedWords, word],
    wordChoices: null,
    timerEndsAt: Date.now() + state.roundMs,
  };
}

function totalPoints(strokes: Stroke[]): number {
  return strokes.reduce((sum, s) => sum + s.points.length, 0);
}

function finalizeRound(state: PictionaryState, players: Player[]): PictionaryState {
  const scoreDeltas: Record<string, number> = {};
  state.correctGuessers.forEach((pid, rank) => {
    scoreDeltas[pid] = (scoreDeltas[pid] ?? 0) + (RANK_POINTS[rank] ?? 1);
  });
  if (state.correctGuessers.length > 0) {
    scoreDeltas[state.drawerId] = (scoreDeltas[state.drawerId] ?? 0) + state.correctGuessers.length;
  }
  void players;
  return {
    ...state,
    stage: "reveal",
    roundOver: true,
    gameOver: state.totalRounds > 0 && state.round >= state.totalRounds,
    scoreDeltas,
  };
}

function applyAction(
  state: PictionaryState,
  playerId: string,
  payload: unknown,
  players: Player[]
): PictionaryState {
  const action = payload as {
    type: string;
    word?: string;
    color?: string;
    lineWidth?: number;
    points?: unknown;
    text?: string;
  };

  if (action.type === "time_up" && state.stage === "choosing") {
    const word = state.wordChoices?.[0] ?? DRAWING_WORDS[0];
    return beginDrawing(state, word);
  }

  if (action.type === "time_up" && state.stage === "drawing") {
    return finalizeRound(state, players);
  }

  if (
    action.type === "choose_word" &&
    state.stage === "choosing" &&
    playerId === state.drawerId &&
    typeof action.word === "string" &&
    state.wordChoices?.includes(action.word)
  ) {
    return beginDrawing(state, action.word);
  }

  if (action.type === "clear_canvas" && state.stage === "drawing" && playerId === state.drawerId) {
    return { ...state, strokes: [] };
  }

  if (action.type === "start_stroke" && state.stage === "drawing" && playerId === state.drawerId) {
    const color = typeof action.color === "string" ? action.color.slice(0, 16) : "#1f2937";
    const lineWidth = typeof action.lineWidth === "number" ? Math.min(Math.max(action.lineWidth, 1), 20) : 4;
    return { ...state, strokes: [...state.strokes, { points: [], color, lineWidth }] };
  }

  if (action.type === "add_points" && state.stage === "drawing" && playerId === state.drawerId) {
    if (state.strokes.length === 0 || totalPoints(state.strokes) >= MAX_TOTAL_POINTS) return state;
    const raw = Array.isArray(action.points) ? action.points : [];
    const points: Point[] = raw
      .filter(
        (p): p is Point =>
          typeof p === "object" &&
          p !== null &&
          typeof (p as Point).x === "number" &&
          typeof (p as Point).y === "number" &&
          (p as Point).x >= 0 &&
          (p as Point).x <= 1 &&
          (p as Point).y >= 0 &&
          (p as Point).y <= 1
      )
      .slice(0, 200);
    if (points.length === 0) return state;

    const strokes = [...state.strokes];
    const last = strokes[strokes.length - 1];
    strokes[strokes.length - 1] = { ...last, points: [...last.points, ...points] };
    return { ...state, strokes };
  }

  if (action.type === "guess" && state.stage === "drawing" && playerId !== state.drawerId) {
    if (state.correctGuessers.includes(playerId)) return state;
    const text = (action.text ?? "").trim().slice(0, 60);
    if (!text) return state;

    const correct = normalize(text) === normalize(state.word ?? "");
    const guesses = [...state.guesses.slice(-(MAX_GUESS_FEED - 1)), { playerId, text, correct }];
    const correctGuessers = correct ? [...state.correctGuessers, playerId] : state.correctGuessers;
    const updated = { ...state, guesses, correctGuessers };

    const allGuessed = players
      .filter((p) => p.connected && p.id !== state.drawerId)
      .every((p) => correctGuessers.includes(p.id));

    return allGuessed ? finalizeRound(updated, players) : updated;
  }

  return state;
}

function redactState(state: PictionaryState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const isDrawer = forPlayerId === state.drawerId;
  const hasSolved = state.correctGuessers.includes(forPlayerId);
  const knowsWord = isDrawer || hasSolved || state.stage === "reveal";

  const guesses = state.guesses.map((g) => {
    // Hide the text of someone ELSE's correct guess from players who
    // haven't solved it themselves yet - otherwise guessing is just
    // copy-pasting the first person's answer. Wrong guesses stay visible
    // to everyone (that's half the fun of watching people flail).
    const reveal = g.playerId === forPlayerId || isDrawer || !g.correct || knowsWord;
    return { playerId: g.playerId, correct: g.correct, text: reveal ? g.text : null };
  });

  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    drawerId: state.drawerId,
    isDrawer,
  };

  if (state.stage === "choosing") {
    return { ...base, chooseEndsAt: state.chooseEndsAt, wordChoices: isDrawer ? state.wordChoices : null };
  }

  return {
    ...base,
    timerEndsAt: state.timerEndsAt,
    strokes: state.strokes,
    guesses,
    correctGuessers: state.correctGuessers,
    hasSolved,
    wordLength: state.word?.length ?? 0,
    word: knowsWord ? state.word : null,
  };
}

export const pictionaryModule: GameModule<PictionaryState> = {
  meta: {
    id: "pictionary",
    label: "Pictionary",
    description: "One player draws a secret word while everyone else races to guess it.",
    minPlayers: 3,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
