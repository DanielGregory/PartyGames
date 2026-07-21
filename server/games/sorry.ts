import type { BaseBoardGameState, GameModule, Player } from "../types";
import { advanceTurn, currentPlayerId, initTurnOrder, isPlayersTurn, type TurnState } from "../turnManager";

// A simplified but faithful Sorry!: one shared loop track split evenly
// among however many players are seated (24 divides cleanly by 2, 3, or
// 4), each with a private 5-square safety zone peeled off just before
// their own start square - exactly where the real board's safety zone
// sits, just with a shorter loop so games move faster.
const TRACK_LENGTH = 24;
const SAFETY_LENGTH = 5;
const HOME_PROGRESS = TRACK_LENGTH + SAFETY_LENGTH; // reaching this means home
const PAWNS_PER_PLAYER = 4;
const START_PROGRESS = -1;
const WIN_POINTS = 5;

export type CardValue = 1 | 2 | 3 | 4 | 5 | 7 | 8 | 10 | 11 | 12 | "sorry";

// Rough approximation of the real 45-card deck's frequencies. Drawn with
// replacement each turn rather than a depleting/reshuffling deck - keeps
// state simple without changing the moment-to-moment feel much.
const CARD_POOL: CardValue[] = [
  1, 1, 1, 1, 1,
  2, 2, 2, 2,
  3, 3, 3, 3,
  4, 4, 4,
  5, 5, 5, 5,
  7, 7, 7, 7,
  8, 8, 8, 8,
  10, 10, 10,
  11, 11, 11,
  12, 12, 12,
  "sorry", "sorry", "sorry", "sorry",
];

export type PawnState = { progress: number }; // -1 start, 0..TRACK_LENGTH-1 main loop, ..+SAFETY_LENGTH-1 safety, HOME_PROGRESS home

export type LegalMove = {
  pawnIndex: number;
  newProgress: number;
  bump?: { playerId: string; pawnIndex: number };
  swap?: { playerId: string; pawnIndex: number; newProgress: number };
};

export type SorryState = BaseBoardGameState & {
  stage: "playing" | "reveal";
  colorOffsets: Record<string, number>;
  pawns: Record<string, PawnState[]>;
  currentCard: CardValue | null;
  turn: TurnState;
};

function drawCard(): CardValue {
  return CARD_POOL[Math.floor(Math.random() * CARD_POOL.length)];
}

function isOnMainLoop(progress: number): boolean {
  return progress >= 0 && progress < TRACK_LENGTH;
}

function absoluteOf(offset: number, progress: number): number | null {
  if (!isOnMainLoop(progress)) return null;
  return (offset + progress) % TRACK_LENGTH;
}

function relativeOf(offset: number, abs: number): number {
  return (abs - offset + TRACK_LENGTH) % TRACK_LENGTH;
}

function ownPawnAt(pawns: PawnState[], excludeIndex: number, progress: number): boolean {
  return pawns.some((p, i) => i !== excludeIndex && p.progress === progress);
}

function opponentPawnAtAbsolute(
  pawns: Record<string, PawnState[]>,
  offsets: Record<string, number>,
  forPlayerId: string,
  abs: number
): { playerId: string; pawnIndex: number } | null {
  for (const [pid, list] of Object.entries(pawns)) {
    if (pid === forPlayerId) continue;
    for (let i = 0; i < list.length; i++) {
      if (absoluteOf(offsets[pid], list[i].progress) === abs) return { playerId: pid, pawnIndex: i };
    }
  }
  return null;
}

/** Every legal way `playerId` can play `card` right now - which pawn, where
 * it ends up, and what (if anything) that bumps or swaps with. The client
 * renders these directly rather than re-implementing card rules. */
export function legalMoves(
  pawns: Record<string, PawnState[]>,
  offsets: Record<string, number>,
  playerId: string,
  card: CardValue
): LegalMove[] {
  const myPawns = pawns[playerId];
  const offset = offsets[playerId];
  const moves: LegalMove[] = [];

  function tryAdvance(pawnIndex: number, amount: number) {
    const cur = myPawns[pawnIndex].progress;
    if (cur < 0 || cur >= HOME_PROGRESS) return;
    const dest = cur + amount;
    if (dest > HOME_PROGRESS) return;
    // Home holds all 4 pawns at once - it's not a single occupied square,
    // so the self-block check only applies short of actually reaching it.
    if (dest !== HOME_PROGRESS && ownPawnAt(myPawns, pawnIndex, dest)) return;
    const abs = absoluteOf(offset, dest);
    const bump = abs !== null ? (opponentPawnAtAbsolute(pawns, offsets, playerId, abs) ?? undefined) : undefined;
    moves.push({ pawnIndex, newProgress: dest, bump });
  }

  function tryExit(pawnIndex: number) {
    if (myPawns[pawnIndex].progress !== START_PROGRESS) return;
    if (ownPawnAt(myPawns, pawnIndex, 0)) return;
    const abs = absoluteOf(offset, 0)!;
    const bump = opponentPawnAtAbsolute(pawns, offsets, playerId, abs) ?? undefined;
    moves.push({ pawnIndex, newProgress: 0, bump });
  }

  if (card === 1 || card === 2) {
    myPawns.forEach((_, i) => tryExit(i));
    myPawns.forEach((_, i) => tryAdvance(i, card));
  } else if (card === 11) {
    myPawns.forEach((_, i) => tryAdvance(i, 11));
    myPawns.forEach((p, i) => {
      if (!isOnMainLoop(p.progress)) return;
      const abs = absoluteOf(offset, p.progress)!;
      for (const [pid, oppPawns] of Object.entries(pawns)) {
        if (pid === playerId) continue;
        const oppOffset = offsets[pid];
        oppPawns.forEach((op, oi) => {
          if (!isOnMainLoop(op.progress)) return;
          const oppAbs = absoluteOf(oppOffset, op.progress)!;
          moves.push({
            pawnIndex: i,
            newProgress: relativeOf(offset, oppAbs),
            swap: { playerId: pid, pawnIndex: oi, newProgress: relativeOf(oppOffset, abs) },
          });
        });
      }
    });
  } else if (card === "sorry") {
    const startPawns = myPawns.map((p, i) => (p.progress === START_PROGRESS ? i : -1)).filter((i) => i >= 0);
    if (startPawns.length > 0) {
      for (const [pid, oppPawns] of Object.entries(pawns)) {
        if (pid === playerId) continue;
        const oppOffset = offsets[pid];
        oppPawns.forEach((op, oi) => {
          if (!isOnMainLoop(op.progress)) return;
          const abs = absoluteOf(oppOffset, op.progress)!;
          const newProgress = relativeOf(offset, abs);
          for (const pawnIndex of startPawns) {
            moves.push({ pawnIndex, newProgress, bump: { playerId: pid, pawnIndex: oi } });
          }
        });
      }
    }
  } else {
    myPawns.forEach((_, i) => tryAdvance(i, card));
  }

  return moves;
}

function applyMove(
  pawns: Record<string, PawnState[]>,
  playerId: string,
  move: LegalMove
): Record<string, PawnState[]> {
  const next = { ...pawns };
  const mine = [...next[playerId]];
  mine[move.pawnIndex] = { progress: move.newProgress };
  next[playerId] = mine;

  if (move.bump) {
    const theirs = [...next[move.bump.playerId]];
    theirs[move.bump.pawnIndex] = { progress: START_PROGRESS };
    next[move.bump.playerId] = theirs;
  }
  if (move.swap) {
    const theirs = [...next[move.swap.playerId]];
    theirs[move.swap.pawnIndex] = { progress: move.swap.newProgress };
    next[move.swap.playerId] = theirs;
  }
  return next;
}

/** Draws for whoever's turn it is; if they have no legal move with that
 * card, advances and tries the next player instead - the Turn Manager
 * auto-skip the spec calls for. Early in a game, with everyone's pawns
 * still in start, only 1/2/sorry cards are usable at all (and sorry needs
 * an opponent already on the board, so effectively just 1/2 - roughly a
 * quarter of the deck), so a real losing streak of a dozen+ draws in a row
 * happens often enough to matter. The cap is just a backstop against a
 * truly pathological all-stuck board, not a realistic ceiling. */
function beginTurn(state: SorryState, players: Player[]): SorryState {
  let turn = state.turn;
  let card: CardValue | null = null;
  const disconnected = players.filter((p) => !p.connected).map((p) => p.id);
  const maxAttempts = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pid = currentPlayerId(turn);
    const drawn = drawCard();
    if (legalMoves(state.pawns, state.colorOffsets, pid, drawn).length > 0) {
      card = drawn;
      break;
    }
    turn = advanceTurn(turn, disconnected);
  }

  return { ...state, turn, currentCard: card, currentTurn: currentPlayerId(turn) };
}

function startRound(prev: SorryState | null, players: Player[]): SorryState {
  const ids = players.map((p) => p.id);
  const spacing = TRACK_LENGTH / ids.length;
  const colorOffsets = Object.fromEntries(ids.map((id, i) => [id, i * spacing]));
  const pawns = Object.fromEntries(
    ids.map((id) => [id, Array.from({ length: PAWNS_PER_PLAYER }, () => ({ progress: START_PROGRESS }))])
  );
  const turn = initTurnOrder(ids, { shuffle: true });

  const base: SorryState = {
    stage: "playing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: currentPlayerId(turn),
    winner: null,
    colorOffsets,
    pawns,
    currentCard: null,
    turn,
  };

  return beginTurn(base, players);
}

function applyAction(
  state: SorryState,
  playerId: string,
  payload: unknown,
  players: Player[]
): SorryState {
  const action = payload as {
    type: string;
    pawnIndex?: number;
    targetPlayerId?: string;
    targetPawnIndex?: number;
  };

  if (state.stage !== "playing" || !isPlayersTurn(state.turn, playerId) || state.currentCard === null) {
    return state;
  }
  if (action.type !== "play_card" || typeof action.pawnIndex !== "number") return state;

  const card = state.currentCard;
  const moves = legalMoves(state.pawns, state.colorOffsets, playerId, card);

  const match = moves.find((m) => {
    if (m.pawnIndex !== action.pawnIndex) return false;
    // Plain cards (including exits) have exactly one destination per pawn -
    // any bump there is incidental, not a choice, so pawnIndex alone is
    // unambiguous. Card 11 is a real choice between one plain advance and a
    // swap per opponent pawn on the board; "sorry" is always a bump choice
    // among whichever opponent pawns are on the board. Both need the client
    // to say which target it meant.
    if (card === 11) {
      if (action.targetPlayerId === undefined) return !m.swap;
      return m.swap?.playerId === action.targetPlayerId && m.swap?.pawnIndex === action.targetPawnIndex;
    }
    if (card === "sorry") {
      return m.bump?.playerId === action.targetPlayerId && m.bump?.pawnIndex === action.targetPawnIndex;
    }
    return true;
  });
  if (!match) return state;

  const pawns = applyMove(state.pawns, playerId, match);
  let next: SorryState = { ...state, pawns, currentCard: null };

  if (pawns[playerId].every((p) => p.progress === HOME_PROGRESS)) {
    return { ...next, stage: "reveal", roundOver: true, gameOver: true, winner: playerId, scoreDeltas: { [playerId]: WIN_POINTS } };
  }

  if (card !== 2) {
    const turn = advanceTurn(
      next.turn,
      players.filter((p) => !p.connected).map((p) => p.id)
    );
    next = { ...next, turn, currentTurn: currentPlayerId(turn) };
  }

  return beginTurn(next, players);
}

function redactState(state: SorryState, forPlayerId: string): BaseBoardGameState & Record<string, unknown> {
  const isYourTurn = forPlayerId === state.currentTurn;
  return {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    currentTurn: state.currentTurn,
    winner: state.winner,
    trackLength: TRACK_LENGTH,
    safetyLength: SAFETY_LENGTH,
    colorOffsets: state.colorOffsets,
    pawns: state.pawns,
    isYourTurn,
    yourCard: isYourTurn ? state.currentCard : null,
    hasCard: state.currentCard !== null,
    legalMoves: isYourTurn && state.currentCard !== null
      ? legalMoves(state.pawns, state.colorOffsets, forPlayerId, state.currentCard)
      : [],
    players: state.turn.order,
  };
}

export const sorryModule: GameModule<SorryState> = {
  meta: {
    id: "sorry",
    label: "Sorry!",
    description: "Race your 4 pawns around the board and home - bump opponents back to start along the way.",
    minPlayers: 2,
    maxPlayers: 4,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
