"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "../ui";
import { GameProps, nameOf } from "./types";

// Small, self-contained duplicate of server/games/yahtzee.ts's pure scoring
// logic - deliberately not imported from there, matching this codebase's
// convention of keeping server/games/* out of the client bundle even when
// (as here) nothing in the file is actually secret.
type Category =
  | "ones" | "twos" | "threes" | "fours" | "fives" | "sixes"
  | "threeKind" | "fourKind" | "fullHouse" | "smallStraight" | "largeStraight" | "yahtzee" | "chance";

const CATEGORIES: Category[] = [
  "ones", "twos", "threes", "fours", "fives", "sixes",
  "threeKind", "fourKind", "fullHouse", "smallStraight", "largeStraight", "yahtzee", "chance",
];

const CATEGORY_LABELS: Record<Category, string> = {
  ones: "Ones", twos: "Twos", threes: "Threes", fours: "Fours", fives: "Fives", sixes: "Sixes",
  threeKind: "3 of a Kind", fourKind: "4 of a Kind", fullHouse: "Full House",
  smallStraight: "Sm. Straight", largeStraight: "Lg. Straight", yahtzee: "YAHTZEE", chance: "Chance",
};

const DICE_GLYPHS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function computeScore(dice: number[], category: Category, isJokerBonus: boolean): number {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  const sum = dice.reduce((a, b) => a + b, 0);

  switch (category) {
    case "ones": return counts[1] * 1;
    case "twos": return counts[2] * 2;
    case "threes": return counts[3] * 3;
    case "fours": return counts[4] * 4;
    case "fives": return counts[5] * 5;
    case "sixes": return counts[6] * 6;
    case "threeKind": return counts.some((c) => c >= 3) ? sum : 0;
    case "fourKind": return counts.some((c) => c >= 4) ? sum : 0;
    case "fullHouse": {
      if (isJokerBonus) return 25;
      const groups = counts.slice(1).filter((c) => c > 0);
      return groups.length === 2 && groups.includes(3) && groups.includes(2) ? 25 : 0;
    }
    case "smallStraight": {
      if (isJokerBonus) return 30;
      const uniq = new Set(dice);
      return [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]].some((run) => run.every((n) => uniq.has(n))) ? 30 : 0;
    }
    case "largeStraight": {
      if (isJokerBonus) return 40;
      const uniq = new Set(dice);
      return [[1, 2, 3, 4, 5], [2, 3, 4, 5, 6]].some((run) => run.every((n) => uniq.has(n))) ? 40 : 0;
    }
    case "yahtzee": return counts.some((c) => c === 5) ? 50 : 0;
    case "chance": return sum;
  }
}

type Scorecard = Partial<Record<Category, number>>;

type YahtzeeView = {
  stage: "rolling" | "reveal";
  round: number;
  currentTurn: string | null;
  winner: string | null;
  dice: number[];
  held: boolean[];
  rollsUsed: number;
  maxRolls: number;
  scorecards: Record<string, Scorecard>;
  yahtzeeBonusCount: Record<string, number>;
  totals: Record<string, number>;
  players: string[];
};

export function YahtzeeGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as YahtzeeView;
  const isYourTurn = view.currentTurn === you.id;
  const hasRolled = view.rollsUsed > 0;
  const isYahtzeeRoll = hasRolled && view.dice.some((_, i) => view.dice.filter((d) => d === view.dice[i]).length === 5);
  const myCard = view.scorecards[you.id] ?? {};
  const jokerBonus = isYahtzeeRoll && myCard.yahtzee === 50;

  // Kept in sync with every render so the settle timeout below always snaps
  // to the true server value, even if a fresher roll result arrives
  // mid-animation. A ref write belongs in an effect, not render, so this
  // runs after commit rather than during render.
  const latestDiceRef = useRef(view.dice);
  useEffect(() => {
    latestDiceRef.current = view.dice;
  });

  const [displayDice, setDisplayDice] = useState<number[]>(view.dice);
  const [isRolling, setIsRolling] = useState(false);
  const tumbleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function roll() {
    send({ type: "game_action", payload: { type: "roll" } });

    if (tumbleIntervalRef.current) clearInterval(tumbleIntervalRef.current);
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);

    setIsRolling(true);
    const heldNow = view.held;
    tumbleIntervalRef.current = setInterval(() => {
      setDisplayDice((prev) => prev.map((d, i) => (heldNow[i] ? d : 1 + Math.floor(Math.random() * 6))));
    }, 90);
    settleTimeoutRef.current = setTimeout(() => {
      if (tumbleIntervalRef.current) clearInterval(tumbleIntervalRef.current);
      setDisplayDice(latestDiceRef.current);
      setIsRolling(false);
    }, 550);
  }

  function toggleHold(index: number) {
    send({ type: "game_action", payload: { type: "toggle_hold", keep: index } });
  }

  function scoreCategory(category: Category) {
    send({ type: "game_action", payload: { type: "score", category } });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        {view.stage === "reveal" ? (
          <p className="animate-bounce-in text-lg font-semibold">🎉 {nameOf(players, view.winner)} wins!</p>
        ) : (
          <p className="text-lg font-semibold">
            {isYourTurn ? "Your turn" : `${nameOf(players, view.currentTurn)}'s turn`}
          </p>
        )}
      </Card>

      {view.stage === "rolling" && (
        <>
          <div className="flex justify-center gap-3 rounded-3xl border border-card-border bg-black/20 p-4 shadow-inner">
            {displayDice.map((d, i) => (
              <button
                // Held dice keep a stable key (no remount, no replay); an
                // unheld die's key changes with every roll, which forces
                // React to remount it and replay the roll animation - the
                // simplest way to get a CSS animation to fire again on a
                // value that already changed once before.
                key={view.held[i] ? `held-${i}` : `${i}-${view.rollsUsed}`}
                disabled={!isYourTurn || isRolling || view.rollsUsed === 0 || view.rollsUsed >= view.maxRolls}
                onClick={() => toggleHold(i)}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-5xl shadow-lg transition-colors disabled:opacity-70 ${
                  view.held[i] ? "border-accent bg-accent/20" : "border-card-border bg-card"
                } ${isRolling && !view.held[i] ? "animate-dice-roll" : ""}`}
              >
                {d === 0 ? "🎲" : DICE_GLYPHS[d]}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-muted">
            {view.rollsUsed === 0 ? "Tap Roll to start" : "Tap a die to hold it before rerolling"}
          </p>

          {isYourTurn && (
            <button
              onClick={roll}
              disabled={isRolling || view.rollsUsed >= view.maxRolls}
              className="rounded-2xl border border-accent bg-accent/20 px-6 py-4 text-lg font-semibold text-accent transition-colors disabled:opacity-40"
            >
              {isRolling ? "Rolling…" : view.rollsUsed === 0 ? "Roll" : `Reroll (${view.maxRolls - view.rollsUsed} left)`}
            </button>
          )}

          {isYourTurn && hasRolled && (
            <div className="flex flex-col gap-2">
              {jokerBonus && (
                <p className="text-center text-sm font-semibold text-amber-400">
                  Extra Yahtzee! +100 bonus, plus pick any open category below.
                </p>
              )}
              <p className="text-sm font-semibold text-muted">Score this roll as…</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.filter((c) => myCard[c] === undefined).map((c) => (
                  <button
                    key={c}
                    onClick={() => scoreCategory(c)}
                    className="flex flex-col items-start rounded-xl border border-card-border bg-card px-3 py-2 text-left transition-colors hover:border-accent"
                  >
                    <span className="text-xs text-muted">{CATEGORY_LABELS[c]}</span>
                    <span className="font-mono font-bold text-accent">
                      {computeScore(view.dice, c, jokerBonus)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Card className="overflow-x-auto border-2 border-card-border/80">
        <p className="mb-3 border-b border-card-border/60 pb-2 text-sm font-bold uppercase tracking-wide text-muted">
          📋 Scorecard
        </p>
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-card-border/60 bg-card px-2 py-2 text-left font-normal text-muted">
                Category
              </th>
              {view.players.map((pid) => (
                <th
                  key={pid}
                  className={`min-w-16 border-b border-card-border/60 px-2 py-2 text-right font-semibold ${
                    pid === view.currentTurn ? "bg-accent/10 text-accent" : ""
                  }`}
                >
                  {nameOf(players, pid)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c, i) => (
              <tr key={c} className={i % 2 === 1 ? "bg-white/5" : ""}>
                <td className="sticky left-0 z-10 bg-card px-2 py-1.5 text-muted">{CATEGORY_LABELS[c]}</td>
                {view.players.map((pid) => (
                  <td
                    key={pid}
                    className={`px-2 py-1.5 text-right font-mono ${pid === view.currentTurn ? "bg-accent/10" : ""}`}
                  >
                    {view.scorecards[pid]?.[c] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-accent/60 font-bold">
              <td className="sticky left-0 z-10 bg-card px-2 py-2">Total</td>
              {view.players.map((pid) => (
                <td key={pid} className="px-2 py-2 text-right font-mono text-lg text-accent">
                  {view.totals[pid] ?? 0}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
