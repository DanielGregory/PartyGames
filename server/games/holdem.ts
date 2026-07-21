import type { BaseBoardGameState, GameModule, Player } from "../types";
import { createDeck, drawCards, standardDeck, type Deck, type PlayingCard, type Rank } from "../cards";

// Casual, simplified betting: fixed blinds, no formal min-raise sizing (any
// raise above the current bet is legal), no persistent seating beyond a
// button that rotates hand to hand. Chip stacks persist hand-to-hand across
// a session (unlike Blackjack's fixed per-hand ante) via `stacks`, carried
// forward through `next()`'s `prev` argument. scoreDeltas each hand reports
// that hand's net stack change to the platform's shared score - same
// reportScore-via-scoreDeltas mechanism every other mode uses.
const STARTING_STACK = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

type Street = "preflop" | "flop" | "turn" | "river";

export type HandRank = { category: number; tiebreakers: number[] };

export type HoldemState = BaseBoardGameState & {
  stage: "betting" | "reveal";
  totalRounds: number;
  street: Street;
  deck: Deck<PlayingCard>;
  holeCards: Record<string, PlayingCard[]>;
  community: PlayingCard[];
  stacks: Record<string, number>;
  contributed: Record<string, number>;
  committedThisStreet: Record<string, number>;
  inHand: Record<string, boolean>;
  allIn: Record<string, boolean>;
  currentBet: number;
  order: string[]; // fixed seating order for this hand; order[0] is the button
  playersToAct: string[]; // queue - index 0 is whose turn it is
  buttonIndex: number;
  winners: string[];
  handRanks: Record<string, HandRank> | null;
};

// --- Hand evaluation (best 5-of-7) ---

const RANK_VALUES: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  J: 11, Q: 12, K: 13, A: 14,
};

export function rankFiveCardHand(cards: PlayingCard[]): HandRank {
  const values = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);

  const uniqueDesc = Array.from(new Set(values)).sort((a, b) => b - a);
  let straightHigh: number | null = null;
  if (uniqueDesc.length === 5) {
    if (uniqueDesc[0] - uniqueDesc[4] === 4) straightHigh = uniqueDesc[0];
    else if (uniqueDesc.join(",") === "14,5,4,3,2") straightHigh = 5; // wheel: A-2-3-4-5
  }
  const isStraight = straightHigh !== null;

  const countMap = new Map<number, number>();
  for (const v of values) countMap.set(v, (countMap.get(v) ?? 0) + 1);
  const groups = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (isStraight && isFlush) return { category: 8, tiebreakers: [straightHigh!] };
  if (groups[0][1] === 4) {
    const kicker = groups.find((g) => g[1] !== 4)![0];
    return { category: 7, tiebreakers: [groups[0][0], kicker] };
  }
  if (groups[0][1] === 3 && groups[1]?.[1] >= 2) {
    return { category: 6, tiebreakers: [groups[0][0], groups[1][0]] };
  }
  if (isFlush) return { category: 5, tiebreakers: values };
  if (isStraight) return { category: 4, tiebreakers: [straightHigh!] };
  if (groups[0][1] === 3) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]);
    return { category: 3, tiebreakers: [groups[0][0], ...kickers] };
  }
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    const pairVals = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    const kicker = groups.find((g) => g[1] === 1)![0];
    return { category: 2, tiebreakers: [...pairVals, kicker] };
  }
  if (groups[0][1] === 2) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]);
    return { category: 1, tiebreakers: [groups[0][0], ...kickers] };
  }
  return { category: 0, tiebreakers: values };
}

export function compareHandRank(x: HandRank, y: HandRank): number {
  if (x.category !== y.category) return x.category - y.category;
  const len = Math.max(x.tiebreakers.length, y.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    const diff = (x.tiebreakers[i] ?? 0) - (y.tiebreakers[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function combinations5(cards: PlayingCard[]): PlayingCard[][] {
  const result: PlayingCard[][] = [];
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) result.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
  return result;
}

export function bestHand(cards: PlayingCard[]): HandRank {
  let best: HandRank | null = null;
  for (const combo of combinations5(cards)) {
    const r = rankFiveCardHand(combo);
    if (!best || compareHandRank(r, best) > 0) best = r;
  }
  return best!;
}

// --- Turn queue helpers ---

function rotateToAct(
  order: string[],
  startIndex: number,
  inHand: Record<string, boolean>,
  allIn: Record<string, boolean>
): string[] {
  const n = order.length;
  const queue: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = order[(startIndex + i) % n];
    if (inHand[id] && !allIn[id]) queue.push(id);
  }
  return queue;
}

// --- Dealing / round setup ---

function startHand(prev: HoldemState | null, players: Player[], config?: Record<string, unknown>): HoldemState {
  const totalRounds = prev?.totalRounds ?? (typeof config?.rounds === "number" ? config.rounds : 0);
  const ids = players.map((p) => p.id);
  const prevStacks = prev?.stacks ?? {};
  const stacks: Record<string, number> = {};
  for (const id of ids) stacks[id] = prevStacks[id] ?? STARTING_STACK;

  const dealtIn = ids.filter((id) => stacks[id] > 0);
  const buttonIndex = dealtIn.length > 0 ? ((prev?.buttonIndex ?? -1) + 1) % dealtIn.length : 0;
  const order = [...dealtIn.slice(buttonIndex), ...dealtIn.slice(0, buttonIndex)];

  let deck = createDeck(standardDeck());
  const holeCards: Record<string, PlayingCard[]> = Object.fromEntries(order.map((id) => [id, []]));
  for (let r = 0; r < 2; r++) {
    for (const id of order) {
      const { cards, deck: nd } = drawCards(deck, 1);
      deck = nd;
      if (cards[0]) holeCards[id] = [...holeCards[id], cards[0]];
    }
  }

  const contributed: Record<string, number> = Object.fromEntries(order.map((id) => [id, 0]));
  const committedThisStreet: Record<string, number> = Object.fromEntries(order.map((id) => [id, 0]));
  const inHand: Record<string, boolean> = Object.fromEntries(order.map((id) => [id, true]));
  const allIn: Record<string, boolean> = Object.fromEntries(order.map((id) => [id, false]));

  function postBlind(id: string, amount: number) {
    const actual = Math.min(amount, stacks[id]);
    stacks[id] -= actual;
    contributed[id] += actual;
    committedThisStreet[id] += actual;
    if (stacks[id] === 0) allIn[id] = true;
  }

  let state: HoldemState = {
    stage: "betting",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: null,
    winner: null,
    totalRounds,
    street: "preflop",
    deck,
    holeCards,
    community: [],
    stacks,
    contributed,
    committedThisStreet,
    inHand,
    allIn,
    currentBet: 0,
    order,
    playersToAct: [],
    buttonIndex,
    winners: [],
    handRanks: null,
  };

  if (order.length < 2) {
    // Can't actually play - shouldn't happen since the host can't start (or
    // continue) below the mode's minPlayers, but stay well-defined.
    return { ...state, stage: "reveal", roundOver: true, gameOver: true };
  }

  let sbId: string;
  let bbId: string;
  if (order.length === 2) {
    sbId = order[0];
    bbId = order[1];
  } else {
    sbId = order[1];
    bbId = order[2];
  }
  postBlind(sbId, SMALL_BLIND);
  postBlind(bbId, BIG_BLIND);
  state = { ...state, stacks, contributed, committedThisStreet, allIn };
  state.currentBet = Math.max(committedThisStreet[sbId], committedThisStreet[bbId]);

  const firstToActIndex = order.length === 2 ? order.indexOf(sbId) : (order.indexOf(bbId) + 1) % order.length;
  const playersToAct = rotateToAct(order, firstToActIndex, inHand, allIn);
  state = { ...state, playersToAct, currentTurn: playersToAct[0] ?? null };

  return afterAction(state, players);
}

// --- Betting actions ---

function commitTo(state: HoldemState, playerId: string, target: number, players: Player[]): HoldemState {
  const stack = state.stacks[playerId];
  const already = state.committedThisStreet[playerId];
  const maxReach = already + stack;
  const clamped = Math.max(already, Math.min(target, maxReach));
  if (clamped < state.currentBet && clamped < maxReach) return state; // under-committing without going all-in isn't legal

  const pay = clamped - already;
  const stacks = { ...state.stacks, [playerId]: stack - pay };
  const contributed = { ...state.contributed, [playerId]: state.contributed[playerId] + pay };
  const committedThisStreet = { ...state.committedThisStreet, [playerId]: clamped };
  const allIn = stacks[playerId] === 0 ? { ...state.allIn, [playerId]: true } : state.allIn;

  const isRaise = clamped > state.currentBet;
  const currentBet = Math.max(state.currentBet, clamped);
  const startIdx = state.order.indexOf(playerId);

  const playersToAct = isRaise
    ? rotateToAct(state.order, (startIdx + 1) % state.order.length, state.inHand, allIn).filter((id) => id !== playerId)
    : state.playersToAct.slice(1);

  return afterAction(
    { ...state, stacks, contributed, committedThisStreet, allIn, currentBet, playersToAct },
    players
  );
}

function applyAction(state: HoldemState, playerId: string, payload: unknown, players: Player[]): HoldemState {
  const action = payload as { type: string; to?: number };
  if (state.stage !== "betting") return state;
  if (state.playersToAct[0] !== playerId) return state;
  if (!state.inHand[playerId] || state.allIn[playerId]) return state;

  if (action.type === "fold") {
    const inHand = { ...state.inHand, [playerId]: false };
    const playersToAct = state.playersToAct.slice(1);
    return afterAction({ ...state, inHand, playersToAct }, players);
  }

  if (action.type === "check") {
    if (state.committedThisStreet[playerId] !== state.currentBet) return state;
    return afterAction({ ...state, playersToAct: state.playersToAct.slice(1) }, players);
  }

  if (action.type === "call") {
    return commitTo(state, playerId, state.currentBet, players);
  }

  if (action.type === "raise") {
    if (typeof action.to !== "number" || action.to <= state.currentBet) return state;
    return commitTo(state, playerId, Math.floor(action.to), players);
  }

  if (action.type === "allin") {
    return commitTo(state, playerId, state.committedThisStreet[playerId] + state.stacks[playerId], players);
  }

  return state;
}

// A disconnected seat at the front of the queue would otherwise stall the
// hand forever - unlike the round-robin games, nothing else here ever gets
// another chance to advance past them. Auto-folding is a plain loop (no
// recursion into afterAction) so it can never mutually recurse with it.
function foldLeadingDisconnected(state: HoldemState, players: Player[]): HoldemState {
  const disconnected = new Set(players.filter((p) => !p.connected).map((p) => p.id));
  let next = state;
  while (next.playersToAct.length > 0 && disconnected.has(next.playersToAct[0])) {
    const foldId = next.playersToAct[0];
    next = { ...next, inHand: { ...next.inHand, [foldId]: false }, playersToAct: next.playersToAct.slice(1) };
  }
  return next;
}

function afterAction(state: HoldemState, players: Player[]): HoldemState {
  const next = foldLeadingDisconnected(state, players);

  const activeInHand = next.order.filter((id) => next.inHand[id]);
  if (activeInHand.length <= 1) {
    return finishHand(next);
  }

  if (next.playersToAct.length === 0) {
    return advanceStreet(next, players);
  }

  return { ...next, currentTurn: next.playersToAct[0] };
}

function advanceStreet(state: HoldemState, players: Player[]): HoldemState {
  const resetCommitted = Object.fromEntries(state.order.map((id) => [id, 0]));

  if (state.street === "river") {
    return finishHand({ ...state, committedThisStreet: resetCommitted, currentBet: 0 });
  }

  let deck = state.deck;
  let community = state.community;
  const dealCommunity = (n: number) => {
    const { cards, deck: nd } = drawCards(deck, n);
    community = [...community, ...cards];
    deck = nd;
  };

  let street: Street = state.street;
  if (state.street === "preflop") {
    dealCommunity(3);
    street = "flop";
  } else if (state.street === "flop") {
    dealCommunity(1);
    street = "turn";
  } else if (state.street === "turn") {
    dealCommunity(1);
    street = "river";
  }

  const nonAllInActive = state.order.filter((id) => state.inHand[id] && !state.allIn[id]);
  const withNewStreet = { ...state, deck, community, street, committedThisStreet: resetCommitted, currentBet: 0 };

  if (nonAllInActive.length <= 1) {
    // Everyone left is all-in (or there's nobody left to bet against) -
    // run the board out to showdown instead of a pointless betting round.
    return advanceStreet(withNewStreet, players);
  }

  // Postflop action starts with the first active seat after the button
  // (order[0] is always the button); real-money precision on exact
  // button-relative position in later streets is a deliberate simplification.
  const playersToAct = rotateToAct(state.order, 1, state.inHand, state.allIn);
  return { ...withNewStreet, playersToAct, currentTurn: playersToAct[0] ?? null };
}

function computePots(
  contributed: Record<string, number>,
  inHand: Record<string, boolean>,
  order: string[]
): { amount: number; eligible: string[] }[] {
  const remaining: Record<string, number> = {};
  for (const id of order) if (contributed[id] > 0) remaining[id] = contributed[id];
  const pots: { amount: number; eligible: string[] }[] = [];

  while (Object.values(remaining).some((v) => v > 0)) {
    const positiveIds = Object.keys(remaining).filter((id) => remaining[id] > 0);
    const minLayer = Math.min(...positiveIds.map((id) => remaining[id]));
    let amount = 0;
    const eligible: string[] = [];
    for (const id of positiveIds) {
      amount += minLayer;
      remaining[id] -= minLayer;
      if (inHand[id]) eligible.push(id);
    }
    if (amount > 0) pots.push({ amount, eligible });
  }

  return pots;
}

function finishHand(state: HoldemState): HoldemState {
  const pots = computePots(state.contributed, state.inHand, state.order);
  const stacks = { ...state.stacks };
  const winnersSet = new Set<string>();
  const activeInHand = state.order.filter((id) => state.inHand[id]);
  const needsShowdown = activeInHand.length > 1;

  let handRanks: Record<string, HandRank> | null = null;
  if (needsShowdown) {
    handRanks = {};
    for (const id of activeInHand) handRanks[id] = bestHand([...state.holeCards[id], ...state.community]);
  }

  for (const pot of pots) {
    if (pot.eligible.length === 0) continue;
    let potWinners: string[];
    if (pot.eligible.length === 1 || !handRanks) {
      potWinners = pot.eligible;
    } else {
      let best: HandRank | null = null;
      potWinners = [];
      for (const id of pot.eligible) {
        const r = handRanks[id];
        if (!best || compareHandRank(r, best) > 0) {
          best = r;
          potWinners = [id];
        } else if (compareHandRank(r, best) === 0) {
          potWinners.push(id);
        }
      }
    }
    const share = Math.floor(pot.amount / potWinners.length);
    let remainder = pot.amount - share * potWinners.length;
    for (const id of potWinners) {
      stacks[id] = (stacks[id] ?? 0) + share + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      winnersSet.add(id);
    }
  }

  const startingStack: Record<string, number> = {};
  for (const id of state.order) startingStack[id] = state.stacks[id] + state.contributed[id];
  const scoreDeltas: Record<string, number> = {};
  for (const id of state.order) scoreDeltas[id] = stacks[id] - startingStack[id];

  const playersWithChips = state.order.filter((id) => stacks[id] > 0).length;
  const gameOver = playersWithChips < 2 || (state.totalRounds > 0 && state.round >= state.totalRounds);
  const winners = Array.from(winnersSet);

  return {
    ...state,
    stacks,
    stage: "reveal",
    roundOver: true,
    gameOver,
    winner: winners.length === 1 ? winners[0] : null,
    winners,
    handRanks,
    scoreDeltas,
    playersToAct: [],
    currentTurn: null,
  };
}

function redactState(state: HoldemState, forPlayerId: string): BaseBoardGameState & Record<string, unknown> {
  const pot = Object.values(state.contributed).reduce((a, b) => a + b, 0);
  return {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    currentTurn: state.currentTurn,
    winner: state.winner,
    street: state.street,
    community: state.community,
    pot,
    currentBet: state.currentBet,
    stacks: state.stacks,
    contributed: state.contributed,
    committedThisStreet: state.committedThisStreet,
    inHand: state.inHand,
    allIn: state.allIn,
    order: state.order,
    buttonIndex: state.buttonIndex,
    yourHoleCards: state.holeCards[forPlayerId] ?? [],
    // Only reveal other players' hole cards at a genuine showdown (2+ hands
    // compared) - a fold-out win keeps everyone else's cards private, same
    // as a real table.
    holeCards: state.handRanks ? state.holeCards : null,
    handRanks: state.handRanks,
    winners: state.winners,
    isYourTurn: forPlayerId === state.playersToAct[0],
    toCall: Math.max(0, state.currentBet - (state.committedThisStreet[forPlayerId] ?? 0)),
  };
}

export const holdemModule: GameModule<HoldemState> = {
  meta: {
    id: "holdem",
    label: "Texas Hold'em",
    description: "Casual no-frills hold'em - check, call, raise, or fold your way through the flop, turn, and river.",
    minPlayers: 2,
    maxPlayers: 8,
  },
  next: startHand,
  action: applyAction,
  redact: redactState,
};
