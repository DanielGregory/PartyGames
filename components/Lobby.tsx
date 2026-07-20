"use client";

import type { RoomView } from "@/lib/useRoom";
import { GAME_LIST } from "@/lib/gameMeta";
import { PlayerList } from "./PlayerList";
import { QRLink } from "./QRLink";
import { Button, Card } from "./ui";

export function Lobby({ room, you, send, error }: RoomView & { room: NonNullable<RoomView["room"]>; you: NonNullable<RoomView["you"]> }) {
  const connectedCount = room.players.filter((p) => p.connected).length;
  const selected = room.selectedGame ? GAME_LIST.find((g) => g.id === room.selectedGame) : null;
  const canStart = selected ? connectedCount >= selected.minPlayers : false;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div className="text-center">
        <p className="text-sm text-muted">Room code</p>
        <p className="text-5xl font-extrabold tracking-[0.2em]">{room.code}</p>
      </div>

      <Card className="flex flex-col items-center">
        <QRLink code={room.code} />
      </Card>

      <div>
        <p className="mb-2 text-sm font-semibold text-muted">
          Players ({connectedCount})
        </p>
        <PlayerList players={room.players} hostId={room.hostId} youId={you.id} />
      </div>

      {you.isHost ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-muted">Pick a game</p>
          {GAME_LIST.map((game) => {
            const isSelected = room.selectedGame === game.id;
            return (
              <button
                key={game.id}
                onClick={() => send({ type: "select_game", gameId: game.id })}
                className={`flex flex-col gap-1 rounded-2xl border px-5 py-4 text-left transition-colors ${
                  isSelected
                    ? "border-accent bg-accent/10"
                    : "border-card-border bg-card hover:border-accent/50"
                }`}
              >
                <span className="text-lg font-semibold">
                  {game.emoji} {game.label}
                </span>
                <span className="text-sm text-muted">{game.description}</span>
                <span className="text-xs text-muted">{game.minPlayers}+ players</span>
              </button>
            );
          })}

          <Button
            disabled={!canStart}
            onClick={() => send({ type: "start_game" })}
          >
            {selected
              ? canStart
                ? `Start ${selected.label}`
                : `Need ${selected.minPlayers}+ players`
              : "Pick a game to start"}
          </Button>
        </div>
      ) : (
        <Card className="text-center text-muted">
          {selected
            ? `Waiting for the host to start ${selected.label}…`
            : "Waiting for the host to pick a game…"}
        </Card>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </main>
  );
}
