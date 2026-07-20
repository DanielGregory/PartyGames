import type { BaseGameState, GameModule, Player } from "../types";
import { LOCATIONS, pickUnused } from "./content";

const DISCUSSION_MS = 8 * 60 * 1000;

export type SpyfallState = BaseGameState & {
  stage: "discussion" | "voting" | "reveal";
  usedIndices: number[];
  totalRounds: number; // 0 means no cap - host ends the game manually
  discussionMs: number;
  location: string;
  spyId: string;
  roles: Record<string, string>;
  timerEndsAt: number;
  votes: Record<string, string>;
  result: { spyId: string; location: string; votes: Record<string, string>; spyCaught: boolean } | null;
};

function startRound(
  prev: SpyfallState | null,
  players: Player[],
  config?: Record<string, unknown>
): SpyfallState {
  const usedIndices = prev?.usedIndices ?? [];
  const { item, index } = pickUnused(LOCATIONS, usedIndices);
  const totalRounds = prev?.totalRounds ?? (typeof config?.rounds === "number" ? config.rounds : 0);
  const discussionMs =
    prev?.discussionMs ??
    (typeof config?.discussionMinutes === "number" ? config.discussionMinutes * 60 * 1000 : DISCUSSION_MS);
  const spy = players[Math.floor(Math.random() * players.length)];
  const others = players.filter((p) => p.id !== spy.id);
  const shuffledRoles = [...item.roles];
  for (let i = shuffledRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
  }
  const roles: Record<string, string> = {};
  others.forEach((p, i) => {
    roles[p.id] = shuffledRoles[i % shuffledRoles.length];
  });

  return {
    stage: "discussion",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    usedIndices: [...usedIndices, index],
    totalRounds,
    discussionMs,
    location: item.name,
    spyId: spy.id,
    roles,
    timerEndsAt: Date.now() + discussionMs,
    votes: {},
    result: null,
  };
}

function applyAction(state: SpyfallState, playerId: string, payload: unknown, players: Player[]): SpyfallState {
  const action = payload as { type: string; targetId?: string };

  if (action.type === "advance_to_vote" && state.stage === "discussion") {
    return { ...state, stage: "voting" };
  }

  if (action.type === "vote" && state.stage === "voting" && action.targetId) {
    if (state.votes[playerId]) return state;
    const votes = { ...state.votes, [playerId]: action.targetId };
    const connected = players.filter((p) => p.connected).map((p) => p.id);
    const allVoted = connected.every((id) => votes[id] !== undefined);

    if (!allVoted) {
      return { ...state, votes };
    }

    const tally: Record<string, number> = {};
    for (const target of Object.values(votes)) {
      tally[target] = (tally[target] ?? 0) + 1;
    }
    let topId: string | null = null;
    let topCount = -1;
    for (const [id, count] of Object.entries(tally)) {
      if (count > topCount) {
        topCount = count;
        topId = id;
      }
    }
    const spyCaught = topId === state.spyId;

    const scoreDeltas: Record<string, number> = {};
    for (const [voterId, targetId] of Object.entries(votes)) {
      if (targetId === state.spyId) {
        scoreDeltas[voterId] = (scoreDeltas[voterId] ?? 0) + 1;
      }
    }
    if (!spyCaught) {
      scoreDeltas[state.spyId] = (scoreDeltas[state.spyId] ?? 0) + 2;
    }

    return {
      ...state,
      votes,
      stage: "reveal",
      roundOver: true,
      gameOver: state.totalRounds > 0 && state.round >= state.totalRounds,
      scoreDeltas,
      result: { spyId: state.spyId, location: state.location, votes, spyCaught },
    };
  }

  return state;
}

function redactState(state: SpyfallState, forPlayerId: string): BaseGameState & Record<string, unknown> {
  const isSpy = forPlayerId === state.spyId;
  const votedCount = Object.keys(state.votes).length;

  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    isSpy,
    role: isSpy ? null : state.roles[forPlayerId] ?? null,
    location: state.stage === "reveal" ? state.location : isSpy ? null : state.location,
    timerEndsAt: state.timerEndsAt,
    votedCount,
    hasVoted: Boolean(state.votes[forPlayerId]),
  };

  if (state.stage === "reveal" && state.result) {
    return { ...base, result: state.result, allLocations: LOCATIONS.map((l) => l.name) };
  }

  return { ...base, allLocations: LOCATIONS.map((l) => l.name) };
}

export const spyfallModule: GameModule<SpyfallState> = {
  meta: {
    id: "spyfall",
    label: "Spyfall",
    description: "Everyone shares a secret location except one spy. Discuss in person, then vote out the spy.",
    minPlayers: 3,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
