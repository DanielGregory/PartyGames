"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from "@/lib/roomCode";
import { saveName, useSavedName } from "@/lib/session";
import { Button, TextField } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const savedName = useSavedName();
  const [name, setName] = useState("");
  const [synced, setSynced] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Adjust local state during render (not an effect) the first time the
  // client's saved name becomes available, so hydration stays SSR-safe.
  if (!synced && savedName) {
    setSynced(true);
    setName(savedName);
  }

  function requireName(): string | null {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your name first");
      return null;
    }
    return trimmed;
  }

  function handleCreate() {
    const trimmed = requireName();
    if (!trimmed) return;
    saveName(trimmed);
    router.push(`/room/${generateRoomCode()}`);
  }

  function handleJoin() {
    const trimmed = requireName();
    if (!trimmed) return;
    const normalized = normalizeRoomCode(code);
    if (!isValidRoomCode(normalized)) {
      setError("Room code should be 4 letters");
      return;
    }
    saveName(trimmed);
    router.push(`/room/${normalized}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">🎉 PartyGames</h1>
          <p className="mt-2 text-muted">Games for the whole room. No account needed.</p>
        </div>

        <div className="flex flex-col gap-4">
          <TextField
            placeholder="Your name"
            value={name}
            maxLength={20}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />

          <Button onClick={handleCreate}>Create a room</Button>

          <div className="flex items-center gap-3 py-1 text-muted">
            <div className="h-px flex-1 bg-card-border" />
            <span className="text-sm">or join one</span>
            <div className="h-px flex-1 bg-card-border" />
          </div>

          <TextField
            placeholder="Room code"
            value={code}
            maxLength={4}
            autoComplete="off"
            autoCapitalize="characters"
            className="text-center tracking-[0.5em] uppercase"
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError("");
            }}
          />
          <Button variant="secondary" onClick={handleJoin}>
            Join room
          </Button>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </main>
  );
}
