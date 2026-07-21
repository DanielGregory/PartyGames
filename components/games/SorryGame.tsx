"use client";

import { useState } from "react";
import { Board } from "../Board";
import { Card } from "../ui";
import { GameProps, nameOf } from "./types";

type PawnState = { progress: number };
type LegalMove = {
  pawnIndex: number;
  newProgress: number;
  bump?: { playerId: string; pawnIndex: number };
  swap?: { playerId: string; pawnIndex: number; newProgress: number };
};

type SorryView = {
  stage: "playing" | "reveal";
  currentTurn: string | null;
  winner: string | null;
  trackLength: number;
  safetyLength: number;
  colorOffsets: Record<string, number>;
  pawns: Record<string, PawnState[]>;
  isYourTurn: boolean;
  yourCard: number | "sorry" | null;
  hasCard: boolean;
  legalMoves: LegalMove[];
  players: string[];
};

const PAWN_COLORS = ["bg-red-500", "bg-blue-500", "bg-amber-400", "bg-emerald-500"];

function isOnMainLoop(progress: number, trackLength: number): boolean {
  return progress >= 0 && progress < trackLength;
}

function absoluteOf(offset: number, progress: number, trackLength: number): number | null {
  if (!isOnMainLoop(progress, trackLength)) return null;
  return (offset + progress) % trackLength;
}

function pawnLabel(progress: number, trackLength: number, safetyLength: number): string {
  if (progress === -1) return "Start";
  if (progress === trackLength + safetyLength) return "Home";
  if (progress >= trackLength) return `Safety ${progress - trackLength + 1}`;
  return `Sq ${progress}`;
}

export function SorryGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as SorryView;
  const [pendingPawn, setPendingPawn] = useState<number | null>(null);

  const colorOrder = Object.entries(view.colorOffsets)
    .sort((a, b) => a[1] - b[1])
    .map(([pid]) => pid);
  const colorIndex = (pid: string) => colorOrder.indexOf(pid);

  const mainLoop: (string | null)[] = new Array(view.trackLength).fill(null);
  for (const [pid, pawns] of Object.entries(view.pawns)) {
    for (const p of pawns) {
      const abs = absoluteOf(view.colorOffsets[pid], p.progress, view.trackLength);
      if (abs !== null) mainLoop[abs] = pid;
    }
  }

  // Hop whichever main-loop cells just changed occupant (a move, a bump,
  // an exit from start, or a step into safety leaving the loop). Computed
  // during render (React's documented pattern for "derive state from a
  // changed value") rather than in an effect, comparing against the last
  // rendered snapshot kept in state - avoids a setState-in-effect entirely.
  const mainLoopKey = mainLoop.join(",");
  const [justMoved, setJustMoved] = useState<Set<number>>(new Set());
  const [lastMainLoopKey, setLastMainLoopKey] = useState<string | null>(null);
  if (mainLoopKey !== lastMainLoopKey) {
    const changed = new Set<number>();
    if (lastMainLoopKey !== null) {
      const prevCells = lastMainLoopKey.split(",");
      for (let i = 0; i < mainLoop.length; i++) {
        if (prevCells[i] !== (mainLoop[i] ?? "")) changed.add(i);
      }
    }
    setLastMainLoopKey(mainLoopKey);
    setJustMoved(changed);
  }

  // Same idea for each player's safety/home counts, which don't show up
  // on the loop grid at all - a pop on the summary row is the only visual
  // cue a move into/within safety or home gets.
  const safetyHomeCounts = Object.fromEntries(
    colorOrder.map((pid) => {
      const pawns = view.pawns[pid] ?? [];
      const home = pawns.filter((p) => p.progress === view.trackLength + view.safetyLength).length;
      const safety = pawns.filter(
        (p) => p.progress >= view.trackLength && p.progress < view.trackLength + view.safetyLength
      ).length;
      return [pid, `${safety}-${home}`];
    })
  );
  const safetyHomeKey = JSON.stringify(safetyHomeCounts);
  const [justAdvanced, setJustAdvanced] = useState<Set<string>>(new Set());
  const [lastSafetyHomeKey, setLastSafetyHomeKey] = useState<string | null>(null);
  if (safetyHomeKey !== lastSafetyHomeKey) {
    const changed = new Set<string>();
    if (lastSafetyHomeKey !== null) {
      const prevCounts = JSON.parse(lastSafetyHomeKey) as Record<string, string>;
      for (const pid of colorOrder) {
        if (prevCounts[pid] !== safetyHomeCounts[pid]) changed.add(pid);
      }
    }
    setLastSafetyHomeKey(safetyHomeKey);
    setJustAdvanced(changed);
  }

  function playMove(move: LegalMove) {
    send({
      type: "game_action",
      payload: {
        type: "play_card",
        pawnIndex: move.pawnIndex,
        targetPlayerId: move.swap?.playerId ?? move.bump?.playerId,
        targetPawnIndex: move.swap?.pawnIndex ?? move.bump?.pawnIndex,
      },
    });
    setPendingPawn(null);
  }

  function describeMove(move: LegalMove): string {
    if (move.swap) return `Swap with ${nameOf(players, move.swap.playerId)}'s pawn`;
    if (move.bump) return `Bump ${nameOf(players, move.bump.playerId)}'s pawn back to start`;
    if (move.newProgress === view.trackLength + view.safetyLength) return "Move home! 🏆";
    return `Move to ${pawnLabel(move.newProgress, view.trackLength, view.safetyLength)}`;
  }

  function onPawnTap(pawnIndex: number) {
    const moves = view.legalMoves.filter((m) => m.pawnIndex === pawnIndex);
    if (moves.length === 0) return;
    if (moves.length === 1) {
      playMove(moves[0]);
      return;
    }
    setPendingPawn(pawnIndex);
  }

  const movesForPending = pendingPawn === null ? [] : view.legalMoves.filter((m) => m.pawnIndex === pendingPawn);

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        {view.stage === "reveal" ? (
          <p className="animate-bounce-in text-lg font-semibold">🎉 {nameOf(players, view.winner)} wins!</p>
        ) : (
          <p className="text-lg font-semibold">
            {view.isYourTurn ? "Your turn" : `${nameOf(players, view.currentTurn)}'s turn`}
          </p>
        )}
      </Card>

      <Board
        columns={6}
        cells={mainLoop}
        renderCell={(pid, index) =>
          pid ? (
            <span
              className={`h-[70%] w-[70%] rounded-full ${PAWN_COLORS[colorIndex(pid)] ?? "bg-muted"} ${
                justMoved.has(index) ? "animate-hop" : ""
              }`}
            />
          ) : null
        }
      />

      <div className="flex flex-col gap-2">
        {colorOrder.map((pid) => {
          const pawns = view.pawns[pid] ?? [];
          const startCount = pawns.filter((p) => p.progress === -1).length;
          const homeCount = pawns.filter((p) => p.progress === view.trackLength + view.safetyLength).length;
          const safetyCount = pawns.filter(
            (p) => p.progress >= view.trackLength && p.progress < view.trackLength + view.safetyLength
          ).length;
          return (
            <div
              key={pid}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                pid === view.currentTurn ? "border-accent bg-accent/10" : "border-card-border bg-card"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${PAWN_COLORS[colorIndex(pid)]}`} />
                <span className="font-medium">
                  {nameOf(players, pid)} {pid === you.id && <span className="text-muted">(you)</span>}
                </span>
              </div>
              <span className={`text-sm text-muted ${justAdvanced.has(pid) ? "animate-pop" : ""}`}>
                🏠{startCount} · 🛡️{safetyCount} · 🏆{homeCount}/4
              </span>
            </div>
          );
        })}
      </div>

      {view.isYourTurn && view.stage === "playing" && (
        <Card className="flex flex-col gap-3">
          <p className="text-center text-sm text-muted">Your card</p>
          <p className="text-center text-3xl font-extrabold">{view.yourCard === "sorry" ? "Sorry!" : view.yourCard}</p>
          {view.legalMoves.length === 0 ? (
            <p className="text-center text-sm text-muted">No legal moves - skipping…</p>
          ) : pendingPawn === null ? (
            <>
              <p className="text-center text-xs text-muted">Pick a pawn to move</p>
              <div className="grid grid-cols-4 gap-2">
                {(view.pawns[you.id] ?? []).map((pawn, i) => {
                  const moves = view.legalMoves.filter((m) => m.pawnIndex === i);
                  return (
                    <button
                      key={i}
                      disabled={moves.length === 0}
                      onClick={() => onPawnTap(i)}
                      className="flex flex-col items-center gap-1 rounded-xl border border-card-border bg-card px-2 py-3 disabled:opacity-30"
                    >
                      <span className={`h-6 w-6 rounded-full ${PAWN_COLORS[colorIndex(you.id)]}`} />
                      <span className="text-xs text-muted">
                        {pawnLabel(pawn.progress, view.trackLength, view.safetyLength)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="text-center text-xs text-muted">Choose where to send that pawn</p>
              <div className="flex flex-col gap-2">
                {movesForPending.map((move, i) => (
                  <button
                    key={i}
                    onClick={() => playMove(move)}
                    className="rounded-xl border border-card-border bg-card px-4 py-3 text-left font-medium transition-colors hover:border-accent"
                  >
                    {describeMove(move)}
                  </button>
                ))}
              </div>
              <button onClick={() => setPendingPawn(null)} className="text-center text-xs text-muted">
                ← back
              </button>
            </>
          )}
        </Card>
      )}

      {!view.isYourTurn && view.stage === "playing" && (
        <Card className="text-center text-muted">
          {view.hasCard ? `${nameOf(players, view.currentTurn)} is playing their card…` : "Waiting…"}
        </Card>
      )}
    </div>
  );
}
