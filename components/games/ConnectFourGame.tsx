"use client";

import { Board } from "../Board";
import { Card } from "../ui";
import { GameProps, nameOf } from "./types";

type ConnectFourView = {
  stage: "playing" | "reveal";
  currentTurn: string | null;
  winner: string | null;
  isDraw: boolean;
  cells: (string | null)[];
  players: string[];
  isYourTurn: boolean;
};

const DISC_COLORS = ["bg-red-500", "bg-yellow-400"];

export function ConnectFourGame({ game, players, send }: GameProps) {
  const view = game as unknown as ConnectFourView;

  function colorFor(cell: string | null): string | null {
    if (!cell) return null;
    const index = view.players.indexOf(cell);
    return index >= 0 ? DISC_COLORS[index] : null;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        {view.stage === "playing" ? (
          <p className="text-lg font-semibold">
            {view.isYourTurn ? "Your turn" : `${nameOf(players, view.currentTurn)}'s turn`}
          </p>
        ) : (
          <p className="text-lg font-semibold">
            {view.isDraw ? "🤝 It's a draw!" : `🎉 ${nameOf(players, view.winner)} wins!`}
          </p>
        )}
      </Card>

      <Board
        columns={7}
        cells={view.cells}
        disabled={!view.isYourTurn || view.stage === "reveal"}
        onCellClick={(_, index) =>
          send({ type: "game_action", payload: { type: "drop", column: index % 7 } })
        }
        renderCell={(cell) => (
          <span className={`h-[78%] w-[78%] rounded-full ${colorFor(cell) ?? "bg-background/40"}`} />
        )}
      />

      <div className="flex justify-center gap-6 text-sm text-muted">
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full bg-red-500" /> {nameOf(players, view.players[0])}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full bg-yellow-400" /> {nameOf(players, view.players[1])}
        </span>
      </div>
    </div>
  );
}
