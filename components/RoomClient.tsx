"use client";

import { useState } from "react";
import { saveName, useSavedName } from "@/lib/session";
import { useRoom } from "@/lib/useRoom";
import { Button, TextField } from "./ui";
import { Lobby } from "./Lobby";
import { GameShell } from "./GameShell";

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center text-muted">
      {children}
    </main>
  );
}

function NameGate({ code, onJoin }: { code: string; onJoin: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm text-muted">Joining room</p>
          <p className="text-4xl font-extrabold tracking-[0.2em]">{code}</p>
        </div>
        <div className="flex flex-col gap-4">
          <TextField
            placeholder="Your name"
            value={name}
            maxLength={20}
            autoComplete="off"
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <Button disabled={!name.trim()} onClick={() => onJoin(name.trim())}>
            Join room
          </Button>
        </div>
      </div>
    </main>
  );
}

function ConnectedRoom({ code, name }: { code: string; name: string }) {
  const view = useRoom(code, name);
  const { room, you, game, connected } = view;

  if (!connected || !room || !you) {
    return <CenteredMessage>Connecting to room {code}…</CenteredMessage>;
  }

  if (room.status === "playing" && game) {
    return <GameShell {...view} room={room} you={you} game={game} />;
  }

  return <Lobby {...view} room={room} you={you} />;
}

export function RoomClient({ code }: { code: string }) {
  const savedName = useSavedName();
  const [manualName, setManualName] = useState<string | null>(null);
  const name = manualName ?? savedName;

  if (!name) {
    return (
      <NameGate
        code={code}
        onJoin={(n) => {
          saveName(n);
          setManualName(n);
        }}
      />
    );
  }

  return <ConnectedRoom code={code} name={name} />;
}
