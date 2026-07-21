// Shared turn-order primitives for future turn-based game modes (Tic-Tac-Toe,
// Connect Four, Mancala, Battleship, ...). None of the current five modes
// are turn-based - they're all "everyone acts simultaneously each round" -
// so nothing here is used yet. It exists so a new turn-based mode imports
// this instead of reinventing turn order, and pairs with BaseBoardGameState
// (server/types.ts) for the rest of that mode's state shape.
//
// This is plain state + pure functions, not a class, so a game module keeps
// it as a field on its own state (e.g. `turn: TurnState`) alongside whatever
// board/winner fields it needs, the same way every existing module already
// stores its own extra fields beside BaseGameState.

export type TurnState = {
  order: string[];
  currentIndex: number;
  turnEndsAt: number | null;
};

export function initTurnOrder(playerIds: string[], opts: { shuffle?: boolean } = {}): TurnState {
  const order = opts.shuffle ? shuffled(playerIds) : [...playerIds];
  return { order, currentIndex: 0, turnEndsAt: null };
}

function shuffled(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function currentPlayerId(turn: TurnState): string {
  return turn.order[turn.currentIndex];
}

export function isPlayersTurn(turn: TurnState, playerId: string): boolean {
  return currentPlayerId(turn) === playerId;
}

/**
 * Advances to the next player in order, wrapping around. Players in `skip`
 * (e.g. eliminated players, or anyone disconnected) are passed over. Clears
 * any turn timeout - call withTurnTimeout again after if the mode uses one.
 * `direction` defaults to forward (1); pass -1 for a mode where play order
 * can reverse (e.g. Uno's Reverse card) - the caller owns storing which
 * direction is currently active, this just walks one step that way.
 */
export function advanceTurn(turn: TurnState, skip: string[] = [], direction: 1 | -1 = 1): TurnState {
  const total = turn.order.length;
  if (total === 0) return turn;

  let nextIndex = turn.currentIndex;
  for (let i = 0; i < total; i++) {
    nextIndex = (nextIndex + direction + total) % total;
    if (!skip.includes(turn.order[nextIndex])) break;
  }

  return { ...turn, currentIndex: nextIndex, turnEndsAt: null };
}

/**
 * Set (or refresh) a deadline for the current turn. Pair with a `time_up`
 * action and lib/useCountdown.ts client-side - see server/games/trivia.ts
 * for the exact pattern (its ANSWER_MS timer + `time_up` action do the same
 * thing for a non-turn-based mode).
 */
export function withTurnTimeout(turn: TurnState, durationMs: number): TurnState {
  return { ...turn, turnEndsAt: Date.now() + durationMs };
}

export function isTurnExpired(turn: TurnState): boolean {
  return turn.turnEndsAt !== null && Date.now() >= turn.turnEndsAt;
}
