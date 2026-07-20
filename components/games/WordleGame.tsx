"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "../ui";
import { Countdown } from "../Countdown";
import { GameProps, nameOf } from "./types";
import { useCountdownMs } from "@/lib/useCountdown";

type LetterState = "green" | "yellow" | "gray";
type Guess = { word: string; feedback: LetterState[] };

type WordleView = {
  stage: "guessing" | "reveal";
  round: number;
  wordLength: number;
  timerEndsAt: number;
  yourGuesses: Guess[];
  guessesRemaining: number;
  maxGuesses: number;
  solved: boolean;
  finishedCount: number;
  secret?: string;
  allResults?: Record<string, { guesses: number; solved: boolean }>;
};

const TILE_COLORS: Record<LetterState, string> = {
  green: "border-emerald-400 bg-emerald-400/20 text-emerald-300",
  yellow: "border-amber-400 bg-amber-400/20 text-amber-300",
  gray: "border-zinc-600 bg-zinc-700 text-zinc-300",
};

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export function WordleGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as WordleView;
  const remainingMs = useCountdownMs(view.timerEndsAt);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const timedOutRound = useRef<number | null>(null);
  const guessCountRef = useRef(view.yourGuesses.length);
  const connectedCount = players.filter((p) => p.connected).length;

  useEffect(() => {
    if (view.stage !== "guessing") return;
    if (remainingMs > 0) return;
    if (timedOutRound.current === view.round) return;
    timedOutRound.current = view.round;
    send({ type: "game_action", payload: { type: "time_up" } });
  }, [remainingMs, view.stage, view.round, send]);

  // A submitted guess either shows up in yourGuesses (accepted) or doesn't
  // (rejected - wrong length or not a real word). If it hasn't landed
  // within half a second, assume it was rejected and shake the row so the
  // typed word stays put for the player to fix, instead of silently
  // vanishing.
  useEffect(() => {
    if (view.yourGuesses.length > guessCountRef.current) {
      setPending(null);
      setDraft("");
    }
    guessCountRef.current = view.yourGuesses.length;
  }, [view.yourGuesses.length]);

  useEffect(() => {
    if (pending === null) return;
    const timeout = setTimeout(() => {
      setShake(true);
      setPending(null);
      setTimeout(() => setShake(false), 400);
    }, 600);
    return () => clearTimeout(timeout);
  }, [pending]);

  // Flip-reveal only the row that was just completed, not every row on
  // every re-render.
  const [justRevealedRow, setJustRevealedRow] = useState<number | null>(null);
  const revealedCountRef = useRef(view.yourGuesses.length);
  useEffect(() => {
    if (view.yourGuesses.length > revealedCountRef.current) {
      setJustRevealedRow(view.yourGuesses.length - 1);
    }
    revealedCountRef.current = view.yourGuesses.length;
  }, [view.yourGuesses.length]);

  const done = view.solved || view.guessesRemaining <= 0 || view.stage === "reveal";

  const keyState: Record<string, LetterState> = {};
  for (const guess of view.yourGuesses) {
    guess.word.split("").forEach((letter, i) => {
      const state = guess.feedback[i];
      const upper = letter.toUpperCase();
      const rank: Record<LetterState, number> = { gray: 0, yellow: 1, green: 2 };
      if (!keyState[upper] || rank[state] > rank[keyState[upper]]) keyState[upper] = state;
    });
  }

  function typeLetter(letter: string) {
    if (done) return;
    setDraft((d) => (d.length < view.wordLength ? d + letter : d));
  }

  function backspace() {
    setDraft((d) => d.slice(0, -1));
  }

  function submit() {
    if (draft.length !== view.wordLength || pending !== null) return;
    setPending(draft);
    send({ type: "game_action", payload: { type: "guess", word: draft } });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{view.finishedCount}/{connectedCount} finished</span>
        {view.stage === "guessing" && <Countdown remainingMs={remainingMs} />}
      </div>

      <div className="mx-auto flex flex-col gap-1.5">
        {Array.from({ length: view.maxGuesses }, (_, rowIndex) => {
          const guess = view.yourGuesses[rowIndex];
          const isCurrent = rowIndex === view.yourGuesses.length && !done;
          const letters = guess
            ? guess.word.split("")
            : isCurrent
              ? draft.padEnd(view.wordLength).split("")
              : " ".repeat(view.wordLength).split("");
          const rowJustRevealed = guess && rowIndex === justRevealedRow;
          return (
            <div key={rowIndex} className={`flex gap-1.5 ${isCurrent && shake ? "animate-shake" : ""}`}>
              {letters.map((letter, i) => (
                <div
                  key={i}
                  style={rowJustRevealed ? { animationDelay: `${i * 0.12}s` } : undefined}
                  className={`flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-bold uppercase ${
                    rowJustRevealed ? "animate-flip-in" : ""
                  } ${guess ? TILE_COLORS[guess.feedback[i]] : "border-card-border bg-card"}`}
                >
                  {letter.trim()}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {view.stage === "guessing" && !done && (
        <div className="flex flex-col items-center gap-2">
          {KEY_ROWS.map((row, i) => (
            <div key={i} className="flex gap-1">
              {row.split("").map((letter) => (
                <button
                  key={letter}
                  onClick={() => typeLetter(letter)}
                  className={`h-10 w-7 rounded-md border text-xs font-bold sm:w-8 ${
                    keyState[letter] ? TILE_COLORS[keyState[letter]] : "border-card-border bg-card"
                  }`}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={backspace}
              className="rounded-md border border-card-border bg-card px-4 py-2 text-xs font-bold"
            >
              ⌫
            </button>
            <button
              onClick={submit}
              disabled={draft.length !== view.wordLength}
              className="rounded-md border border-accent bg-accent/20 px-6 py-2 text-xs font-bold text-accent disabled:opacity-40"
            >
              Enter
            </button>
          </div>
        </div>
      )}

      {done && view.stage === "guessing" && (
        <Card className="text-center text-muted">
          {view.solved ? "Solved! Waiting for everyone else…" : "Out of guesses. Waiting for everyone else…"}
        </Card>
      )}

      {view.stage === "reveal" && (
        <Card className="flex flex-col gap-2 text-center">
          <p className="text-sm text-muted">The word was</p>
          <p className="text-2xl font-extrabold uppercase">{view.secret}</p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            {Object.entries(view.allResults ?? {}).map(([pid, result]) => (
              <p key={pid} className={pid === you.id ? "font-semibold text-foreground" : "text-muted"}>
                {nameOf(players, pid)}: {result.solved ? `solved in ${result.guesses}` : "unsolved"}
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
