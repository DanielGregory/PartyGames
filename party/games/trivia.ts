import type { BaseGameState, GameModule, Player } from "../types";
import { TRIVIA_QUESTIONS, pickUnused } from "./content";

export type TriviaState = BaseGameState & {
  stage: "question" | "reveal";
  usedIndices: number[];
  question: string;
  choices: string[];
  correctIndex: number;
  answers: Record<string, number>;
};

function startRound(prev: TriviaState | null, players: Player[]): TriviaState {
  void players;
  const usedIndices = prev?.usedIndices ?? [];
  const { item, index } = pickUnused(TRIVIA_QUESTIONS, usedIndices);

  return {
    stage: "question",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    scoreDeltas: {},
    usedIndices: [...usedIndices, index],
    question: item.question,
    choices: item.choices,
    correctIndex: item.correctIndex,
    answers: {},
  };
}

function applyAction(state: TriviaState, playerId: string, payload: unknown, players: Player[]): TriviaState {
  const action = payload as { type: string; index?: number };
  const connected = players.filter((p) => p.connected).map((p) => p.id);

  if (action.type === "answer" && state.stage === "question" && typeof action.index === "number") {
    if (state.answers[playerId] !== undefined) return state;
    const answers = { ...state.answers, [playerId]: action.index };
    const allAnswered = connected.every((id) => answers[id] !== undefined);

    if (!allAnswered) return { ...state, answers };

    const scoreDeltas: Record<string, number> = {};
    for (const [pid, idx] of Object.entries(answers)) {
      if (idx === state.correctIndex) {
        scoreDeltas[pid] = (scoreDeltas[pid] ?? 0) + 2;
      }
    }

    return { ...state, answers, stage: "reveal", roundOver: true, scoreDeltas };
  }

  return state;
}

function redactState(state: TriviaState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    scoreDeltas: state.scoreDeltas,
    question: state.question,
    choices: state.choices,
    hasAnswered: state.answers[forPlayerId] !== undefined,
    answeredCount: Object.keys(state.answers).length,
  };

  if (state.stage === "reveal") {
    return {
      ...base,
      correctIndex: state.correctIndex,
      yourAnswer: state.answers[forPlayerId] ?? null,
      answers: state.answers,
    };
  }

  return base;
}

export const triviaModule: GameModule<TriviaState> = {
  meta: {
    id: "trivia",
    label: "Trivia",
    description: "Answer multiple-choice questions faster and more accurately than everyone else.",
    minPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
