"use client";

import { useEffect, useRef, useState } from "react";
import type { Player } from "@/server/types";

export function PlayerList({
  players,
  hostId,
  youId,
  showScores = false,
}: {
  players: Player[];
  hostId: string | null;
  youId?: string;
  showScores?: boolean;
}) {
  const sorted = showScores ? [...players].sort((a, b) => b.score - a.score) : players;
  const prevScores = useRef<Record<string, number> | null>(null);
  const [popups, setPopups] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!showScores) return;
    const prev = prevScores.current;
    prevScores.current = Object.fromEntries(players.map((p) => [p.id, p.score]));
    if (!prev) return; // don't pop up on first mount, only on real increases

    const gained = players.filter((p) => (prev[p.id] ?? p.score) < p.score);
    if (gained.length === 0) return;

    setPopups((existing) => {
      const next = { ...existing };
      for (const p of gained) next[p.id] = p.score - (prev[p.id] ?? p.score);
      return next;
    });
    const ids = gained.map((p) => p.id);
    const timeout = setTimeout(() => {
      setPopups((existing) => {
        const next = { ...existing };
        for (const id of ids) delete next[id];
        return next;
      });
    }, 1100);
    return () => clearTimeout(timeout);
  }, [players, showScores]);

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((player) => (
        <li
          key={player.id}
          className="flex items-center justify-between rounded-2xl border border-card-border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                player.connected ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <span className="font-medium">
              {player.name}
              {player.id === youId && <span className="text-muted"> (you)</span>}
            </span>
            {player.id === hostId && <span title="Host">👑</span>}
          </div>
          {showScores && (
            <span className="relative font-mono font-semibold text-accent">
              {player.score}
              {popups[player.id] !== undefined && (
                <span className="animate-float-up-fade pointer-events-none absolute -top-1 right-0 text-sm font-bold text-emerald-400">
                  +{popups[player.id]}
                </span>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
