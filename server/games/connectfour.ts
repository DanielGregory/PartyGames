import type { BaseBoardGameState, GameModule, Player } from "../types";
import { advanceTurn, currentPlayerId, initTurnOrder, isPlayersTurn, type TurnState } from "../turnManager";

const COLUMNS = 7;
const ROWS = 6;
const CELL_COUNT = COLUMNS * ROWS;

export type ConnectFourState = BaseBoardGameState & {
  stage: "playing" | "reveal";
  cells: (string | null)[]; // row-major, index 0 = top-left
  turn: TurnState;
  isDraw: boolean;
};

function startRound(prev: ConnectFourState | null, players: Player[]): ConnectFourState {
  const turn = initTurnOrder(
    players.map((p) => p.id),
    { shuffle: true }
  );

  return {
    stage: "playing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: currentPlayerId(turn),
    winner: null,
    cells: new Array(CELL_COUNT).fill(null),
    turn,
    isDraw: false,
  };
}

function columnLandingRow(cells: (string | null)[], column: number): number | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (cells[row * COLUMNS + column] === null) return row;
  }
  return null;
}

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function wins4InARow(cells: (string | null)[], row: number, column: number): boolean {
  const player = cells[row * COLUMNS + column];
  if (!player) return false;

  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;

    let r = row + dr;
    let c = column + dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && cells[r * COLUMNS + c] === player) {
      count++;
      r += dr;
      c += dc;
    }

    r = row - dr;
    c = column - dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && cells[r * COLUMNS + c] === player) {
      count++;
      r -= dr;
      c -= dc;
    }

    if (count >= 4) return true;
  }

  return false;
}

function applyAction(
  state: ConnectFourState,
  playerId: string,
  payload: unknown,
  players: Player[]
): ConnectFourState {
  const action = payload as { type: string; column?: number };
  if (action.type !== "drop" || state.stage !== "playing") return state;
  if (!isPlayersTurn(state.turn, playerId)) return state;
  if (typeof action.column !== "number" || action.column < 0 || action.column >= COLUMNS) return state;

  const row = columnLandingRow(state.cells, action.column);
  if (row === null) return state;

  const cells = [...state.cells];
  cells[row * COLUMNS + action.column] = playerId;

  if (wins4InARow(cells, row, action.column)) {
    return {
      ...state,
      cells,
      stage: "reveal",
      roundOver: true,
      winner: playerId,
      scoreDeltas: { [playerId]: 3 },
    };
  }

  if (cells.every((c) => c !== null)) {
    const scoreDeltas: Record<string, number> = {};
    for (const p of players) scoreDeltas[p.id] = 1;
    return { ...state, cells, stage: "reveal", roundOver: true, isDraw: true, scoreDeltas };
  }

  const turn = advanceTurn(
    state.turn,
    players.filter((p) => !p.connected).map((p) => p.id)
  );
  return { ...state, cells, turn, currentTurn: currentPlayerId(turn) };
}

function redactState(state: ConnectFourState, forPlayerId: string): BaseBoardGameState & Record<string, unknown> {
  return {
    stage: state.stage,
    round: state.round,
    roundOver: state.roundOver,
    gameOver: state.gameOver,
    scoreDeltas: state.scoreDeltas,
    currentTurn: state.currentTurn,
    winner: state.winner,
    isDraw: state.isDraw,
    cells: state.cells,
    players: state.turn.order,
    isYourTurn: state.currentTurn === forPlayerId,
  };
}

export const connectFourModule: GameModule<ConnectFourState> = {
  meta: {
    id: "connectfour",
    label: "Connect Four",
    description: "Drop discs to connect four in a row - horizontally, vertically, or diagonally.",
    minPlayers: 2,
    maxPlayers: 2,
  },
  next: startRound,
  action: applyAction,
  redact: redactState,
};
