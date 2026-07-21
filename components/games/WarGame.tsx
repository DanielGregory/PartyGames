"use client";

import { Card } from "../ui";
import { GameProps, nameOf } from "./types";
import { PlayingCardFace, type PlayingCard } from "./cardDisplay";

type WarView = {
  stage: "battle" | "reveal";
  winner: string | null;
  playerIds: [string, string];
  yourCardCount: number;
  opponentCardCount: number;
  lastBattle: {
    cards: Record<string, PlayingCard[]>;
    winner: string;
    warChain: boolean;
  } | null;
};

export function WarGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as WarView;
  const opponentId = view.playerIds.find((id) => id !== you.id) ?? null;
  const battle = view.lastBattle;

  function flip() {
    send({ type: "game_action", payload: { type: "flip" } });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        {view.stage === "reveal" ? (
          <p className="animate-bounce-in text-lg font-semibold">🎉 {nameOf(players, view.winner)} wins the deck!</p>
        ) : (
          <p className="text-lg font-semibold">
            You: {view.yourCardCount} · {nameOf(players, opponentId)}: {view.opponentCardCount}
          </p>
        )}
      </Card>

      {battle && (
        <Card className="flex flex-col items-center gap-3">
          {battle.warChain && <p className="text-sm font-semibold text-amber-400">⚔️ War!</p>}
          <div className="flex items-center justify-center gap-6">
            {view.playerIds.map((pid) => {
              const cards = battle.cards[pid] ?? [];
              const faceUp = cards[cards.length - 1] ?? null;
              const won = battle.winner === pid;
              return (
                <div key={`${pid}-${cards.length}`} className="flex flex-col items-center gap-1">
                  <PlayingCardFace key={`${pid}-${cards.length}-face`} card={faceUp} animate size="lg" />
                  <span className={`text-xs ${won ? "font-bold text-accent" : "text-muted"}`}>
                    {nameOf(players, pid)} {won ? "✓" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {view.stage === "battle" && (
        <button
          onClick={flip}
          className="rounded-2xl border border-accent bg-accent/20 px-6 py-4 text-lg font-semibold text-accent transition-colors"
        >
          Flip! 🂠
        </button>
      )}
    </div>
  );
}
