import type { BaseGameState, GameModule, Player } from "../types";
import { FIB_PROMPTS, pickUnused, shuffled } from "./content";

export type FibOption = { id: string; text: string; authorId: string | null };

export type FibbingItState = BaseGameState & {
  stage: "submit" | "vote" | "reveal";
  usedIndices: number[];
  question: string;
  trueAnswer: string;
  fakeAnswers: Record<string, string>;
  options: FibOption[];
  votes: Record<string, string>;
};

function startRound(prev: FibbingItState | null, players: Player[]): FibbingItState {
  void players;
  const usedIndices = prev?.usedIndices ?? [];
  const { item, index } = pickUnused(FIB_PROMPTS, usedIndices);

  return {
    stage: "submit",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    scoreDeltas: {},
    usedIndices: [...usedIndices, index],
    question: item.question,
    trueAnswer: item.answer,
    fakeAnswers: {},
    options: [],
    votes: {},
  };
}

function buildOptions(state: FibbingItState): FibOption[] {
  const entries: FibOption[] = Object.entries(state.fakeAnswers).map(([authorId, text], i) => ({
    id: `fake-${i}`,
    text,
    authorId,
  }));
  entries.push({ id: "true", text: state.trueAnswer, authorId: null });
  return shuffled(entries);
}

function applyAction(state: FibbingItState, playerId: string, payload: unknown, players: Player[]): FibbingItState {
  const action = payload as { type: string; text?: string; optionId?: string };
  const connected = players.filter((p) => p.connected).map((p) => p.id);

  if (action.type === "submit_fake" && state.stage === "submit") {
    const text = (action.text ?? "").trim().slice(0, 80);
    if (!text || state.fakeAnswers[playerId]) return state;
    const fakeAnswers = { ...state.fakeAnswers, [playerId]: text };
    const allSubmitted = connected.every((id) => fakeAnswers[id] !== undefined);

    if (!allSubmitted) return { ...state, fakeAnswers };

    const nextState = { ...state, fakeAnswers, stage: "vote" as const };
    return { ...nextState, options: buildOptions(nextState) };
  }

  if (action.type === "vote" && state.stage === "vote" && action.optionId) {
    if (state.votes[playerId]) return state;
    const chosen = state.options.find((o) => o.id === action.optionId);
    if (!chosen || chosen.authorId === playerId) return state;

    const votes = { ...state.votes, [playerId]: action.optionId };
    const allVoted = connected.every((id) => votes[id] !== undefined);
    if (!allVoted) return { ...state, votes };

    const scoreDeltas: Record<string, number> = {};
    for (const [voterId, optionId] of Object.entries(votes)) {
      const option = state.options.find((o) => o.id === optionId);
      if (!option) continue;
      if (option.id === "true") {
        scoreDeltas[voterId] = (scoreDeltas[voterId] ?? 0) + 2;
      } else if (option.authorId) {
        scoreDeltas[option.authorId] = (scoreDeltas[option.authorId] ?? 0) + 1;
      }
    }

    return { ...state, votes, stage: "reveal", roundOver: true, scoreDeltas };
  }

  return state;
}

function redactState(state: FibbingItState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    scoreDeltas: state.scoreDeltas,
    question: state.question,
    hasSubmitted: Boolean(state.fakeAnswers[forPlayerId]),
    submittedCount: Object.keys(state.fakeAnswers).length,
    hasVoted: Boolean(state.votes[forPlayerId]),
    votedCount: Object.keys(state.votes).length,
  };

  if (state.stage === "vote") {
    return {
      ...base,
      options: state.options.map((o) => ({
        id: o.id,
        text: o.text,
        isMine: o.authorId === forPlayerId,
      })),
    };
  }

  if (state.stage === "reveal") {
    return {
      ...base,
      trueAnswer: state.trueAnswer,
      options: state.options.map((o) => ({
        id: o.id,
        text: o.text,
        authorId: o.authorId,
        isTrue: o.id === "true",
        votes: Object.entries(state.votes)
          .filter(([, optionId]) => optionId === o.id)
          .map(([voterId]) => voterId),
      })),
    };
  }

  return base;
}

export const fibbingItModule: GameModule<FibbingItState> = {
  meta: {
    id: "fibbingit",
    label: "Fibbing It",
    description: "Bluff your way to points. Write a fake answer, then guess which answer is the real one.",
    minPlayers: 3,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
