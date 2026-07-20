"use client";

import usePartySocket from "partysocket/react";
import { useCallback, useRef, useState } from "react";
import type { BaseGameState, ClientMessage, PublicRoomState } from "@/party/types";
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

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

export function useRoom(code: string, name: string): RoomView {
  const playerId = useRef(getOrCreatePlayerId()).current;
  const [room, setRoom] = useState<PublicRoomState | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [you, setYou] = useState<{ id: string; isHost: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: code,
    onOpen() {
      const join: ClientMessage = { type: "join", playerId, name };
      socket.send(JSON.stringify(join));
    },
    onMessage(event: MessageEvent<string>) {
      const message = JSON.parse(event.data);
      if (message.type === "state") {
        setRoom(message.room);
        setGame(message.game);
        setYou(message.you);
        setError(null);
      } else if (message.type === "error") {
        setError(message.message);
      }
    },
  });

  const send = useCallback(
    (message: ClientMessage) => socket.send(JSON.stringify(message)),
    [socket]
  );

  return { connected: room !== null, room, game, you, error, send };
}
