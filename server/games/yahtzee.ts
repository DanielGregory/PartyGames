import type { BaseBoardGameState, GameModule, Player } from "../types";
import { advanceTurn, currentPlayerId, initTurnOrder, isPlayersTurn, type TurnState } from "../turnManager";

const DICE_COUNT = 5;
const MAX_ROLLS = 3;
const UPPER_BONUS_THRESHOLD = 63;
const UPPER_BONUS = 35;
const YAHTZEE_BONUS = 100;

export type Category =
  | "ones"
  | "twos"
  | "threes"
  | "fours"
  | "fives"
  | "sixes"
  | "threeKind"
  | "fourKind"
  | "fullHouse"
  | "smallStraight"
  | "largeStraight"
  | "yahtzee"
  | "chance";

export const CATEGORIES: Category[] = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "threeKind",
  "fourKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "yahtzee",
  "chance",
];

const UPPER_CATEGORIES: Category[] = ["ones", "twos", "threes", "fours", "fives", "sixes"];

export type Scorecard = Partial<Record<Category, number>>;

export type YahtzeeState = BaseBoardGameState & {
  stage: "rolling" | "reveal";
  dice: number[];
  held: boolean[];
  rollsUsed: number;
  scorecards: Record<string, Scorecard>;
  yahtzeeBonusCount: Record<string, number>;
  turn: TurnState;
};

function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function scorecardFull(card: Scorecard): boolean {
  return CATEGORIES.every((c) => card[c] !== undefined);
}

function countDice(dice: number[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  return counts;
}

export function computeScore(dice: number[], category: Category, isJokerBonus: boolean): number {
  const counts = countDice(dice);
  const sum = dice.reduce((a, b) => a + b, 0);

  switch (category) {
    case "ones":
      return counts[1] * 1;
    case "twos":
      return counts[2] * 2;
    case "threes":
      return counts[3] * 3;
    case "fours":
      return counts[4] * 4;
    case "fives":
      return counts[5] * 5;
    case "sixes":
      return counts[6] * 6;
    case "threeKind":
      return counts.some((c) => c >= 3) ? sum : 0;
    case "fourKind":
      return counts.some((c) => c >= 4) ? sum : 0;
    case "fullHouse": {
      if (isJokerBonus) return 25;
      const groups = counts.slice(1).filter((c) => c > 0);
      return groups.length === 2 && groups.includes(3) && groups.includes(2) ? 25 : 0;
    }
    case "smallStraight": {
      if (isJokerBonus) return 30;
      const uniq = new Set(dice);
      const runs = [
        [1, 2, 3, 4],
        [2, 3, 4, 5],
        [3, 4, 5, 6],
      ];
      return runs.some((run) => run.every((n) => uniq.has(n))) ? 30 : 0;
    }
    case "largeStraight": {
      if (isJokerBonus) return 40;
      const uniq = new Set(dice);
      const runs = [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
      ];
      return runs.some((run) => run.every((n) => uniq.has(n))) ? 40 : 0;
    }
    case "yahtzee":
      return counts.some((c) => c === 5) ? 50 : 0;
    case "chance":
      return sum;
  }
}

export function totalScore(card: Scorecard, bonusCount: number): number {
  const upperSum = UPPER_CATEGORIES.reduce((sum, c) => sum + (card[c] ?? 0), 0);
  const upperBonus = upperSum >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0;
  const allSum = CATEGORIES.reduce((sum, c) => sum + (card[c] ?? 0), 0);
  return allSum + upperBonus + bonusCount * YAHTZEE_BONUS;
}

function isYahtzeeRoll(dice: number[]): boolean {
  return countDice(dice).some((c) => c === 5);
}

function startRound(prev: YahtzeeState | null, players: Player[]): YahtzeeState {
  const ids = players.map((p) => p.id);
  const turn = prev?.turn ?? initTurnOrder(ids, { shuffle: true });
  const scorecards = prev?.scorecards ?? Object.fromEntries(ids.map((id) => [id, {}]));
  const yahtzeeBonusCount = prev?.yahtzeeBonusCount ?? Object.fromEntries(ids.map((id) => [id, 0]));

  // New players joining mid-game (rare, but possible) get an empty
  // scorecard instead of crashing on a missing entry.
  for (const id of ids) {
    if (!(id in scorecards)) scorecards[id] = {};
    if (!(id in yahtzeeBonusCount)) yahtzeeBonusCount[id] = 0;
  }

  return {
    stage: "rolling",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: currentPlayerId(turn),
    winner: null,
    dice: [0, 0, 0, 0, 0],
    held: [false, false, false, false, false],
    rollsUsed: 0,
    scorecards,
    yahtzeeBonusCount,
    turn,
  };
}

function finishGame(state: YahtzeeState, players: Player[]): YahtzeeState {
  const scoreDeltas: Record<string, number> = {};
  let winner: string | null = null;
  let bestScore = -1;
  for (const p of players) {
    const total = totalScore(state.scorecards[p.id] ?? {}, state.yahtzeeBonusCount[p.id] ?? 0);
    scoreDeltas[p.id] = total;
    if (total > bestScore) {
      bestScore = total;
      winner = p.id;
    }
  }
  return { ...state, stage: "reveal", roundOver: true, gameOver: true, winner, scoreDeltas };
}

function applyAction(
  state: YahtzeeState,
  playerId: string,
  payload: unknown,
  players: Player[]
): YahtzeeState {
  const action = payload as { type: string; keep?: unknown; category?: string };
  if (state.stage !== "rolling" || !isPlayersTurn(state.turn, playerId)) return state;

  if (action.type === "roll") {
    if (state.rollsUsed >= MAX_ROLLS) return state;
    const dice = state.dice.map((d, i) => (state.rollsUsed > 0 && state.held[i] ? d : rollDie()));
    return { ...state, dice, rollsUsed: state.rollsUsed + 1 };
  }

  if (action.type === "toggle_hold") {
    if (state.rollsUsed < 1 || state.rollsUsed >= MAX_ROLLS) return state;
    const index = typeof action.keep === "number" ? action.keep : -1;
    if (index < 0 || index >= DICE_COUNT) return state;
    const held = [...state.held];
    held[index] = !held[index];
    return { ...state, held };
  }

  if (action.type === "score") {
    if (state.rollsUsed < 1) return state;
    const category = action.category as Category | undefined;
    if (!category || !CATEGORIES.includes(category)) return state;
    const myCard = state.scorecards[playerId] ?? {};
    if (myCard[category] !== undefined) return state;

    const jokerBonus = isYahtzeeRoll(state.dice) && myCard.yahtzee === 50;
    const points = computeScore(state.dice, category, jokerBonus);
    const scorecards = { ...state.scorecards, [playerId]: { ...myCard, [category]: points } };
    const yahtzeeBonusCount = jokerBonus
      ? { ...state.yahtzeeBonusCount, [playerId]: (state.yahtzeeBonusCount[playerId] ?? 0) + 1 }
      : state.yahtzeeBonusCount;

    const everyoneDone = players
      .filter((p) => p.connected)
      .every((p) => scorecardFull(scorecards[p.id] ?? {}));

    const afterScore: YahtzeeState = {
      ...state,
      scorecards,
      yahtzeeBonusCount,
      dice: [0, 0, 0, 0, 0],
      held: [false, false, false, false, false],
      rollsUsed: 0,
    };

    if (everyoneDone) return finishGame(afterScore, players);

    const turn = advanceTurn(
      state.turn,
      players.filter((p) => !p.connected || scorecardFull(scorecards[p.id] ?? {})).map((p) => p.id)
    );
    return { ...afterScore, turn, currentTurn: currentPlayerId(turn) };
  }

  return state;
}

function redactState(state: YahtzeeState): BaseBoardGameState & Record<string, unknown> {
  const totals: Record<string, number> = {};
  for (const id of Object.keys(state.scorecards)) {
    totals[id] = totalScore(state.scorecards[id], state.yahtzeeBonusCount[id] ?? 0);
  }

  return {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    currentTurn: state.currentTurn,
    winner: state.winner,
    dice: state.dice,
    held: state.held,
    rollsUsed: state.rollsUsed,
    maxRolls: MAX_ROLLS,
    scorecards: state.scorecards,
    yahtzeeBonusCount: state.yahtzeeBonusCount,
    totals,
    players: state.turn.order,
  };
}

export const yahtzeeModule: GameModule<YahtzeeState> = {
  meta: {
    id: "yahtzee",
    label: "Yahtzee",
    description: "Roll dice, build the best hand, and fill your scorecard's 13 categories for the highest total.",
    minPlayers: 1,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
