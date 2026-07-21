"use client";

import { Card } from "../ui";
import { GameProps, nameOf } from "./types";
import { PlayingCardFace, type PlayingCard } from "./cardDisplay";

type HandStatus = "playing" | "stood" | "bust" | "blackjack";

type BlackjackView = {
  stage: "playing" | "reveal";
  currentTurn: string | null;
  stake: number;
  playerIds: string[];
  hands: Record<string, PlayingCard[]>;
  statuses: Record<string, HandStatus>;
  dealerHand: PlayingCard[];
  dealerRevealed: boolean;
  dealerTotal: number | null;
  isYourTurn: boolean;
  scoreDeltas: Record<string, number>;
};

function handTotal(cards: PlayingCard[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces++;
      total += 11;
    } else if (c.rank === "K" || c.rank === "Q" || c.rank === "J") {
      total += 10;
    } else {
      total += Number(c.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

const STATUS_LABEL: Record<HandStatus, string> = {
  playing: "",
  stood: "Stood",
  bust: "Bust 💥",
  blackjack: "Blackjack! ⭐",
};

export function BlackjackGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as BlackjackView;

  function hit() {
    send({ type: "game_action", payload: { type: "hit" } });
  }
  function stand() {
    send({ type: "game_action", payload: { type: "stand" } });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Dealer</p>
        <div className="flex gap-2">
          {view.dealerHand.map((c, i) => (
            <PlayingCardFace key={i} card={c} faceDown={!view.dealerRevealed && i === 1} animate />
          ))}
        </div>
        <p className="text-sm text-muted">{view.dealerRevealed ? `Total: ${view.dealerTotal}` : ""}</p>
      </Card>

      {view.stage === "reveal" && (
        <Card className="animate-bounce-in text-center">
          <p className="text-lg font-semibold">Round over</p>
          <p className="text-xs text-muted">Ante is {view.stake} chips per hand</p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {view.playerIds.map((pid) => {
          const hand = view.hands[pid] ?? [];
          const status = view.statuses[pid];
          const delta = view.scoreDeltas[pid];
          return (
            <Card
              key={pid}
              className={`flex flex-col gap-2 ${pid === view.currentTurn ? "border-accent bg-accent/10" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {nameOf(players, pid)} {pid === you.id && <span className="text-muted">(you)</span>}
                </span>
                <span className="text-sm text-muted">
                  {status !== "playing" && STATUS_LABEL[status]}
                  {view.stage === "reveal" && typeof delta === "number" && (
                    <span
                      className={`ml-2 font-mono font-bold ${
                        delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-muted"
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta === 0 ? "push" : delta}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                {hand.map((c, i) => (
                  <PlayingCardFace key={i} card={c} animate size="sm" />
                ))}
              </div>
              <p className="text-xs text-muted">Total: {handTotal(hand)}</p>
            </Card>
          );
        })}
      </div>

      {view.isYourTurn && view.stage === "playing" && (
        <div className="flex gap-2">
          <button
            onClick={hit}
            className="flex-1 rounded-2xl border border-accent bg-accent/20 px-6 py-4 text-lg font-semibold text-accent transition-colors"
          >
            Hit
          </button>
          <button
            onClick={stand}
            className="flex-1 rounded-2xl border border-card-border bg-card px-6 py-4 text-lg font-semibold transition-colors hover:border-accent"
          >
            Stand
          </button>
        </div>
      )}

      {!view.isYourTurn && view.stage === "playing" && (
        <Card className="text-center text-muted">{nameOf(players, view.currentTurn)} is playing…</Card>
      )}
    </div>
  );
}
