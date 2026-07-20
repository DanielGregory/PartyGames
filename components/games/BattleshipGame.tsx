"use client";

import { useState } from "react";
import { Board } from "../Board";
import { Button, Card } from "../ui";
import { GameProps, nameOf } from "./types";

type BattleshipView = {
  stage: "placement" | "battle" | "reveal";
  currentTurn: string | null;
  winner: string | null;
  isYourTurn: boolean;
  shipLengths: number[];
  boardSize: number;
  shotLog: { shooterId: string; cell: number; hit: boolean; sunk: boolean }[];
  // placement stage
  yourShips?: number[][];
  nextShipLength?: number | null;
  youReady?: boolean;
  opponentReady?: boolean;
  // battle/reveal stage
  yourGrid?: (string | null)[];
  opponentGrid?: (string | null)[];
  opponentShips?: number[][];
};

function cellLabel(index: number, boardSize: number): string {
  const row = Math.floor(index / boardSize);
  const col = index % boardSize;
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

export function BattleshipGame({ game, players, send }: GameProps) {
  const view = game as unknown as BattleshipView;
  const [orientation, setOrientation] = useState<"h" | "v">("h");
  const boardSize = view.boardSize ?? 8;

  if (view.stage === "placement") {
    const ownGrid = new Array(boardSize * boardSize).fill(null);
    for (const ship of view.yourShips ?? []) {
      for (const cell of ship) ownGrid[cell] = "ship";
    }

    return (
      <div className="flex flex-col gap-4">
        <Card className="text-center">
          {view.youReady ? (
            <p className="font-semibold">
              Fleet placed! Waiting for {view.opponentReady ? "the battle to start…" : "your opponent…"}
            </p>
          ) : (
            <>
              <p className="font-semibold">Place your {view.nextShipLength}-length ship</p>
              <p className="text-sm text-muted">Tap a starting cell</p>
            </>
          )}
        </Card>

        {!view.youReady && (
          <Button
            variant="secondary"
            onClick={() => setOrientation((o) => (o === "h" ? "v" : "h"))}
          >
            Orientation: {orientation === "h" ? "Horizontal ⟷" : "Vertical ↕"}
          </Button>
        )}

        <Board
          columns={boardSize}
          cells={ownGrid}
          disabled={view.youReady}
          onCellClick={(_, index) =>
            send({ type: "game_action", payload: { type: "place_ship", cell: index, orientation } })
          }
          renderCell={(cell) => (
            <span className={`h-[70%] w-[70%] rounded-sm ${cell === "ship" ? "bg-accent" : "bg-background/40"}`} />
          )}
        />
      </div>
    );
  }

  const yourGrid = view.yourGrid ?? [];
  const opponentGrid = view.opponentGrid ?? [];
  const opponentShipCells = new Set((view.opponentShips ?? []).flat());

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        {view.stage === "reveal" ? (
          <p className="text-lg font-semibold">🎉 {nameOf(players, view.winner)} wins!</p>
        ) : (
          <p className="text-lg font-semibold">
            {view.isYourTurn ? "Your turn - fire away" : `${nameOf(players, view.currentTurn)}'s turn`}
          </p>
        )}
      </Card>

      <div>
        <p className="mb-2 text-center text-sm font-semibold text-muted">Enemy waters</p>
        <Board
          columns={boardSize}
          cells={opponentGrid}
          disabled={!view.isYourTurn || view.stage !== "battle"}
          onCellClick={(_, index) => send({ type: "game_action", payload: { type: "fire", cell: index } })}
          renderCell={(cell, index) => {
            if (cell === "sunk") return <span className="text-lg">☠️</span>;
            if (cell === "hit") return <span className="text-lg">🔥</span>;
            if (cell === "miss") return <span className="text-lg">💧</span>;
            if (view.stage === "reveal" && opponentShipCells.has(index)) {
              return <span className="h-[70%] w-[70%] rounded-sm bg-accent/40" />;
            }
            return null;
          }}
          cellClassName={(cell) => (cell === "sunk" ? "!border-red-500 !bg-red-500/20" : "")}
        />
      </div>

      <div>
        <p className="mb-2 text-center text-sm font-semibold text-muted">Your fleet</p>
        <Board
          columns={boardSize}
          cells={yourGrid}
          renderCell={(cell) => {
            if (cell === "sunk") return <span className="text-lg">☠️</span>;
            if (cell === "hit") return <span className="text-lg">🔥</span>;
            if (cell === "miss") return <span className="text-lg">💧</span>;
            if (cell === "ship") return <span className="h-[70%] w-[70%] rounded-sm bg-accent" />;
            return null;
          }}
          cellClassName={(cell) => (cell === "sunk" ? "!border-red-500 !bg-red-500/20" : "")}
        />
      </div>

      {view.shotLog.length > 0 && (
        <div className="flex flex-col gap-1 text-sm text-muted">
          {[...view.shotLog]
            .slice(-4)
            .reverse()
            .map((s, i) => (
              <p key={i} className={s.sunk ? "font-semibold text-red-400" : undefined}>
                {nameOf(players, s.shooterId)} fired at {cellLabel(s.cell, boardSize)} —{" "}
                <span className={s.sunk ? "text-red-400" : s.hit ? "text-red-400" : "text-muted"}>
                  {s.sunk ? "sunk a ship! ☠️" : s.hit ? "hit!" : "miss"}
                </span>
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
