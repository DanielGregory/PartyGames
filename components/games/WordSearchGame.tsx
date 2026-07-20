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

type Circle = { key: string; left: number; top: number; length: number; thickness: number; angle: number };

/** Measures the start/end cells of each found word and returns a rotated
 * pill/capsule overlay (a "circled word" look, like a real word search
 * puzzle) instead of a flat background tint. Recomputes on resize since
 * it depends on actual rendered cell positions, not just grid math. */
function useWordCircles(
  gridRef: React.RefObject<HTMLDivElement | null>,
  words: { key: string; cells: number[] }[]
): Circle[] {
  const [circles, setCircles] = useState<Circle[]>([]);
  const wordsKey = words.map((w) => `${w.key}:${w.cells[0]}-${w.cells[w.cells.length - 1]}`).join(",");

  useEffect(() => {
    const container = gridRef.current;
    if (!container) return;

    function recompute() {
      const containerRect = container!.getBoundingClientRect();
      if (containerRect.width === 0) return;
      const next: Circle[] = [];
      for (const { key, cells } of words) {
        if (cells.length === 0) continue;
        const startEl = container!.querySelector(`[data-cell-index="${cells[0]}"]`) as HTMLElement | null;
        const endEl = container!.querySelector(
          `[data-cell-index="${cells[cells.length - 1]}"]`
        ) as HTMLElement | null;
        if (!startEl || !endEl) continue;
        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();
        const startX = startRect.left + startRect.width / 2 - containerRect.left;
        const startY = startRect.top + startRect.height / 2 - containerRect.top;
        const endX = endRect.left + endRect.width / 2 - containerRect.left;
        const endY = endRect.top + endRect.height / 2 - containerRect.top;
        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        next.push({
          key,
          left: (startX + endX) / 2,
          top: (startY + endY) / 2,
          length: dist + startRect.width,
          thickness: startRect.height * 0.8,
          angle: (Math.atan2(dy, dx) * 180) / Math.PI,
        });
      }
      setCircles(next);
    }

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridRef, wordsKey]);

  return circles;
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

  // Found words get circled (see useWordCircles) rather than background-
  // tinted. At reveal, words nobody found are still shown as a flat amber
  // highlight - they're the "here's what you missed" answer key, not a
  // triumphant circle.
  const unfoundAtReveal = new Set<number>();
  if (view.stage === "reveal" && view.solution) {
    for (const [word, cells] of Object.entries(view.solution)) {
      if (view.foundWords?.[word]) continue;
      for (const cell of cells) unfoundAtReveal.add(cell);
    }
  }

  const foundEntries = Object.entries(view.foundWords ?? {}).map(([word, entry]) => ({
    key: word,
    cells: entry.cells,
  }));
  const circles = useWordCircles(gridRef, foundEntries);

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
        className="relative touch-none select-none"
      >
        <Board
          columns={view.gridSize}
          cells={view.grid}
          disabled={view.stage === "reveal"}
          cellClassName={(_, index) => {
            if (selection.includes(index)) return "!border-accent !bg-accent/25";
            if (unfoundAtReveal.has(index)) return "!border-amber-400/60 !bg-amber-400/10";
            return "";
          }}
          renderCell={(letter) => <span className="text-sm font-semibold">{letter}</span>}
        />
        {circles.map((c) => (
          <div
            key={c.key}
            className="pointer-events-none absolute rounded-full border-2 border-emerald-400/80 bg-emerald-400/10"
            style={{
              left: c.left,
              top: c.top,
              width: c.length,
              height: c.thickness,
              transform: `translate(-50%, -50%) rotate(${c.angle}deg)`,
            }}
          />
        ))}
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
