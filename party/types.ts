// Shared types for the room/lobby/scoring platform and all game modules.
// Imported by both the PartyKit server and the Next.js client (types only
// on the client side, so game content/logic stays server-authoritative).

export type GameId = "spyfall" | "fibbingit" | "trivia" | "mostlikely";

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
};

export type PublicRoomState = {
  code: string;
  hostId: string | null;
  players: Player[];
  status: RoomStatus;
  selectedGame: GameId | null;
  round: number;
};

// Message client -> server
export type ClientMessage =
  | { type: "join"; playerId: string; name: string }
  | { type: "select_game"; gameId: GameId }
  | { type: "start_game" }
  | { type: "game_action"; payload: unknown }
  | { type: "next_round" }
  | { type: "end_game" };

// Message server -> client. `game` is the redacted, per-player view of the
// current game module's state (or null in the lobby).
export type ServerMessage =
  | {
      type: "state";
      room: PublicRoomState;
      game: (BaseGameState & Record<string, unknown>) | null;
      you: { id: string; isHost: boolean };
    }
  | { type: "error"; message: string };

export type GameMeta = {
  id: GameId;
  label: string;
  description: string;
  minPlayers: number;
};

export interface GameModule<TState extends BaseGameState = BaseGameState> {
  meta: GameMeta;
  /** Build the next round's state. `prev` is null for the very first round. */
  next(prev: TState | null, players: Player[]): TState;
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
