"use client";

import { useState } from "react";
import type { RoomView } from "@/lib/useRoom";
import { CATEGORY_META, CATEGORY_ORDER, GAME_LIST, type GameCategory, type GameMeta } from "@/lib/gameMeta";
import { PlayerList } from "./PlayerList";
import { QRLink } from "./QRLink";
import { Button, Card } from "./ui";

function defaultSettings(game: GameMeta | null | undefined): Record<string, string | number> {
  const values: Record<string, string | number> = {};
  for (const setting of game?.settings ?? []) values[setting.key] = setting.default;
  return values;
}

function playerRangeLabel(game: GameMeta): string {
  if (game.maxPlayers === undefined) return `${game.minPlayers}+ players`;
  if (game.maxPlayers === game.minPlayers) return `Exactly ${game.minPlayers} players`;
  return `${game.minPlayers}-${game.maxPlayers} players`;
}

export function Lobby({ room, you, send, error }: RoomView & { room: NonNullable<RoomView["room"]>; you: NonNullable<RoomView["you"]> }) {
  const connectedCount = room.players.filter((p) => p.connected).length;
  const selected = room.selectedGame ? GAME_LIST.find((g) => g.id === room.selectedGame) : null;
  const tooFew = selected ? connectedCount < selected.minPlayers : false;
  // A cap doesn't block starting - it just means the host has to pick who
  // plays and everyone else watches.
  const needsSelection = selected?.maxPlayers !== undefined && connectedCount > selected.maxPlayers;
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [settingsValues, setSettingsValues] = useState<Record<string, string | number>>(() => defaultSettings(selected));
  // Collapsed by default - the landing screen shows just the 3 category
  // rows, not all 13 games at once. Opens to whichever category holds the
  // already-selected game, if any.
  const [openCategory, setOpenCategory] = useState<GameCategory | null>(selected?.category ?? null);

  // Reset the player picker and settings during render (not an effect) the
  // moment the host picks a different game, rather than carrying over a
  // stale selection/values from whatever was picked before.
  const [lastSelectedGame, setLastSelectedGame] = useState(room.selectedGame);
  if (room.selectedGame !== lastSelectedGame) {
    setLastSelectedGame(room.selectedGame);
    setActiveIds([]);
    setSettingsValues(defaultSettings(selected));
    setOpenCategory(selected?.category ?? null);
  }

  const selectionValid =
    !needsSelection ||
    (selected && activeIds.length >= selected.minPlayers && activeIds.length <= (selected.maxPlayers ?? Infinity));
  const canStart = Boolean(selected) && !tooFew && Boolean(selectionValid);

  function togglePlayer(id: string) {
    setActiveIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (selected?.maxPlayers !== undefined && prev.length >= selected.maxPlayers) return prev;
      return [...prev, id];
    });
  }

  function startGame() {
    send({
      type: "start_game",
      config: settingsValues,
      activePlayerIds: needsSelection ? activeIds : undefined,
    });
  }

  function startButtonLabel(): string {
    if (!selected) return "Pick a game to start";
    if (tooFew) return `Need ${selected.minPlayers}+ players`;
    if (needsSelection && !selectionValid) {
      return selected.minPlayers === selected.maxPlayers
        ? `Pick ${selected.minPlayers} players`
        : `Pick ${selected.minPlayers}-${selected.maxPlayers} players`;
    }
    return `Start ${selected.label}`;
  }

  return (
    <main className="animate-fade-slide-in mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
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
        <PlayerList players={room.players} hostId={room.hostId} youId={you.id} showScores />
      </div>

      {you.isHost ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-muted">Pick a game</p>
          {CATEGORY_ORDER.map((category) => {
            const games = GAME_LIST.filter((g) => g.category === category);
            if (games.length === 0) return null;
            const meta = CATEGORY_META[category];
            const isOpen = openCategory === category;
            const selectedHere = selected?.category === category ? selected : null;
            return (
              <div key={category} className="flex flex-col gap-2">
                <button
                  onClick={() => setOpenCategory(isOpen ? null : category)}
                  className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors ${
                    isOpen ? "border-accent bg-accent/10" : "border-card-border bg-card hover:border-accent/50"
                  }`}
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-lg font-semibold">
                      {meta.emoji} {meta.label}
                    </span>
                    <span className="text-xs text-muted">
                      {selectedHere ? `Selected: ${selectedHere.emoji} ${selectedHere.label}` : `${games.length} games`}
                    </span>
                  </span>
                  <span
                    className={`text-xl text-muted transition-transform ${isOpen ? "rotate-90" : ""}`}
                  >
                    ›
                  </span>
                </button>

                {isOpen && (
                  <div className="animate-fade-slide-in flex flex-col gap-2 pl-1">
                    {games.map((game) => {
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
                          <span className="text-xs text-muted">{playerRangeLabel(game)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {selected?.settings?.map((setting) => (
            <div key={setting.key} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-muted">{setting.label}</p>
              <div className="flex flex-wrap gap-2">
                {setting.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSettingsValues((prev) => ({ ...prev, [setting.key]: option.value }))}
                    className={`flex-1 rounded-xl border px-3 py-2 font-semibold transition-colors ${
                      settingsValues[setting.key] === option.value
                        ? "border-accent bg-accent/10"
                        : "border-card-border bg-card hover:border-accent/50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {needsSelection && selected && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-muted">
                Choose {playerRangeLabel(selected).toLowerCase()} to play ({activeIds.length} selected)
              </p>
              <div className="flex flex-col gap-2">
                {room.players
                  .filter((p) => p.connected)
                  .map((p) => {
                    const isPicked = activeIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePlayer(p.id)}
                        className={`rounded-xl border px-4 py-3 text-left font-medium transition-colors ${
                          isPicked
                            ? "border-accent bg-accent/10"
                            : "border-card-border bg-card hover:border-accent/50"
                        }`}
                      >
                        {p.name} {p.id === you.id && <span className="text-muted">(you)</span>}
                      </button>
                    );
                  })}
              </div>
              <p className="text-center text-xs text-muted">Everyone else will spectate.</p>
            </div>
          )}

          <Button disabled={!canStart} onClick={startGame}>
            {startButtonLabel()}
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
