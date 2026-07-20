"use client";

import type { Player } from "@/server/types";
import { PlayerList } from "./PlayerList";

export function ScoreboardOverlay({
  players,
  hostId,
  youId,
  onClose,
}: {
  players: Player[];
  hostId: string | null;
  youId: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] flex-col gap-4 rounded-t-3xl border border-card-border bg-background p-5 sm:w-full sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">🏆 Scoreboard</p>
          <button onClick={onClose} className="text-sm font-semibold text-muted hover:text-foreground">
            Close
          </button>
        </div>
        <p className="-mt-2 text-xs text-muted">Running totals across every game this session.</p>
        <div className="overflow-y-auto">
          <PlayerList players={players} hostId={hostId} youId={youId} showScores />
        </div>
      </div>
    </div>
  );
}
