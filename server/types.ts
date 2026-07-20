// Shared types for the room/lobby/scoring platform and all game modules.
// Imported by both the server-side room logic (server/room.ts, called from
// Next.js API routes) and the Next.js client (types only on the client side,
// so game content/logic stays server-authoritative).

export type GameId =
  | "spyfall"
  | "fibbingit"
  | "trivia"
  | "mostlikely"
  | "quizmaster"
  | "connectfour"
  | "hangman"
  | "battleship"
  | "guesswho"
  | "boggle"
  | "wordsearch"
  | "wordle"
  | "pictionary";

export type Player = {
  id: string;
  name: string;
  score: number;
  connected: boolean;
};

export type RoomStatus = "lobby" | "playing";

// Fields every game module's state must expose so the shared platform
// (scoreboard, next-round controls) can work without knowing the game's
// internal details.
export type BaseGameState = {
  stage: string;
  round: number;
  roundOver: boolean;
  scoreDeltas: Record<string, number>;
  // True once the game has reached its final round's reveal (for modes that
  // support a fixed round count). Modes that don't (host manually ends the
  // game whenever) just always report false.
  gameOver: boolean;
};

// Extended envelope for future turn-based/board game modes (Tic-Tac-Toe,
// Connect Four, Mancala, Battleship, ...). None of the current five modes
// use this - they're all "everyone acts simultaneously each round," not
// "players take sequential turns," so they stay on plain BaseGameState. A
// new turn-based mode's state type extends this instead, pairing it with
// server/turnManager.ts for whose-turn-is-it/advance/timeout logic and
// components/Board.tsx for rendering. `winner` is a single player id (or
// null) since that's the shape a turn-based board game's outcome takes;
// round-based modes express their outcome as scoreDeltas instead.
export type BaseBoardGameState = BaseGameState & {
  currentTurn: string | null;
  winner: string | null;
};

export type PublicRoomState = {
  code: string;
  hostId: string | null;
  players: Player[];
  status: RoomStatus;
  selectedGame: GameId | null;
  round: number;
  // Set only when the selected game's maxPlayers forced the host to choose
  // a subset of the room to play (e.g. 5 people in the room, a 2-player
  // board game selected). Null means everyone in the room is playing - the
  // case for all five current modes, which have no maxPlayers. Players not
  // in this list when it's set can watch (still get redact()'d state) but
  // their game_action messages are rejected server-side.
  activePlayers: string[] | null;
};

// Message client -> server, posted to /api/rooms/[code]/messages.
// Joining is a separate call (POST /api/rooms/[code]/join) since it returns
// the private-channel token the client needs before it can receive anything.
export type ClientMessage =
  | { type: "select_game"; gameId: GameId }
  | { type: "start_game"; config?: Record<string, unknown>; activePlayerIds?: string[] }
  | { type: "game_action"; payload: unknown }
  | { type: "next_round" }
  | { type: "end_game" };

// Pushed to a player's private Realtime channel whenever room/game state
// changes. `game` is the redacted, per-player view of the current game
// module's state (or null in the lobby).
export type ServerMessage = {
  type: "state";
  room: PublicRoomState;
  game: (BaseGameState & Record<string, unknown>) | null;
  you: { id: string; isHost: boolean };
};

export type GameMeta = {
  id: GameId;
  label: string;
  description: string;
  minPlayers: number;
  // Undefined means no cap. Classical board games (Tic-Tac-Toe, Chess,
  // Battleship, ...) will mostly set this to exactly 2 - none of the
  // current five modes need it, so it's optional and unset for all of them.
  maxPlayers?: number;
};

export interface GameModule<TState extends BaseGameState = BaseGameState> {
  meta: GameMeta;
  /**
   * Build the next round's state. `prev` is null for the very first round.
   * `config` is whatever the host passed to `start_game`; only meaningful
   * (and only ever populated) on that first call. May return a Promise, for
   * modes that need an async step to build a round; server/room.ts awaits
   * this either way, so synchronous modules are unaffected.
   */
  next(prev: TState | null, players: Player[], config?: Record<string, unknown>): TState | Promise<TState>;
  /** Apply a player action, returning the updated state. */
  action(state: TState, playerId: string, payload: unknown, players: Player[]): TState;
  /** Produce the JSON-safe view of `state` that `forPlayerId` is allowed to see. */
  redact(state: TState, forPlayerId: string): BaseGameState & Record<string, unknown>;
}

export function connectedIds(players: Player[]): string[] {
  return players.filter((p) => p.connected).map((p) => p.id);
}

export function allConnectedHaveResponded(
  players: Player[],
  responses: Record<string, unknown>
): boolean {
  const connected = connectedIds(players);
  if (connected.length === 0) return false;
  return connected.every((id) => responses[id] !== undefined);
}
