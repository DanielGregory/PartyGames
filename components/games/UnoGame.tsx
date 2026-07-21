"use client";

import { useState } from "react";
import { Card } from "../ui";
import { GameProps, nameOf } from "./types";

type UnoColor = "red" | "yellow" | "green" | "blue";
type UnoCard = { id: string } & (
  | { kind: "number"; color: UnoColor; value: number }
  | { kind: "skip"; color: UnoColor }
  | { kind: "reverse"; color: UnoColor }
  | { kind: "drawTwo"; color: UnoColor }
  | { kind: "wild" }
  | { kind: "wildDrawFour" }
);

type UnoView = {
  stage: "playing" | "reveal";
  currentTurn: string | null;
  winner: string | null;
  direction: 1 | -1;
  currentColor: UnoColor;
  topCard: UnoCard | null;
  drawPileCount: number;
  handCounts: Record<string, number>;
  yourHand: UnoCard[];
  isYourTurn: boolean;
  players: string[];
};

// Duplicated (not imported) from server/games/uno.ts's canPlay, matching
// this codebase's pattern of keeping server/games/* out of the client
// bundle even for logic that isn't secret.
function canPlay(card: UnoCard, top: UnoCard, currentColor: UnoColor, hand: UnoCard[]): boolean {
  if (card.kind === "wild") return true;
  if (card.kind === "wildDrawFour") {
    return !hand.some((c) => c.id !== card.id && "color" in c && c.color === currentColor);
  }
  if (card.color === currentColor) return true;
  if (card.kind === "number" && top.kind === "number" && card.value === top.value) return true;
  if (card.kind !== "number" && card.kind === top.kind) return true;
  return false;
}

const COLOR_CLASSES: Record<UnoColor, string> = {
  red: "bg-red-600 text-white",
  yellow: "bg-yellow-400 text-black",
  green: "bg-emerald-600 text-white",
  blue: "bg-blue-600 text-white",
};

const COLOR_DOT: Record<UnoColor, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
};

function cardLabel(card: UnoCard): string {
  switch (card.kind) {
    case "number":
      return String(card.value);
    case "skip":
      return "⦸";
    case "reverse":
      return "⇄";
    case "drawTwo":
      return "+2";
    case "wild":
      return "★";
    case "wildDrawFour":
      return "+4";
  }
}

function cardColorClass(card: UnoCard): string {
  if (card.kind === "wild" || card.kind === "wildDrawFour") {
    return "bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500 text-white";
  }
  return COLOR_CLASSES[card.color];
}

function CardFace({ card, dim, animate }: { card: UnoCard; dim?: boolean; animate?: boolean }) {
  return (
    <span
      className={`flex h-16 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-white/20 text-xl font-extrabold shadow ${cardColorClass(
        card
      )} ${dim ? "opacity-40" : ""} ${animate ? "animate-card-deal" : ""}`}
    >
      {cardLabel(card)}
    </span>
  );
}

export function UnoGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as UnoView;
  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null);

  function playCard(card: UnoCard, chosenColor?: UnoColor) {
    send({ type: "game_action", payload: { type: "play_card", cardId: card.id, chosenColor } });
    setPendingWild(null);
  }

  function onCardTap(card: UnoCard) {
    if (!view.isYourTurn) return;
    if (card.kind === "wild" || card.kind === "wildDrawFour") {
      setPendingWild(card);
      return;
    }
    playCard(card);
  }

  function drawCard() {
    send({ type: "game_action", payload: { type: "draw_card" } });
  }

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

      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={drawCard}
            disabled={!view.isYourTurn || view.stage !== "playing"}
            className="flex h-16 w-11 items-center justify-center rounded-lg border-2 border-card-border bg-card text-2xl disabled:opacity-40"
          >
            🂠
          </button>
          <span className="text-xs text-muted">{view.drawPileCount} left</span>
        </div>

        {view.topCard && <CardFace key={view.topCard.id} card={view.topCard} animate />}

        <div className="flex flex-col items-center gap-1">
          <span className={`h-6 w-6 rounded-full ${COLOR_DOT[view.currentColor]}`} />
          <span className="text-xs text-muted">{view.direction === 1 ? "→ forward" : "← reverse"}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 text-sm text-muted">
        {view.players
          .filter((pid) => pid !== you.id)
          .map((pid) => (
            <span
              key={pid}
              className={`rounded-full border px-3 py-1 ${
                pid === view.currentTurn ? "border-accent text-accent" : "border-card-border"
              }`}
            >
              {nameOf(players, pid)}: {view.handCounts[pid] ?? 0}
            </span>
          ))}
      </div>

      {pendingWild && (
        <Card className="animate-bounce-in flex flex-col gap-3">
          <p className="text-center text-sm font-semibold text-muted">Choose a color</p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(COLOR_DOT) as UnoColor[]).map((c) => (
              <button
                key={c}
                onClick={() => playCard(pendingWild, c)}
                className={`h-12 rounded-xl ${COLOR_DOT[c]}`}
                aria-label={c}
              />
            ))}
          </div>
          <button onClick={() => setPendingWild(null)} className="text-center text-xs text-muted">
            ← cancel
          </button>
        </Card>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Your hand ({view.yourHand.length})</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {view.yourHand.map((card) => {
            const playable =
              view.isYourTurn && view.stage === "playing" && view.topCard
                ? canPlay(card, view.topCard, view.currentColor, view.yourHand)
                : false;
            return (
              <button key={card.id} onClick={() => onCardTap(card)} disabled={!playable}>
                <CardFace card={card} dim={!playable} animate />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
