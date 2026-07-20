"use client";

import type { ReactNode } from "react";

// Generic grid renderer for future turn-based/board game modes. None of the
// current five modes use this - it's infrastructure for when a board game
// (Tic-Tac-Toe, Connect Four, Mancala, Battleship, ...) gets built.
//
// It only knows how to lay out a flat array of cells in a CSS grid and
// render whatever a caller hands it - it has no idea what a "cell" means,
// so the same component covers very different boards:
//
//   Tic-Tac-Toe (3x3, empty grid):
//     <Board columns={3} cells={cells} renderCell={c => c ?? ""}
//            onCellClick={(c, i) => send({type: "game_action", payload: {type: "place", index: i}})}
//            isCellDisabled={(c) => c !== null || !isYourTurn} />
//
//   Connect Four (6 rows x 7 cols, click anywhere in a column to drop):
//     <Board columns={7} cells={cells} renderCell={c => <Disc color={c} />}
//            onCellClick={(c, i) => send({..., column: i % 7})} />
//
//   Mancala (pits are a plain row; the two stores aren't part of the grid -
//   compose them alongside the Board instead of teaching Board about pits):
//     <div className="flex items-center gap-2">
//       <Store count={state.stores[0]} />
//       <Board columns={6} cells={state.pits} renderCell={c => c} />
//       <Store count={state.stores[1]} />
//     </div>
//
//   Battleship (two boards side by side; privacy comes from the server only
//   ever sending you your own ship positions plus the opponent's public
//   hit/miss grid via GameModule.redact - Board itself has no notion of
//   "private", it just renders whatever cell data it's given):
//     <Board columns={10} cells={yourGrid} renderCell={renderShip} />
//     <Board columns={10} cells={opponentGrid} renderCell={renderFog}
//            onCellClick={(c, i) => send({..., type: "fire", index: i})} />

export type BoardProps<T> = {
  columns: number;
  cells: T[];
  renderCell: (cell: T, index: number) => ReactNode;
  onCellClick?: (cell: T, index: number) => void;
  /** Disables every cell regardless of isCellDisabled - e.g. `disabled={!isYourTurn}`. */
  disabled?: boolean;
  isCellDisabled?: (cell: T, index: number) => boolean;
  cellClassName?: (cell: T, index: number) => string;
  getCellKey?: (cell: T, index: number) => string | number;
  className?: string;
};

export function Board<T>({
  columns,
  cells,
  renderCell,
  onCellClick,
  disabled = false,
  isCellDisabled,
  cellClassName,
  getCellKey,
  className = "",
}: BoardProps<T>) {
  return (
    <div
      className={`grid gap-1.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, index) => {
        const key = getCellKey?.(cell, index) ?? index;
        const extra = cellClassName?.(cell, index) ?? "";
        const content = renderCell(cell, index);
        const isDisabled = disabled || (isCellDisabled?.(cell, index) ?? false);
        const baseClasses = `flex aspect-square items-center justify-center rounded-xl border border-card-border bg-card text-lg font-semibold ${extra}`;

        if (!onCellClick) {
          return (
            <div key={key} className={baseClasses}>
              {content}
            </div>
          );
        }

        return (
          <button
            key={key}
            type="button"
            disabled={isDisabled}
            onClick={() => onCellClick(cell, index)}
            className={`${baseClasses} transition-colors hover:border-accent disabled:opacity-40 disabled:hover:border-card-border`}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
