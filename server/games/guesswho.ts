import type { BaseBoardGameState, GameModule, Player } from "../types";
import { GUESS_WHO_CHARACTERS } from "./content";
import { advanceTurn, currentPlayerId, initTurnOrder, isPlayersTurn, type TurnState } from "../turnManager";

export type GuessWhoState = BaseBoardGameState & {
  stage: "asking" | "reveal";
  secretCharacter: Record<string, string>; // playerId -> characterId (hidden from opponent)
  eliminated: Record<string, string[]>; // playerId -> characterIds they've personally crossed off
  turn: TurnState;
  wrongGuess: { playerId: string; characterId: string } | null;
};

function startRound(prev: GuessWhoState | null, players: Player[]): GuessWhoState {
  const ids = players.map((p) => p.id);
  const pool = [...GUESS_WHO_CHARACTERS];
  const secretCharacter: Record<string, string> = {};
  const eliminated: Record<string, string[]> = {};

  for (const id of ids) {
    const index = Math.floor(Math.random() * pool.length);
    secretCharacter[id] = pool[index].id;
    pool.splice(index, 1);
    eliminated[id] = [];
  }

  const turn = initTurnOrder(ids, { shuffle: true });

  return {
    stage: "asking",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: currentPlayerId(turn),
    winner: null,
    secretCharacter,
    eliminated,
    turn,
    wrongGuess: null,
  };
}

function applyAction(
  state: GuessWhoState,
  playerId: string,
  payload: unknown,
  players: Player[]
): GuessWhoState {
  const action = payload as { type: string; characterId?: string };
  if (state.stage !== "asking") return state;

  if (action.type === "toggle_eliminate" && action.characterId) {
    const mine = state.eliminated[playerId] ?? [];
    const eliminated = {
      ...state.eliminated,
      [playerId]: mine.includes(action.characterId)
        ? mine.filter((id) => id !== action.characterId)
        : [...mine, action.characterId],
    };
    return { ...state, eliminated };
  }

  if (action.type === "end_turn") {
    if (!isPlayersTurn(state.turn, playerId)) return state;
    const turn = advanceTurn(
      state.turn,
      players.filter((p) => !p.connected).map((p) => p.id)
    );
    return { ...state, turn, currentTurn: currentPlayerId(turn) };
  }

  if (action.type === "guess" && action.characterId) {
    if (!isPlayersTurn(state.turn, playerId)) return state;
    const opponent = players.find((p) => p.id !== playerId);
    if (!opponent) return state;

    const correct = state.secretCharacter[opponent.id] === action.characterId;
    if (correct) {
      return {
        ...state,
        stage: "reveal",
        roundOver: true,
        winner: playerId,
        scoreDeltas: { [playerId]: 5 },
      };
    }

    return {
      ...state,
      stage: "reveal",
      roundOver: true,
      winner: opponent.id,
      scoreDeltas: { [opponent.id]: 5 },
      wrongGuess: { playerId, characterId: action.characterId },
    };
  }

  return state;
}

function redactState(state: GuessWhoState, forPlayerId: string): BaseBoardGameState & Record<string, unknown> {
  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    currentTurn: state.currentTurn,
    winner: state.winner,
    isYourTurn: state.currentTurn === forPlayerId,
    characterPool: GUESS_WHO_CHARACTERS,
    yourCharacter: state.secretCharacter[forPlayerId] ?? null,
    eliminated: state.eliminated[forPlayerId] ?? [],
  };

  if (state.stage === "reveal") {
    const opponentId = state.turn.order.find((id) => id !== forPlayerId) ?? null;
    return {
      ...base,
      opponentCharacter: opponentId ? state.secretCharacter[opponentId] : null,
      wrongGuess: state.wrongGuess,
    };
  }

  return base;
}

export const guessWhoModule: GameModule<GuessWhoState> = {
  meta: {
    id: "guesswho",
    label: "Guess Who",
    description: "You're secretly assigned a character. Ask yes/no questions to guess your opponent's before they guess yours.",
    minPlayers: 2,
    maxPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
