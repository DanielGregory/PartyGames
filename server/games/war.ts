import type { BaseBoardGameState, GameModule, Player } from "../types";
import { shuffled, standardDeck, type PlayingCard, type Rank } from "../cards";

// War has no player decisions at all beyond "flip" - both piles are hidden
// from the opponent, but nothing about who plays which card is chosen, so a
// single "flip" action fully resolves one battle (including any tie-break
// war chain) rather than needing the turn-by-turn machinery the other card
// games use.

// Strict ascending rank order for comparing cards in a battle. Distinct from
// server/cards.ts's rankValue (Blackjack-style, where J/Q/K all collapse to
// 10) - War needs every rank distinguishable.
const RANK_ORDER: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  J: 11, Q: 12, K: 13, A: 14,
};

export type WarState = BaseBoardGameState & {
  stage: "battle" | "reveal";
  playerIds: [string, string];
  piles: Record<string, PlayingCard[]>; // front (index 0) is the next card to flip
  lastBattle: {
    cards: Record<string, PlayingCard[]>; // every card each side put down this battle (>2 each during a war chain)
    winner: string;
    warChain: boolean;
  } | null;
};

function startRound(prev: WarState | null, players: Player[]): WarState {
  const ids = players.map((p) => p.id) as [string, string];
  const deck = shuffled(standardDeck());
  const half = Math.ceil(deck.length / 2);

  return {
    stage: "battle",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: null,
    winner: null,
    playerIds: ids,
    piles: {
      [ids[0]]: deck.slice(0, half),
      [ids[1]]: deck.slice(half),
    },
    lastBattle: null,
  };
}

function settleBattle(
  state: WarState,
  a: string,
  b: string,
  pileA: PlayingCard[],
  pileB: PlayingCard[],
  cardsA: PlayingCard[],
  cardsB: PlayingCard[],
  winner: string,
  warChain: boolean
): WarState {
  const captured = shuffled([...cardsA, ...cardsB]);
  const piles = { ...state.piles };
  if (winner === a) {
    piles[a] = [...pileA, ...captured];
    piles[b] = pileB;
  } else {
    piles[b] = [...pileB, ...captured];
    piles[a] = pileA;
  }

  const lastBattle = { cards: { [a]: cardsA, [b]: cardsB }, winner, warChain };
  const loser = winner === a ? b : a;
  const gameOver = piles[loser].length === 0;

  if (gameOver) {
    return {
      ...state,
      piles,
      lastBattle,
      stage: "reveal",
      roundOver: true,
      gameOver: true,
      winner,
      scoreDeltas: { [winner]: 1 },
    };
  }

  return { ...state, piles, lastBattle };
}

function playBattle(state: WarState): WarState {
  const [a, b] = state.playerIds;
  const pileA = [...state.piles[a]];
  const pileB = [...state.piles[b]];
  const cardsA: PlayingCard[] = [];
  const cardsB: PlayingCard[] = [];
  let warChain = false;

  // Shuffling captured cards back into the winner's pile (instead of a fixed
  // order) makes a true infinite loop astronomically unlikely, but a hard
  // cap keeps a single action call from ever hanging regardless.
  for (let guard = 0; guard < 1000; guard++) {
    if (pileA.length === 0) return settleBattle(state, a, b, pileA, pileB, cardsA, cardsB, b, warChain);
    if (pileB.length === 0) return settleBattle(state, a, b, pileA, pileB, cardsA, cardsB, a, warChain);

    const faceUpA = pileA.shift()!;
    const faceUpB = pileB.shift()!;
    cardsA.push(faceUpA);
    cardsB.push(faceUpB);

    const cmp = RANK_ORDER[faceUpA.rank] - RANK_ORDER[faceUpB.rank];
    if (cmp > 0) return settleBattle(state, a, b, pileA, pileB, cardsA, cardsB, a, warChain);
    if (cmp < 0) return settleBattle(state, a, b, pileA, pileB, cardsA, cardsB, b, warChain);

    // Tie: each side burns up to 3 cards face-down (fewer if they're running
    // low - if that leaves them with nothing to flip face-up, the emptiness
    // check at the top of the next iteration ends the war for them).
    warChain = true;
    for (let i = 0; i < 3; i++) {
      if (pileA.length > 0) cardsA.push(pileA.shift()!);
      if (pileB.length > 0) cardsB.push(pileB.shift()!);
    }
  }

  // Unreachable in practice (see guard comment above); satisfies the return type.
  return { ...state, stage: "reveal", roundOver: true, gameOver: true, winner: null, scoreDeltas: {} };
}

function applyAction(state: WarState, playerId: string, payload: unknown): WarState {
  const action = payload as { type: string };
  if (state.stage !== "battle") return state;
  if (!state.playerIds.includes(playerId)) return state;
  if (action.type !== "flip") return state;
  return playBattle(state);
}

function redactState(state: WarState, forPlayerId: string): BaseBoardGameState & Record<string, unknown> {
  const [a, b] = state.playerIds;
  const opponent = forPlayerId === a ? b : a;
  return {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    currentTurn: state.currentTurn,
    winner: state.winner,
    playerIds: state.playerIds,
    yourCardCount: state.piles[forPlayerId]?.length ?? 0,
    opponentCardCount: state.piles[opponent]?.length ?? 0,
    lastBattle: state.lastBattle,
  };
}

export const warModule: GameModule<WarState> = {
  meta: {
    id: "war",
    label: "War",
    description: "Flip your top card each battle - highest card wins both. Ties trigger a War: three face-down, one face-up.",
    minPlayers: 2,
    maxPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
