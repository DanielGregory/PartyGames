import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { gameRegistry } from "./games/registry";
import type {
  BaseGameState,
  ClientMessage,
  GameId,
  Player,
  PublicRoomState,
  RoomStatus,
  ServerMessage,
} from "./types";

// A player stays "connected" as long as we've heard from them (any API call)
// within this window. There's no persistent connection to this server the
// way a websocket would give us, so liveness is tracked via a heartbeat the
// client pings on an interval well under this threshold.
const CONNECTED_WINDOW_MS = 20_000;

type ServerPlayer = Omit<Player, "connected"> & {
  privateToken: string;
  lastSeenAt: number;
};

type RoomRow = {
  code: string;
  host_id: string | null;
  status: RoomStatus;
  selected_game: GameId | null;
  game_id: GameId | null;
  round: number;
  game_state: (BaseGameState & Record<string, unknown>) | null;
  players: ServerPlayer[];
};

function defaultRoom(code: string): RoomRow {
  return {
    code,
    host_id: null,
    status: "lobby",
    selected_game: null,
    game_id: null,
    round: 0,
    game_state: null,
    players: [],
  };
}

async function loadRoom(code: string): Promise<RoomRow> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
  return (data as RoomRow | null) ?? defaultRoom(code);
}

async function saveRoom(room: RoomRow): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("rooms")
    .upsert({ ...room, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to save room: ${error.message}`);
}

function withComputedConnected(players: ServerPlayer[]): Player[] {
  const now = Date.now();
  return players.map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    connected: now - p.lastSeenAt < CONNECTED_WINDOW_MS,
  }));
}

function publicState(room: RoomRow, players: Player[]): PublicRoomState {
  return {
    code: room.code,
    hostId: room.host_id,
    players,
    status: room.status,
    selectedGame: room.selected_game,
    round: room.round,
  };
}

function messageFor(room: RoomRow, players: Player[], sp: ServerPlayer): ServerMessage {
  const mod = room.game_id ? gameRegistry[room.game_id] : null;
  const game = mod && room.game_state ? mod.redact(room.game_state, sp.id) : null;
  return {
    type: "state",
    room: publicState(room, players),
    game,
    you: { id: sp.id, isHost: sp.id === room.host_id },
  };
}

async function broadcastAll(room: RoomRow, opts: { skip?: string } = {}): Promise<void> {
  const supabase = getSupabaseServerClient();
  const players = withComputedConnected(room.players);

  await Promise.all(
    room.players
      .filter((sp) => sp.id !== opts.skip)
      .map(async (sp) => {
        const message = messageFor(room, players, sp);
        // httpSend always goes over REST, which is what a stateless
        // serverless function needs (no persistent websocket to reuse).
        const channel = supabase.channel(`room-${room.code}-${sp.privateToken}`);
        try {
          await channel.httpSend("state", message);
        } finally {
          await supabase.removeChannel(channel);
        }
      })
  );
}

export async function joinRoom(
  code: string,
  playerId: string,
  name: string
): Promise<{ privateToken: string; initial: ServerMessage }> {
  const room = await loadRoom(code);
  let sp = room.players.find((p) => p.id === playerId);
  const cleanName = name.trim().slice(0, 20) || "Player";

  if (!sp) {
    sp = {
      id: playerId,
      name: cleanName,
      score: 0,
      privateToken: randomUUID(),
      lastSeenAt: Date.now(),
    };
    room.players.push(sp);
    if (!room.host_id) room.host_id = sp.id;
  } else {
    sp.name = cleanName;
    sp.lastSeenAt = Date.now();
  }

  await saveRoom(room);
  // The joiner gets their own state directly in the response rather than
  // relying on the broadcast below: their Realtime channel can't possibly be
  // subscribed yet (they don't even have the privateToken until this
  // function returns), so a broadcast sent now would be missed entirely.
  const initial = messageFor(room, withComputedConnected(room.players), sp);
  await broadcastAll(room, { skip: sp.id });
  return { privateToken: sp.privateToken, initial };
}

export async function heartbeat(code: string, playerId: string): Promise<void> {
  const room = await loadRoom(code);
  const sp = room.players.find((p) => p.id === playerId);
  if (!sp) return;
  sp.lastSeenAt = Date.now();
  await saveRoom(room);
}

export class RoomActionError extends Error {}

export async function handleMessage(
  code: string,
  playerId: string,
  message: ClientMessage
): Promise<void> {
  const room = await loadRoom(code);
  const sp = room.players.find((p) => p.id === playerId);
  if (!sp) throw new RoomActionError("Not joined yet.");
  sp.lastSeenAt = Date.now();

  const players = withComputedConnected(room.players);
  const isHost = playerId === room.host_id;

  switch (message.type) {
    case "select_game": {
      if (!isHost || room.status !== "lobby") break;
      if (!(message.gameId in gameRegistry)) break;
      room.selected_game = message.gameId;
      break;
    }

    case "start_game": {
      if (!isHost || room.status !== "lobby" || !room.selected_game) break;
      const mod = gameRegistry[room.selected_game];
      const connectedPlayers = players.filter((p) => p.connected);
      if (connectedPlayers.length < mod.meta.minPlayers) {
        throw new RoomActionError(`${mod.meta.label} needs at least ${mod.meta.minPlayers} players.`);
      }
      room.game_id = mod.meta.id;
      room.game_state = mod.next(null, players);
      room.status = "playing";
      room.round = room.game_state.round;
      break;
    }

    case "game_action": {
      if (room.status !== "playing" || !room.game_id || !room.game_state) break;
      const mod = gameRegistry[room.game_id];
      const wasRoundOver = room.game_state.roundOver;
      const nextGame = mod.action(room.game_state, playerId, message.payload, players);
      room.game_state = nextGame;
      if (!wasRoundOver && nextGame.roundOver) {
        for (const [pid, delta] of Object.entries(nextGame.scoreDeltas)) {
          const player = room.players.find((p) => p.id === pid);
          if (player) player.score += delta;
        }
      }
      break;
    }

    case "next_round": {
      if (!isHost || room.status !== "playing" || !room.game_id || !room.game_state) break;
      if (!room.game_state.roundOver) break;
      const mod = gameRegistry[room.game_id];
      room.game_state = mod.next(room.game_state, players);
      room.round = room.game_state.round;
      break;
    }

    case "end_game": {
      if (!isHost) break;
      room.status = "lobby";
      room.game_id = null;
      room.game_state = null;
      room.selected_game = null;
      room.round = 0;
      break;
    }
  }

  await saveRoom(room);
  await broadcastAll(room);
}
