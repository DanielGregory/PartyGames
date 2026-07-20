import type { BaseBoardGameState, GameModule, Player } from "../types";
import { advanceTurn, currentPlayerId, initTurnOrder, isPlayersTurn, type TurnState } from "../turnManager";

const BOARD_PRESETS: Record<string, { columns: number; rows: number }> = {
  compact: { columns: 6, rows: 5 },
  classic: { columns: 7, rows: 6 },
  large: { columns: 9, rows: 7 },
};
const DEFAULT_PRESET = "classic";

export type ConnectFourState = BaseBoardGameState & {
  stage: "playing" | "reveal";
  columns: number;
  rows: number;
  cells: (string | null)[]; // row-major, index 0 = top-left
  turn: TurnState;
  isDraw: boolean;
};

function boardPreset(config?: Record<string, unknown>): { columns: number; rows: number } {
  const key = typeof config?.boardSize === "string" ? config.boardSize : DEFAULT_PRESET;
  return BOARD_PRESETS[key] ?? BOARD_PRESETS[DEFAULT_PRESET];
}

function startRound(
  prev: ConnectFourState | null,
  players: Player[],
  config?: Record<string, unknown>
): ConnectFourState {
  const turn = initTurnOrder(
    players.map((p) => p.id),
    { shuffle: true }
  );
  const { columns, rows } = prev ? { columns: prev.columns, rows: prev.rows } : boardPreset(config);

  return {
    stage: "playing",
    round: (prev?.round ?? 0) + 1,
    roundOver: false,
    gameOver: false,
    scoreDeltas: {},
    currentTurn: currentPlayerId(turn),
    winner: null,
    columns,
    rows,
    cells: new Array(columns * rows).fill(null),
    turn,
    isDraw: false,
  };
}

function columnLandingRow(cells: (string | null)[], columns: number, rows: number, column: number): number | null {
  for (let row = rows - 1; row >= 0; row--) {
    if (cells[row * columns + column] === null) return row;
  }
  return null;
}

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function wins4InARow(
  cells: (string | null)[],
  columns: number,
  rows: number,
  row: number,
  column: number
): boolean {
  const player = cells[row * columns + column];
  if (!player) return false;

  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;

    let r = row + dr;
    let c = column + dc;
    while (r >= 0 && r < rows && c >= 0 && c < columns && cells[r * columns + c] === player) {
      count++;
      r += dr;
      c += dc;
    }

    r = row - dr;
    c = column - dc;
    while (r >= 0 && r < rows && c >= 0 && c < columns && cells[r * columns + c] === player) {
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
  if (typeof action.column !== "number" || action.column < 0 || action.column >= state.columns) return state;

  const row = columnLandingRow(state.cells, state.columns, state.rows, action.column);
  if (row === null) return state;

  const cells = [...state.cells];
  cells[row * state.columns + action.column] = playerId;

  if (wins4InARow(cells, state.columns, state.rows, row, action.column)) {
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
    columns: state.columns,
    rows: state.rows,
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
