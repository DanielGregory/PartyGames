"use client";

import { useEffect, useRef, useState } from "react";
import { Board } from "../Board";
import { GameProps, nameOf } from "./types";
import { formatCountdown, useCountdownMs } from "@/lib/useCountdown";

type BoggleView = {
  stage: "playing" | "reveal";
  round: number;
  gridSize: number;
  grid: string[];
  timerEndsAt: number;
  totalWordsFound: number;
  yourWords?: string[];
  foundWords?: Record<string, string[]>;
};

function pointsForLength(length: number): number {
  if (length <= 4) return 1;
  if (length === 5) return 2;
  if (length === 6) return 3;
  if (length === 7) return 5;
  return 11;
}

function isAdjacent(a: number, b: number, gridSize: number): boolean {
  if (a === b) return false;
  const r1 = Math.floor(a / gridSize), c1 = a % gridSize;
  const r2 = Math.floor(b / gridSize), c2 = b % gridSize;
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1;
}

export function BoggleGame({ game, players, send }: GameProps) {
  const view = game as unknown as BoggleView;
  const remainingMs = useCountdownMs(view.timerEndsAt);
  const timedOutRound = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<number[]>([]);
  const draggingRef = useRef(false);
  const [path, setPath] = useState<number[]>([]);
  const [lastWord, setLastWord] = useState<string | null>(null);

  useEffect(() => {
    if (view.stage !== "playing") return;
    if (remainingMs > 0) return;
    if (timedOutRound.current === view.round) return;
    timedOutRound.current = view.round;
    send({ type: "game_action", payload: { type: "time_up" } });
  }, [remainingMs, view.stage, view.round, send]);

  function cellAt(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const cellEl = el?.closest("[data-cell-index]") as HTMLElement | null;
    if (!cellEl) return null;
    const index = Number(cellEl.dataset.cellIndex);
    return Number.isNaN(index) ? null : index;
  }

  function extend(index: number) {
    const current = pathRef.current;
    let next = current;
    if (current.length === 0) {
      next = [index];
    } else {
      const backIndex = current.indexOf(index);
      if (backIndex !== -1) {
        // dragging back over an earlier cell in the path un-does to there
        next = current.slice(0, backIndex + 1);
      } else if (isAdjacent(current[current.length - 1], index, view.gridSize)) {
        next = [...current, index];
      }
    }
    if (next !== current) {
      pathRef.current = next;
      setPath(next);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (view.stage !== "playing") return;
    gridRef.current?.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    const index = cellAt(e.clientX, e.clientY);
    const next = index !== null ? [index] : [];
    pathRef.current = next;
    setPath(next);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const index = cellAt(e.clientX, e.clientY);
    if (index !== null) extend(index);
  }

  function endDrag() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const finalPath = pathRef.current;
    if (finalPath.length > 0) {
      setLastWord(finalPath.map((c) => view.grid[c]).join(""));
      send({ type: "game_action", payload: { type: "submit_path", cells: finalPath } });
    }
    pathRef.current = [];
    setPath([]);
  }

  if (view.stage === "playing") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{view.totalWordsFound} words found so far</span>
          <span className="font-mono font-semibold text-foreground">{formatCountdown(remainingMs)}</span>
        </div>

        <p className="text-center text-lg font-bold uppercase tracking-wide text-accent">
          {path.length > 0 ? path.map((c) => view.grid[c]).join("") : lastWord ? `${lastWord} ✓` : "Drag across letters"}
        </p>

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
            renderCell={(letter) => letter}
            className="mx-auto max-w-xs"
            cellClassName={(_, index) => (path.includes(index) ? "!border-accent !bg-accent/25" : "")}
            getCellKey={(_, index) => index}
          />
        </div>

        {view.yourWords && view.yourWords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {view.yourWords.map((word) => (
              <span
                key={word}
                className="rounded-full border border-card-border bg-card px-3 py-1 text-sm uppercase"
              >
                {word}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const entries = Object.entries(view.foundWords ?? {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="flex flex-col gap-4">
      <Board columns={view.gridSize} cells={view.grid} renderCell={(letter) => letter} className="mx-auto max-w-xs" />
      <div className="flex flex-col gap-2">
        {entries.map(([word, finders]) => {
          const unique = finders.length === 1;
          return (
            <div
              key={word}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                unique ? "border-emerald-400 bg-emerald-400/10" : "border-card-border bg-card opacity-60"
              }`}
            >
              <div>
                <p className={`font-semibold uppercase ${unique ? "" : "line-through"}`}>{word}</p>
                <p className="text-sm text-muted">{finders.map((id) => nameOf(players, id)).join(", ")}</p>
              </div>
              <span className={unique ? "text-emerald-400" : "text-muted"}>
                {unique ? `+${pointsForLength(word.length)}` : "no score"}
              </span>
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-center text-muted">Nobody found any words!</p>}
      </div>
    </div>
  );
}
