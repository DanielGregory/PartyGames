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

/** The straight (horizontal/vertical/diagonal) line of cells between two
 * indices, inclusive - or null if they don't form one. Mirrors the
 * server's straightLine() for live drag preview; the server re-validates
 * authoritatively when the selection is submitted. */
function straightLine(start: number, end: number, gridSize: number): number[] | null {
  const r1 = Math.floor(start / gridSize), c1 = start % gridSize;
  const r2 = Math.floor(end / gridSize), c2 = end % gridSize;
  const dr = r2 - r1, dc = c2 - c1;
  if (dr === 0 && dc === 0) return [start];
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;

  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const stepR = Math.sign(dr), stepC = Math.sign(dc);
  const cells: number[] = [];
  for (let i = 0; i <= steps; i++) cells.push((r1 + stepR * i) * gridSize + (c1 + stepC * i));
  return cells;
}

export function WordSearchGame({ game, players, send }: GameProps) {
  const view = game as unknown as WordSearchView;
  const remainingMs = useCountdownMs(view.timerEndsAt);
  const timedOutRound = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ start: number; end: number } | null>(null);
  const draggingRef = useRef(false);
  const [selection, setSelection] = useState<number[]>([]);
  const [lastWord, setLastWord] = useState<string | null>(null);

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

  function cellAt(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const cellEl = el?.closest("[data-cell-index]") as HTMLElement | null;
    if (!cellEl) return null;
    const index = Number(cellEl.dataset.cellIndex);
    return Number.isNaN(index) ? null : index;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (view.stage !== "searching") return;
    gridRef.current?.setPointerCapture(e.pointerId);
    const index = cellAt(e.clientX, e.clientY);
    if (index === null) return;
    draggingRef.current = true;
    dragRef.current = { start: index, end: index };
    setSelection([index]);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || !dragRef.current) return;
    const index = cellAt(e.clientX, e.clientY);
    if (index === null) return;
    const line = straightLine(dragRef.current.start, index, view.gridSize);
    // Only update when the pointer is somewhere that still forms a straight
    // line with the start cell - otherwise keep the last valid line, so a
    // wobbly finger doesn't cancel the selection mid-drag.
    if (!line) return;
    dragRef.current.end = index;
    setSelection(line);
  }

  function endDrag() {
    if (!draggingRef.current || !dragRef.current) return;
    draggingRef.current = false;
    const { start, end } = dragRef.current;
    if (start !== end) {
      setLastWord(selection.map((c) => view.grid[c]).join(""));
      send({ type: "game_action", payload: { type: "select", startCell: start, endCell: end } });
    }
    dragRef.current = null;
    setSelection([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="font-semibold uppercase tracking-wide text-accent">
          {selection.length > 1
            ? selection.map((c) => view.grid[c]).join("")
            : lastWord
              ? `${lastWord} ✓`
              : "Drag across letters"}
        </span>
        {view.stage === "searching" && (
          <span className="font-mono font-semibold text-foreground">{formatCountdown(remainingMs)}</span>
        )}
      </div>

      <div
        ref={gridRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="touch-none select-none"
      >
        <Board
          columns={view.gridSize}
          cells={view.grid}
          disabled={view.stage === "reveal"}
          cellClassName={(_, index) => {
            if (selection.includes(index)) return "!border-accent !bg-accent/25";
            if (!highlighted.has(index)) return "";
            return highlighted.get(index)
              ? "!border-emerald-400 !bg-emerald-400/10"
              : "!border-amber-400/60 !bg-amber-400/10";
          }}
          renderCell={(letter) => <span className="text-sm font-semibold">{letter}</span>}
        />
      </div>

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
