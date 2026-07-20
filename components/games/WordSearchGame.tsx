"use client";

import { useEffect, useRef, useState } from "react";
import { Board } from "../Board";
import { Card } from "../ui";
import { GameProps, nameOf } from "./types";
import { formatCountdown, useCountdownMs } from "@/lib/useCountdown";

type WordSearchView = {
  stage: "searching" | "reveal";
  round: number;
  gridSize: number;
  grid: string[];
  targetWords: string[];
  timerEndsAt: number;
  foundWords: Record<string, { playerId: string; cells: number[] }>;
  solution?: Record<string, number[]>;
};

export function WordSearchGame({ game, players, send }: GameProps) {
  const view = game as unknown as WordSearchView;
  const remainingMs = useCountdownMs(view.timerEndsAt);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const timedOutRound = useRef<number | null>(null);

  useEffect(() => {
    if (view.stage !== "searching") return;
    if (remainingMs > 0) return;
    if (timedOutRound.current === view.round) return;
    timedOutRound.current = view.round;
    send({ type: "game_action", payload: { type: "time_up" } });
  }, [remainingMs, view.stage, view.round, send]);

  // At reveal, show every word's location (found or not); mid-round, only
  // found ones - unfound placements stay off the wire entirely until then.
  const highlighted = new Map<number, boolean>(); // cell -> was actually found by someone
  if (view.stage === "reveal" && view.solution) {
    for (const [word, cells] of Object.entries(view.solution)) {
      const found = Boolean(view.foundWords?.[word]);
      for (const cell of cells) highlighted.set(cell, found);
    }
  } else {
    for (const entry of Object.values(view.foundWords ?? {})) {
      for (const cell of entry.cells) highlighted.set(cell, true);
    }
  }

  function handleCellClick(index: number) {
    if (view.stage !== "searching") return;
    if (selectionStart === null) {
      setSelectionStart(index);
      return;
    }
    send({ type: "game_action", payload: { type: "select", startCell: selectionStart, endCell: index } });
    setSelectionStart(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end text-sm text-muted">
        {view.stage === "searching" && (
          <span className="font-mono font-semibold text-foreground">{formatCountdown(remainingMs)}</span>
        )}
      </div>

      <Board
        columns={view.gridSize}
        cells={view.grid}
        onCellClick={(_, index) => handleCellClick(index)}
        disabled={view.stage === "reveal"}
        cellClassName={(_, index) => {
          if (index === selectionStart) return "!border-accent !bg-accent/20";
          if (!highlighted.has(index)) return "";
          return highlighted.get(index)
            ? "!border-emerald-400 !bg-emerald-400/10"
            : "!border-amber-400/60 !bg-amber-400/10";
        }}
        renderCell={(letter) => <span className="text-sm font-semibold">{letter}</span>}
      />

      <Card>
        <p className="mb-2 text-sm font-semibold text-muted">Find these words</p>
        <div className="flex flex-wrap gap-2">
          {view.targetWords.map((word) => {
            const found = view.foundWords?.[word];
            return (
              <span
                key={word}
                className={`rounded-full border px-3 py-1 text-sm ${
                  found
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-400 line-through"
                    : "border-card-border bg-card"
                }`}
              >
                {word}
                {found && <span className="ml-1 no-underline">· {nameOf(players, found.playerId)}</span>}
              </span>
            );
          })}
        </div>
      </Card>

      {view.stage === "reveal" && view.solution && (
        <Card className="text-center text-muted">
          {Object.keys(view.foundWords ?? {}).length === view.targetWords.length
            ? "All words found!"
            : "Time's up — unfound words are shown on the grid above."}
        </Card>
      )}
    </div>
  );
}
