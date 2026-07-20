"use client";

import { useEffect, useRef, useState } from "react";
import { Board } from "../Board";
import { Button, TextField } from "../ui";
import { GameProps, nameOf } from "./types";
import { formatCountdown, useCountdownMs } from "@/lib/useCountdown";

type BoggleView = {
  stage: "playing" | "reveal";
  round: number;
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

export function BoggleGame({ game, players, send }: GameProps) {
  const view = game as unknown as BoggleView;
  const remainingMs = useCountdownMs(view.timerEndsAt);
  const [draft, setDraft] = useState("");
  const timedOutRound = useRef<number | null>(null);

  useEffect(() => {
    if (view.stage !== "playing") return;
    if (remainingMs > 0) return;
    if (timedOutRound.current === view.round) return;
    timedOutRound.current = view.round;
    send({ type: "game_action", payload: { type: "time_up" } });
  }, [remainingMs, view.stage, view.round, send]);

  function submit() {
    const word = draft.trim();
    if (!word) return;
    send({ type: "game_action", payload: { type: "submit_word", word } });
    setDraft("");
  }

  if (view.stage === "playing") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{view.totalWordsFound} words found so far</span>
          <span className="font-mono font-semibold text-foreground">{formatCountdown(remainingMs)}</span>
        </div>

        <Board columns={4} cells={view.grid} renderCell={(letter) => letter} className="mx-auto max-w-xs" />

        <div className="flex gap-2">
          <TextField
            placeholder="Type a word"
            value={draft}
            maxLength={16}
            autoCapitalize="characters"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <Button className="w-auto px-6" onClick={submit}>
            Add
          </Button>
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
      <Board columns={4} cells={view.grid} renderCell={(letter) => letter} className="mx-auto max-w-xs" />
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
