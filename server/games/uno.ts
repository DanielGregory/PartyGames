import type { BaseBoardGameState, GameModule, Player } from "../types";
import { createDeck, discardCard, drawCards, topOfDiscard, type Deck } from "../cards";
import { advanceTurn, currentPlayerId, initTurnOrder, isPlayersTurn, type TurnState } from "../turnManager";

const HAND_SIZE = 7;
const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];

export type UnoColor = "red" | "yellow" | "green" | "blue";

export type UnoCard = { id: string } & (
  | { kind: "number"; color: UnoColor; value: number }
  | { kind: "skip"; color: UnoColor }
  | { kind: "reverse"; color: UnoColor }
  | { kind: "drawTwo"; color: UnoColor }
  | { kind: "wild" }
  | { kind: "wildDrawFour" }
);

export type UnoState = BaseBoardGameState & {
  stage: "playing" | "reveal";
  deck: Deck<UnoCard>;
  hands: Record<string, UnoCard[]>;
  currentColor: UnoColor;
  direction: 1 | -1;
  turn: TurnState;
};

function buildUnoDeck(): UnoCard[] {
  let n = 0;
  const id = () => `c${n++}`;
  const cards: UnoCard[] = [];

  for (const color of COLORS) {
    cards.push({ id: id(), kind: "number", color, value: 0 });
    for (let value = 1; value <= 9; value++) {
      cards.push({ id: id(), kind: "number", color, value });
      cards.push({ id: id(), kind: "number", color, value });
    }
    for (let i = 0; i < 2; i++) {
      cards.push({ id: id(), kind: "skip", color });
      cards.push({ id: id(), kind: "reverse", color });
      cards.push({ id: id(), kind: "drawTwo", color });
    }
  }
  for (let i = 0; i < 4; i++) cards.push({ id: id(), kind: "wild" });
  for (let i = 0; i < 4; i++) cards.push({ id: id(), kind: "wildDrawFour" });

  return cards;
}

export function cardPoints(card: UnoCard): number {
  switch (card.kind) {
    case "number":
      return card.value;
    case "skip":
    case "reverse":
    case "drawTwo":
      return 20;
    case "wild":
    case "wildDrawFour":
      return 50;
  }
}

export function canPlay(card: UnoCard, top: UnoCard, currentColor: UnoColor, hand: UnoCard[]): boolean {
  if (card.kind === "wild") return true;
  if (card.kind === "wildDrawFour") {
    // Official house rule: only playable if you have nothing matching the
    // current color - otherwise it'd be a free color-change every turn.
    return !hand.some((c) => c.id !== card.id && "color" in c && c.color === currentColor);
  }
  if (card.color === currentColor) return true;
  if (card.kind === "number" && top.kind === "number" && card.value === top.value) return true;
  if (card.kind !== "number" && card.kind === top.kind) return true;
  return false;
}

function drawFor(
  deck: Deck<UnoCard>,
  hands: Record<string, UnoCard[]>,
  playerId: string,
  count: number
): { deck: Deck<UnoCard>; hands: Record<string, UnoCard[]> } {
  const { cards, deck: nextDeck } = drawCards(deck, count);
  return { deck: nextDeck, hands: { ...hands, [playerId]: [...(hands[playerId] ?? []), ...cards] } };
}

function startRound(prev: UnoState | null, players: Player[]): UnoState {
  const ids = players.map((p) => p.id);
  let deck = createDeck(buildUnoDeck());
  let hands: Record<string, UnoCard[]> = {};
  for (const id of ids) {
    const dealt = drawFor(deck, hands, id, HAND_SIZE);
    deck = dealt.deck;
    hands = dealt.hands;
  }

  // Simplify the classic "what if the starting discard is an action card"
  // edge cases entirely by seeding the discard with a plain number card.
  const startIndex = deck.drawPile.findIndex((c) => c.kind === "number");
  const startCard = deck.drawPile[startIndex];
  deck = {
    drawPile: [...deck.drawPile.slice(0, startIndex), ...deck.drawPile.slice(startIndex + 1)],
    discardPile: [startCard],
  };

  const turn = initTurnOrder(ids, { shuffle: true });

  return {
    stage: "playing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: currentPlayerId(turn),
    winner: null,
    deck,
    hands,
    currentColor: startCard.kind === "number" ? startCard.color : "red",
    direction: 1,
    turn,
  };
}

function finishRound(state: UnoState, winnerId: string, hands: Record<string, UnoCard[]>): UnoState {
  const scoreDeltas: Record<string, number> = {};
  let total = 0;
  for (const [pid, hand] of Object.entries(hands)) {
    if (pid === winnerId) continue;
    total += hand.reduce((sum, c) => sum + cardPoints(c), 0);
  }
  scoreDeltas[winnerId] = total;
  return { ...state, hands, stage: "reveal", roundOver: true, gameOver: true, winner: winnerId, scoreDeltas };
}

function applyAction(
  state: UnoState,
  playerId: string,
  payload: unknown,
  players: Player[]
): UnoState {
  const action = payload as { type: string; cardId?: string; chosenColor?: UnoColor };
  if (state.stage !== "playing" || !isPlayersTurn(state.turn, playerId)) return state;
  const disconnected = players.filter((p) => !p.connected).map((p) => p.id);

  if (action.type === "draw_card") {
    const { deck, hands } = drawFor(state.deck, state.hands, playerId, 1);
    const turn = advanceTurn(state.turn, disconnected, state.direction);
    return { ...state, deck, hands, turn, currentTurn: currentPlayerId(turn) };
  }

  if (action.type === "play_card" && action.cardId) {
    const hand = state.hands[playerId] ?? [];
    const card = hand.find((c) => c.id === action.cardId);
    const top = topOfDiscard(state.deck);
    if (!card || !top) return state;
    if (!canPlay(card, top, state.currentColor, hand)) return state;
    const needsColor = card.kind === "wild" || card.kind === "wildDrawFour";
    if (needsColor && !action.chosenColor) return state;

    const newHand = hand.filter((c) => c.id !== card.id);
    let hands = { ...state.hands, [playerId]: newHand };
    let deck = discardCard(state.deck, card);
    const currentColor = needsColor ? action.chosenColor! : "color" in card ? card.color : state.currentColor;

    if (newHand.length === 0) {
      return finishRound({ ...state, deck, currentColor }, playerId, hands);
    }

    let direction = state.direction;
    let turn = state.turn;

    if (card.kind === "skip") {
      turn = advanceTurn(turn, disconnected, direction);
      turn = advanceTurn(turn, disconnected, direction);
    } else if (card.kind === "reverse") {
      if (players.length === 2) {
        turn = advanceTurn(turn, disconnected, direction);
        turn = advanceTurn(turn, disconnected, direction);
      } else {
        direction = direction === 1 ? -1 : 1;
        turn = advanceTurn(turn, disconnected, direction);
      }
    } else if (card.kind === "drawTwo" || card.kind === "wildDrawFour") {
      const targetTurn = advanceTurn(turn, disconnected, direction);
      const targetId = currentPlayerId(targetTurn);
      const drawn = drawFor(deck, hands, targetId, card.kind === "drawTwo" ? 2 : 4);
      deck = drawn.deck;
      hands = drawn.hands;
      turn = advanceTurn(targetTurn, disconnected, direction);
    } else {
      turn = advanceTurn(turn, disconnected, direction);
    }

    return { ...state, deck, hands, currentColor, direction, turn, currentTurn: currentPlayerId(turn) };
  }

  return state;
}

function redactState(state: UnoState, forPlayerId: string): BaseBoardGameState & Record<string, unknown> {
  const handCounts = Object.fromEntries(Object.entries(state.hands).map(([pid, hand]) => [pid, hand.length]));
  return {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    currentTurn: state.currentTurn,
    winner: state.winner,
    direction: state.direction,
    currentColor: state.currentColor,
    topCard: topOfDiscard(state.deck),
    drawPileCount: state.deck.drawPile.length,
    handCounts,
    yourHand: state.hands[forPlayerId] ?? [],
    isYourTurn: forPlayerId === state.currentTurn,
    players: state.turn.order,
  };
}

export const unoModule: GameModule<UnoState> = {
  meta: {
    id: "uno",
    label: "Uno",
    description: "Match color or number to empty your hand first - Skip, Reverse, and Wild cards keep everyone on their toes.",
    minPlayers: 2,
    maxPlayers: 6,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
