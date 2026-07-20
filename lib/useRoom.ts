"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BaseGameState, ClientMessage, PublicRoomState, ServerMessage } from "@/server/types";
import { getSupabaseBrowserClient } from "./supabase/client";
import { getOrCreatePlayerId } from "./session";

export type GameView = BaseGameState & Record<string, unknown>;

export type RoomView = {
  connected: boolean;
  room: PublicRoomState | null;
  game: GameView | null;
  you: { id: string; isHost: boolean } | null;
  error: string | null;
  send: (message: ClientMessage) => void;
};

const HEARTBEAT_MS = 8_000;

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; data: T | { error?: string } }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function useRoom(code: string, name: string): RoomView {
  const [playerId] = useState(() => getOrCreatePlayerId());
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [you, setYou] = useState<{ id: string; isHost: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let cancelled = false;
    let heartbeatId: ReturnType<typeof setInterval> | undefined;

    async function start() {
      const { ok, data } = await postJson<{ privateToken: string }>(`/api/rooms/${code}/join`, {
        playerId,
        name,
      });
      if (cancelled) return;
      if (!ok || !("privateToken" in data)) {
        setError(("error" in data && data.error) || "Failed to join the room.");
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const channel = supabase.channel(`room-${code}-${data.privateToken}`);
      channel.on("broadcast", { event: "state" }, ({ payload }: { payload: ServerMessage }) => {
        setRoom(payload.room);
        setGame(payload.game);
        setYou(payload.you);
        setError(null);
      });
      channel.subscribe();
      channelRef.current = channel;

      heartbeatId = setInterval(() => {
        postJson(`/api/rooms/${code}/heartbeat`, { playerId }).catch(() => {});
      }, HEARTBEAT_MS);
    }

    start();

    return () => {
      cancelled = true;
      if (heartbeatId) clearInterval(heartbeatId);
      if (channelRef.current) {
        getSupabaseBrowserClient().removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [code, playerId, name]);

  function send(message: ClientMessage) {
    postJson<{ ok: true }>(`/api/rooms/${code}/messages`, { playerId, message }).then(({ ok, data }) => {
      if (!ok) setError(("error" in data && data.error) || "Something went wrong.");
    });
  }

  return { connected: room !== null, room, game, you, error, send };
}
