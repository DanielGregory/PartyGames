import type { BaseGameState, GameModule, Player } from "../types";
import { MOST_LIKELY_PROMPTS, pickUnused } from "./content";

export type MostLikelyState = BaseGameState & {
  stage: "vote" | "reveal";
  usedIndices: number[];
  prompt: string;
  votes: Record<string, string>;
  winners: string[];
};

function startRound(prev: MostLikelyState | null, players: Player[]): MostLikelyState {
  void players;
  const usedIndices = prev?.usedIndices ?? [];
  const { item, index } = pickUnused(MOST_LIKELY_PROMPTS, usedIndices);

  return {
    stage: "vote",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    usedIndices: [...usedIndices, index],
    prompt: item,
    votes: {},
    winners: [],
  };
}

function applyAction(state: MostLikelyState, playerId: string, payload: unknown, players: Player[]): MostLikelyState {
  const action = payload as { type: string; targetId?: string };
  const connected = players.filter((p) => p.connected).map((p) => p.id);

  if (action.type === "vote" && state.stage === "vote" && action.targetId) {
    if (action.targetId === playerId || state.votes[playerId]) return state;

    const votes = { ...state.votes, [playerId]: action.targetId };
    const allVoted = connected.every((id) => votes[id] !== undefined);
    if (!allVoted) return { ...state, votes };

    const tally: Record<string, number> = {};
    for (const target of Object.values(votes)) {
      tally[target] = (tally[target] ?? 0) + 1;
    }
    const topCount = Math.max(0, ...Object.values(tally));
    const winners = Object.entries(tally)
      .filter(([, count]) => count === topCount)
      .map(([id]) => id);

    const scoreDeltas: Record<string, number> = {};
    for (const id of winners) {
      scoreDeltas[id] = (scoreDeltas[id] ?? 0) + 1;
    }

    return { ...state, votes, stage: "reveal", roundOver: true, scoreDeltas, winners };
  }

  return state;
}

function redactState(state: MostLikelyState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    prompt: state.prompt,
    hasVoted: Boolean(state.votes[forPlayerId]),
    votedCount: Object.keys(state.votes).length,
  };

  if (state.stage === "reveal") {
    return { ...base, votes: state.votes, winners: state.winners };
  }

  return base;
}

export const mostLikelyModule: GameModule<MostLikelyState> = {
  meta: {
    id: "mostlikely",
    label: "Most Likely To",
    description: "Vote for the player most likely to... and see the results live.",
    minPlayers: 3,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
