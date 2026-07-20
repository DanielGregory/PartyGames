import type { BaseBoardGameState, GameModule, Player } from "../types";
import { advanceTurn, currentPlayerId, initTurnOrder, isPlayersTurn, type TurnState } from "../turnManager";

const BOARD_SIZE = 8;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const SHIP_LENGTHS = [4, 3, 2];

type Shot = { cell: number; hit: boolean };

export type BattleshipState = BaseBoardGameState & {
  stage: "placement" | "battle" | "reveal";
  ships: Record<string, number[][]>; // playerId -> list of ships, each a list of cell indices
  placementProgress: Record<string, number>; // playerId -> index into SHIP_LENGTHS for their next ship
  shots: Record<string, Shot[]>; // playerId -> shots that player has fired (at their opponent)
  shotLog: { shooterId: string; cell: number; hit: boolean }[];
  turn: TurnState;
};

function startRound(prev: BattleshipState | null, players: Player[]): BattleshipState {
  const ids = players.map((p) => p.id);
  const ships: Record<string, number[][]> = {};
  const placementProgress: Record<string, number> = {};
  const shots: Record<string, Shot[]> = {};
  for (const id of ids) {
    ships[id] = [];
    placementProgress[id] = 0;
    shots[id] = [];
  }

  return {
    stage: "placement",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: null,
    winner: null,
    ships,
    placementProgress,
    shots,
    shotLog: [],
    turn: initTurnOrder(ids, { shuffle: true }),
  };
}

function shipCells(start: number, length: number, orientation: "h" | "v"): number[] | null {
  const row = Math.floor(start / BOARD_SIZE);
  const col = start % BOARD_SIZE;

  if (orientation === "h") {
    if (col + length > BOARD_SIZE) return null;
    return Array.from({ length }, (_, i) => start + i);
  }
  if (row + length > BOARD_SIZE) return null;
  return Array.from({ length }, (_, i) => start + i * BOARD_SIZE);
}

function overlaps(cells: number[], existingShips: number[][]): boolean {
  const occupied = new Set(existingShips.flat());
  return cells.some((c) => occupied.has(c));
}

function allShipsSunk(ships: number[][], hitCells: Set<number>): boolean {
  return ships.every((ship) => ship.every((c) => hitCells.has(c)));
}

function applyAction(
  state: BattleshipState,
  playerId: string,
  payload: unknown,
  players: Player[]
): BattleshipState {
  const action = payload as {
    type: string;
    cell?: number;
    orientation?: "h" | "v";
  };

  if (action.type === "place_ship" && state.stage === "placement") {
    const progress = state.placementProgress[playerId];
    if (progress === undefined || progress >= SHIP_LENGTHS.length) return state;
    if (typeof action.cell !== "number" || action.cell < 0 || action.cell >= CELL_COUNT) return state;
    const orientation = action.orientation === "v" ? "v" : "h";

    const cells = shipCells(action.cell, SHIP_LENGTHS[progress], orientation);
    if (!cells || overlaps(cells, state.ships[playerId])) return state;

    const ships = { ...state.ships, [playerId]: [...state.ships[playerId], cells] };
    const placementProgress = { ...state.placementProgress, [playerId]: progress + 1 };

    const everyoneDone = Object.keys(placementProgress).every(
      (id) => placementProgress[id] >= SHIP_LENGTHS.length
    );

    if (everyoneDone) {
      return {
        ...state,
        ships,
        placementProgress,
        stage: "battle",
        currentTurn: currentPlayerId(state.turn),
      };
    }
    return { ...state, ships, placementProgress };
  }

  if (action.type === "fire" && state.stage === "battle") {
    if (!isPlayersTurn(state.turn, playerId)) return state;
    if (typeof action.cell !== "number" || action.cell < 0 || action.cell >= CELL_COUNT) return state;

    const opponent = players.find((p) => p.id !== playerId);
    if (!opponent) return state;
    const alreadyShot = state.shots[playerId].some((s) => s.cell === action.cell);
    if (alreadyShot) return state;

    const opponentShips = state.ships[opponent.id];
    const hit = opponentShips.some((ship) => ship.includes(action.cell as number));
    const shot: Shot = { cell: action.cell, hit };
    const shots = { ...state.shots, [playerId]: [...state.shots[playerId], shot] };
    const shotLog = [...state.shotLog, { shooterId: playerId, cell: action.cell, hit }];

    const hitCells = new Set(shots[playerId].filter((s) => s.hit).map((s) => s.cell));
    if (hit && allShipsSunk(opponentShips, hitCells)) {
      return {
        ...state,
        shots,
        shotLog,
        stage: "reveal",
        roundOver: true,
        winner: playerId,
        scoreDeltas: { [playerId]: 5 },
      };
    }

    const turn = advanceTurn(
      state.turn,
      players.filter((p) => !p.connected).map((p) => p.id)
    );
    return { ...state, shots, shotLog, turn, currentTurn: currentPlayerId(turn) };
  }

  return state;
}

function buildGrid(ships: number[][], shots: Shot[], revealShips: boolean): (string | null)[] {
  const grid: (string | null)[] = new Array(CELL_COUNT).fill(null);
  if (revealShips) {
    for (const ship of ships) for (const c of ship) grid[c] = "ship";
  }
  for (const s of shots) grid[s.cell] = s.hit ? "hit" : "miss";
  return grid;
}

function redactState(state: BattleshipState, forPlayerId: string): BaseBoardGameState & Record<string, unknown> {
  const opponentId = state.turn.order.find((id) => id !== forPlayerId) ?? null;

  const base = {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    currentTurn: state.currentTurn,
    winner: state.winner,
    isYourTurn: state.currentTurn === forPlayerId,
    shipLengths: SHIP_LENGTHS,
    boardSize: BOARD_SIZE,
    shotLog: state.shotLog,
  };

  if (state.stage === "placement") {
    return {
      ...base,
      yourShips: state.ships[forPlayerId] ?? [],
      nextShipLength: SHIP_LENGTHS[state.placementProgress[forPlayerId] ?? SHIP_LENGTHS.length] ?? null,
      youReady: (state.placementProgress[forPlayerId] ?? 0) >= SHIP_LENGTHS.length,
      opponentReady: opponentId ? (state.placementProgress[opponentId] ?? 0) >= SHIP_LENGTHS.length : false,
    };
  }

  const yourGrid = buildGrid(state.ships[forPlayerId] ?? [], opponentId ? state.shots[opponentId] ?? [] : [], true);
  const opponentGrid = buildGrid([], state.shots[forPlayerId] ?? [], false);

  if (state.stage === "reveal") {
    return {
      ...base,
      yourGrid,
      opponentGrid,
      opponentShips: opponentId ? state.ships[opponentId] : [],
    };
  }

  return { ...base, yourGrid, opponentGrid };
}

export const battleshipModule: GameModule<BattleshipState> = {
  meta: {
    id: "battleship",
    label: "Battleship",
    description: "Secretly place your fleet, then take turns firing at your opponent's grid to sink it.",
    minPlayers: 2,
    maxPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
