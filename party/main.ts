import type * as Party from "partykit/server";
import type {
  BaseGameState,
  ClientMessage,
  GameId,
  Player,
  PublicRoomState,
  RoomStatus,
  ServerMessage,
} from "./types";
import { gameRegistry } from "./games/registry";

type ConnState = { playerId: string };

type ServerRoomState = {
  code: string;
  hostId: string | null;
  players: Player[];
  status: RoomStatus;
  selectedGame: GameId | null;
  gameId: GameId | null;
  round: number;
  game: (BaseGameState & Record<string, unknown>) | null;
};

const STORAGE_KEY = "room-state";

function defaultState(code: string): ServerRoomState {
  return {
    code,
    hostId: null,
    players: [],
    status: "lobby",
    selectedGame: null,
    gameId: null,
    round: 0,
    game: null,
  };
}

export default class Room implements Party.Server {
  state: ServerRoomState;

  constructor(readonly room: Party.Room) {
    this.state = defaultState(room.id);
  }

  async onStart() {
    const saved = await this.room.storage.get<ServerRoomState>(STORAGE_KEY);
    if (saved) this.state = saved;
  }

  private async persist() {
    await this.room.storage.put(STORAGE_KEY, this.state);
  }

  private publicState(): PublicRoomState {
    return {
      code: this.state.code,
      hostId: this.state.hostId,
      players: this.state.players,
      status: this.state.status,
      selectedGame: this.state.selectedGame,
      round: this.state.round,
    };
  }

  private sendTo(conn: Party.Connection) {
    const connState = conn.state as ConnState | null;
    if (!connState?.playerId) return;
    const isHost = connState.playerId === this.state.hostId;
    const mod = this.state.gameId ? gameRegistry[this.state.gameId] : null;
    const game = mod && this.state.game ? mod.redact(this.state.game, connState.playerId) : null;
    const message: ServerMessage = {
      type: "state",
      room: this.publicState(),
      game,
      you: { id: connState.playerId, isHost },
    };
    conn.send(JSON.stringify(message));
  }

  private broadcastAll() {
    for (const conn of this.room.getConnections<ConnState>()) {
      this.sendTo(conn);
    }
  }

  private sendError(conn: Party.Connection, message: string) {
    const payload: ServerMessage = { type: "error", message };
    conn.send(JSON.stringify(payload));
  }

  onConnect(): void {
    // Wait for the client's `join` message before doing anything, since we
    // need their persisted playerId + display name.
  }

  async onClose(conn: Party.Connection) {
    const connState = conn.state as ConnState | null;
    const playerId = connState?.playerId;
    if (!playerId) return;

    const stillConnected = [...this.room.getConnections<ConnState>()].some(
      (c) => c.id !== conn.id && c.state?.playerId === playerId
    );
    if (stillConnected) return;

    const player = this.state.players.find((p) => p.id === playerId);
    if (player) player.connected = false;

    if (this.state.hostId === playerId) {
      const nextHost = this.state.players.find((p) => p.connected && p.id !== playerId);
      this.state.hostId = nextHost?.id ?? this.state.hostId;
    }

    await this.persist();
    this.broadcastAll();
  }

  async onMessage(raw: string | ArrayBuffer | ArrayBufferView, sender: Party.Connection) {
    if (typeof raw !== "string") return;
    let message: ClientMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    if (message.type === "join") {
      const name = message.name.trim().slice(0, 20) || "Player";
      let player = this.state.players.find((p) => p.id === message.playerId);
      if (!player) {
        player = { id: message.playerId, name, score: 0, connected: true };
        this.state.players.push(player);
        if (!this.state.hostId) this.state.hostId = player.id;
      } else {
        player.name = name;
        player.connected = true;
      }
      sender.setState({ playerId: message.playerId } satisfies ConnState);
      await this.persist();
      this.broadcastAll();
      return;
    }

    const connState = sender.state as ConnState | null;
    const playerId = connState?.playerId;
    if (!playerId) {
      this.sendError(sender, "Not joined yet.");
      return;
    }
    const isHost = playerId === this.state.hostId;

    switch (message.type) {
      case "select_game": {
        if (!isHost || this.state.status !== "lobby") return;
        if (!(message.gameId in gameRegistry)) return;
        this.state.selectedGame = message.gameId;
        break;
      }

      case "start_game": {
        if (!isHost || this.state.status !== "lobby" || !this.state.selectedGame) return;
        const mod = gameRegistry[this.state.selectedGame];
        const connectedPlayers = this.state.players.filter((p) => p.connected);
        if (connectedPlayers.length < mod.meta.minPlayers) {
          this.sendError(sender, `${mod.meta.label} needs at least ${mod.meta.minPlayers} players.`);
          return;
        }
        this.state.gameId = mod.meta.id;
        this.state.game = mod.next(null, this.state.players);
        this.state.status = "playing";
        this.state.round = this.state.game.round;
        break;
      }

      case "game_action": {
        if (this.state.status !== "playing" || !this.state.gameId || !this.state.game) return;
        const mod = gameRegistry[this.state.gameId];
        const wasRoundOver = this.state.game.roundOver;
        const nextGame = mod.action(this.state.game, playerId, message.payload, this.state.players);
        this.state.game = nextGame;
        if (!wasRoundOver && nextGame.roundOver) {
          for (const [pid, delta] of Object.entries(nextGame.scoreDeltas)) {
            const player = this.state.players.find((p) => p.id === pid);
            if (player) player.score += delta;
          }
        }
        break;
      }

      case "next_round": {
        if (!isHost || this.state.status !== "playing" || !this.state.gameId || !this.state.game) return;
        if (!this.state.game.roundOver) return;
        const mod = gameRegistry[this.state.gameId];
        this.state.game = mod.next(this.state.game, this.state.players);
        this.state.round = this.state.game.round;
        break;
      }

      case "end_game": {
        if (!isHost) return;
        this.state.status = "lobby";
        this.state.gameId = null;
        this.state.game = null;
        this.state.selectedGame = null;
        this.state.round = 0;
        break;
      }
    }

    await this.persist();
    this.broadcastAll();
  }
}
