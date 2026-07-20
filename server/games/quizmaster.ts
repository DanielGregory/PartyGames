import type { BaseGameState, GameModule, Player } from "../types";

const MAX_QUESTION_LEN = 150;
const MAX_ANSWER_LEN = 80;

export type QuizMasterState = BaseGameState & {
  stage: "ask" | "guess" | "judge" | "reveal";
  askerId: string;
  askedHistory: string[];
  question: string | null;
  correctAnswer: string | null;
  guesses: Record<string, string>;
  judgments: Record<string, boolean>;
};

function pickNextAsker(players: Player[], askedHistory: string[]): { askerId: string; history: string[] } {
  const candidates = players.filter((p) => !askedHistory.includes(p.id));
  const pool = candidates.length > 0 ? candidates : players;
  const asker = pool[Math.floor(Math.random() * pool.length)];
  const history = candidates.length > 0 ? [...askedHistory, asker.id] : [asker.id];
  return { askerId: asker.id, history };
}

function startRound(prev: QuizMasterState | null, players: Player[]): QuizMasterState {
  const { askerId, history } = pickNextAsker(players, prev?.askedHistory ?? []);

  return {
    stage: "ask",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    askerId,
    askedHistory: history,
    question: null,
    correctAnswer: null,
    guesses: {},
    judgments: {},
  };
}

function requiredGuessers(state: QuizMasterState, players: Player[]): string[] {
  return players.filter((p) => p.connected && p.id !== state.askerId).map((p) => p.id);
}

function applyAction(
  state: QuizMasterState,
  playerId: string,
  payload: unknown,
  players: Player[]
): QuizMasterState {
  const action = payload as {
    type: string;
    question?: string;
    answer?: string;
    text?: string;
    guesserId?: string;
    correct?: boolean;
  };

  if (
    action.type === "submit_question" &&
    state.stage === "ask" &&
    playerId === state.askerId
  ) {
    const question = (action.question ?? "").trim().slice(0, MAX_QUESTION_LEN);
    const correctAnswer = (action.answer ?? "").trim().slice(0, MAX_ANSWER_LEN);
    if (!question || !correctAnswer) return state;
    return { ...state, question, correctAnswer, stage: "guess" };
  }

  if (
    action.type === "submit_guess" &&
    state.stage === "guess" &&
    playerId !== state.askerId
  ) {
    if (state.guesses[playerId] !== undefined) return state;
    const text = (action.text ?? "").trim().slice(0, MAX_ANSWER_LEN);
    if (!text) return state;
    const guesses = { ...state.guesses, [playerId]: text };
    const allGuessed = requiredGuessers(state, players).every((id) => guesses[id] !== undefined);
    return {
      ...state,
      guesses,
      stage: allGuessed ? "judge" : state.stage,
    };
  }

  if (
    action.type === "judge" &&
    state.stage === "judge" &&
    playerId === state.askerId &&
    action.guesserId &&
    typeof action.correct === "boolean"
  ) {
    if (state.guesses[action.guesserId] === undefined) return state;
    return { ...state, judgments: { ...state.judgments, [action.guesserId]: action.correct } };
  }

  if (action.type === "finish_judging" && state.stage === "judge" && playerId === state.askerId) {
    const scoreDeltas: Record<string, number> = {};
    let correctCount = 0;
    for (const [guesserId, correct] of Object.entries(state.judgments)) {
      if (correct) {
        scoreDeltas[guesserId] = (scoreDeltas[guesserId] ?? 0) + 2;
        correctCount += 1;
      }
    }
    if (correctCount > 0) {
      scoreDeltas[state.askerId] = (scoreDeltas[state.askerId] ?? 0) + correctCount;
    }
    return { ...state, stage: "reveal", roundOver: true, scoreDeltas };
  }

  return state;
}

function redactState(state: QuizMasterState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const isAsker = forPlayerId === state.askerId;
  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    askerId: state.askerId,
    isAsker,
  };

  if (state.stage === "ask") {
    return base;
  }

  if (state.stage === "guess") {
    return {
      ...base,
      question: state.question,
      hasGuessed: state.guesses[forPlayerId] !== undefined,
      guessedCount: Object.keys(state.guesses).length,
    };
  }

  if (state.stage === "judge") {
    return {
      ...base,
      question: state.question,
      correctAnswer: isAsker ? state.correctAnswer : null,
      yourGuess: state.guesses[forPlayerId] ?? null,
      guesses: isAsker ? state.guesses : {},
      judgments: isAsker ? state.judgments : {},
    };
  }

  // reveal
  return {
    ...base,
    question: state.question,
    correctAnswer: state.correctAnswer,
    guesses: state.guesses,
    judgments: state.judgments,
  };
}

export const quizMasterModule: GameModule<QuizMasterState> = {
  meta: {
    id: "quizmaster",
    label: "Quiz Master",
    description:
      "One player writes a question and the answer. Everyone else guesses, then the quiz master decides who's right.",
    minPlayers: 3,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
