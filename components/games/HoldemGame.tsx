"use client";

import { useState } from "react";
import { Card } from "../ui";
import { GameProps, nameOf } from "./types";
import { PlayingCardFace, type PlayingCard } from "./cardDisplay";

type HandRank = { category: number; tiebreakers: number[] };

type HoldemView = {
  stage: "betting" | "reveal";
  currentTurn: string | null;
  winner: string | null;
  street: "preflop" | "flop" | "turn" | "river";
  community: PlayingCard[];
  pot: number;
  currentBet: number;
  stacks: Record<string, number>;
  contributed: Record<string, number>;
  committedThisStreet: Record<string, number>;
  inHand: Record<string, boolean>;
  allIn: Record<string, boolean>;
  order: string[];
  buttonIndex: number;
  yourHoleCards: PlayingCard[];
  holeCards: Record<string, PlayingCard[]> | null;
  handRanks: Record<string, HandRank> | null;
  winners: string[];
  isYourTurn: boolean;
  toCall: number;
};

const CATEGORY_NAME = [
  "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush",
];

export function HoldemGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as HoldemView;
  const [raiseTo, setRaiseTo] = useState<number | null>(null);

  const yourStack = view.stacks[you.id] ?? 0;
  const minRaise = view.currentBet + 20;

  function act(type: string, extra?: Record<string, unknown>) {
    send({ type: "game_action", payload: { type, ...extra } });
    setRaiseTo(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {view.street} · Pot: {view.pot}
        </p>
        <div className="flex min-h-16 gap-2">
          {view.community.map((c, i) => (
            <PlayingCardFace key={i} card={c} animate />
          ))}
          {Array.from({ length: 5 - view.community.length }).map((_, i) => (
            <PlayingCardFace key={`empty-${i}`} card={null} faceDown />
          ))}
        </div>
        {view.stage === "reveal" && (
          <p className="animate-bounce-in text-sm font-semibold">
            {view.winners.length > 0 ? `${view.winners.map((id) => nameOf(players, id)).join(" & ")} won the pot!` : "Hand over"}
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        {view.order.map((pid) => {
          const inHand = view.inHand[pid];
          const stack = view.stacks[pid] ?? 0;
          const committed = view.committedThisStreet[pid] ?? 0;
          const rank = view.handRanks?.[pid];
          const revealed = view.holeCards?.[pid];
          const isYou = pid === you.id;
          return (
            <Card
              key={pid}
              className={`flex flex-col gap-1 ${pid === view.currentTurn ? "border-accent bg-accent/10" : ""} ${
                !inHand ? "opacity-40" : ""
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {pid === view.order[view.buttonIndex] && "🔘 "}
                  {nameOf(players, pid)} {isYou && <span className="text-muted">(you)</span>}
                  {!inHand && <span className="text-muted"> · folded</span>}
                  {view.allIn[pid] && inHand && <span className="text-amber-400"> · all-in</span>}
                </span>
                <span className="font-mono text-muted">
                  {stack} chips{committed > 0 ? ` (${committed} in)` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isYou ? (
                  view.yourHoleCards.map((c, i) => <PlayingCardFace key={i} card={c} size="sm" />)
                ) : revealed ? (
                  revealed.map((c, i) => <PlayingCardFace key={i} card={c} size="sm" animate />)
                ) : inHand ? (
                  <>
                    <PlayingCardFace card={null} faceDown size="sm" />
                    <PlayingCardFace card={null} faceDown size="sm" />
                  </>
                ) : null}
                {rank && <span className="text-xs text-muted">{CATEGORY_NAME[rank.category]}</span>}
              </div>
            </Card>
          );
        })}
      </div>

      {view.isYourTurn && view.stage === "betting" && (
        <Card className="flex flex-col gap-3">
          <p className="text-center text-sm text-muted">
            {view.toCall > 0 ? `${view.toCall} to call` : "Your turn"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => act("fold")}
              className="flex-1 rounded-2xl border border-card-border bg-card px-4 py-3 font-semibold transition-colors hover:border-red-400"
            >
              Fold
            </button>
            {view.toCall === 0 ? (
              <button
                onClick={() => act("check")}
                className="flex-1 rounded-2xl border border-card-border bg-card px-4 py-3 font-semibold transition-colors hover:border-accent"
              >
                Check
              </button>
            ) : (
              <button
                onClick={() => act("call")}
                className="flex-1 rounded-2xl border border-accent bg-accent/20 px-4 py-3 font-semibold text-accent"
              >
                Call {view.toCall}
              </button>
            )}
            <button
              onClick={() => act("allin")}
              className="flex-1 rounded-2xl border border-amber-400 bg-amber-400/10 px-4 py-3 font-semibold text-amber-400"
            >
              All-in
            </button>
          </div>
          {yourStack > view.toCall && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={minRaise}
                max={(view.committedThisStreet[you.id] ?? 0) + yourStack}
                value={raiseTo ?? minRaise}
                onChange={(e) => setRaiseTo(Number(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => act("raise", { to: raiseTo ?? minRaise })}
                className="rounded-xl border border-card-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-accent"
              >
                Raise to {raiseTo ?? minRaise}
              </button>
            </div>
          )}
        </Card>
      )}

      {!view.isYourTurn && view.stage === "betting" && (
        <Card className="text-center text-muted">{nameOf(players, view.currentTurn)} is deciding…</Card>
      )}
    </div>
  );
}
