import type { BaseBoardGameState, GameModule, Player } from "../types";
import { advanceTurn, currentPlayerId, isPlayersTurn, type TurnState } from "../turnManager";
import { createDeck, drawCards, rankValue, standardDeck, type Deck, type PlayingCard } from "../cards";

// No real betting integration - every hand antes a fixed stake, win/lose/push
// pays out relative to it (a natural blackjack pays the standard 3:2 bonus).
// scoreDeltas each hand *is* the platform's chip/points system: it's the
// same mechanism every other mode uses to report round results.
const STAKE = 10;

type HandStatus = "playing" | "stood" | "bust" | "blackjack";

export type BlackjackState = BaseBoardGameState & {
  stage: "playing" | "reveal";
  totalRounds: number;
  deck: Deck<PlayingCard>;
  playerIds: string[];
  hands: Record<string, PlayingCard[]>;
  statuses: Record<string, HandStatus>;
  dealerHand: PlayingCard[];
  dealerRevealed: boolean;
  turn: TurnState;
};

export function handValue(cards: PlayingCard[]): number {
  let total = cards.reduce((sum, c) => sum + rankValue(c.rank), 0);
  let aces = cards.filter((c) => c.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function dealOne(deck: Deck<PlayingCard>): { card: PlayingCard | null; deck: Deck<PlayingCard> } {
  const { cards, deck: next } = drawCards(deck, 1);
  return { card: cards[0] ?? null, deck: next };
}

function startRound(
  prev: BlackjackState | null,
  players: Player[],
  config?: Record<string, unknown>
): BlackjackState {
  const ids = players.map((p) => p.id);
  const totalRounds = prev?.totalRounds ?? (typeof config?.rounds === "number" ? config.rounds : 0);

  let deck = createDeck(standardDeck());
  const hands: Record<string, PlayingCard[]> = Object.fromEntries(ids.map((id) => [id, []]));
  let dealerHand: PlayingCard[] = [];

  for (let i = 0; i < 2; i++) {
    for (const id of ids) {
      const { card, deck: nd } = dealOne(deck);
      deck = nd;
      if (card) hands[id] = [...hands[id], card];
    }
    const { card, deck: nd2 } = dealOne(deck);
    deck = nd2;
    if (card) dealerHand = [...dealerHand, card];
  }

  const statuses: Record<string, HandStatus> = {};
  for (const id of ids) statuses[id] = handValue(hands[id]) === 21 ? "blackjack" : "playing";

  const disconnected = players.filter((p) => !p.connected).map((p) => p.id);
  const seatOrder = shuffledOrder(ids);
  const firstIndex = seatOrder.findIndex((id) => statuses[id] === "playing" && !disconnected.includes(id));

  const turn: TurnState = { order: seatOrder, currentIndex: Math.max(firstIndex, 0), turnEndsAt: null };

  const state: BlackjackState = {
    stage: "playing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: firstIndex === -1 ? null : currentPlayerId(turn),
    winner: null,
    totalRounds,
    deck,
    playerIds: ids,
    hands,
    statuses,
    dealerHand,
    dealerRevealed: false,
    turn,
  };

  return firstIndex === -1 ? resolveDealer(state) : state;
}

function shuffledOrder(ids: string[]): string[] {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function advanceOrResolve(state: BlackjackState, players: Player[]): BlackjackState {
  const disconnected = players.filter((p) => !p.connected).map((p) => p.id);
  const stillPlaying = state.playerIds.filter(
    (id) => state.statuses[id] === "playing" && !disconnected.includes(id)
  );
  if (stillPlaying.length === 0) return resolveDealer(state);

  const skip = state.playerIds.filter((id) => state.statuses[id] !== "playing").concat(disconnected);
  const turn = advanceTurn(state.turn, skip);
  return { ...state, turn, currentTurn: currentPlayerId(turn) };
}

function resolveDealer(state: BlackjackState): BlackjackState {
  const originalDealerHand = state.dealerHand;
  let deck = state.deck;
  let dealerHand = [...originalDealerHand];

  while (handValue(dealerHand) < 17) {
    const { card, deck: nd } = dealOne(deck);
    deck = nd;
    if (!card) break;
    dealerHand = [...dealerHand, card];
  }

  const dealerTotal = handValue(dealerHand);
  const dealerBust = dealerTotal > 21;
  const dealerBlackjack = originalDealerHand.length === 2 && handValue(originalDealerHand) === 21;

  const scoreDeltas: Record<string, number> = {};
  for (const id of state.playerIds) {
    const status = state.statuses[id];
    if (status === "bust") {
      scoreDeltas[id] = -STAKE;
      continue;
    }
    if (dealerBlackjack) {
      scoreDeltas[id] = status === "blackjack" ? 0 : -STAKE;
      continue;
    }
    if (status === "blackjack") {
      scoreDeltas[id] = Math.round(STAKE * 1.5);
      continue;
    }
    const total = handValue(state.hands[id]);
    if (dealerBust || total > dealerTotal) scoreDeltas[id] = STAKE;
    else if (total === dealerTotal) scoreDeltas[id] = 0;
    else scoreDeltas[id] = -STAKE;
  }

  return {
    ...state,
    deck,
    dealerHand,
    dealerRevealed: true,
    stage: "reveal",
    roundOver: true,
    gameOver: state.totalRounds > 0 && state.round >= state.totalRounds,
    scoreDeltas,
    currentTurn: null,
  };
}

function applyAction(state: BlackjackState, playerId: string, payload: unknown, players: Player[]): BlackjackState {
  const action = payload as { type: string };
  if (state.stage !== "playing") return state;
  if (!isPlayersTurn(state.turn, playerId)) return state;
  if (state.statuses[playerId] !== "playing") return state;

  if (action.type === "hit") {
    const { card, deck } = dealOne(state.deck);
    if (!card) return state;
    const hand = [...state.hands[playerId], card];
    const total = handValue(hand);
    const statuses = { ...state.statuses };
    if (total > 21) statuses[playerId] = "bust";
    else if (total === 21) statuses[playerId] = "stood"; // maxed out, nothing left to decide
    const hands = { ...state.hands, [playerId]: hand };
    const next = { ...state, deck, hands, statuses };
    return statuses[playerId] === "playing" ? next : advanceOrResolve(next, players);
  }

  if (action.type === "stand") {
    const statuses = { ...state.statuses, [playerId]: "stood" as const };
    return advanceOrResolve({ ...state, statuses }, players);
  }

  return state;
}

function redactState(state: BlackjackState, forPlayerId: string): BaseBoardGameState & Record<string, unknown> {
  return {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    currentTurn: state.currentTurn,
    winner: null,
    stake: STAKE,
    playerIds: state.playerIds,
    hands: state.hands,
    statuses: state.statuses,
    // Player hands are public at a real table - only the dealer's hole card
    // is hidden, and only until everyone's finished acting.
    dealerHand: state.dealerRevealed ? state.dealerHand : state.dealerHand.slice(0, 1),
    dealerRevealed: state.dealerRevealed,
    dealerTotal: state.dealerRevealed ? handValue(state.dealerHand) : null,
    isYourTurn: forPlayerId === state.currentTurn,
  };
}

export const blackjackModule: GameModule<BlackjackState> = {
  meta: {
    id: "blackjack",
    label: "Blackjack",
    description: "Beat the dealer without going over 21. Hit, stand, and hope for a natural blackjack.",
    minPlayers: 1,
    maxPlayers: 6,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
