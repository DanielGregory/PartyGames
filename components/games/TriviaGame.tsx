"use client";

import { useEffect, useRef } from "react";
import { Card } from "../ui";
import { GameProps, nameOf } from "./types";
import { formatCountdown, useCountdownMs } from "@/lib/useCountdown";

type TriviaView = {
  stage: "question" | "reveal";
  round: number;
  totalRounds: number;
  timerEndsAt: number;
  question: string;
  choices: string[];
  hasAnswered: boolean;
  answeredCount: number;
  correctIndex?: number;
  yourAnswer?: number | null;
  answers?: Record<string, number>;
};

const LETTERS = ["A", "B", "C", "D"];

export function TriviaGame({ game, players, send }: GameProps) {
  const view = game as unknown as TriviaView;
  const remainingMs = useCountdownMs(view.timerEndsAt);
  const connectedCount = players.filter((p) => p.connected).length;
  const timedOutRound = useRef<number | null>(null);

  useEffect(() => {
    if (view.stage !== "question") return;
    if (remainingMs > 0) return;
    if (timedOutRound.current === view.round) return;
    timedOutRound.current = view.round;
    send({ type: "game_action", payload: { type: "time_up" } });
  }, [remainingMs, view.stage, view.round, send]);

  if (view.stage === "question") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Round {view.round}/{view.totalRounds}
          </span>
          <span className="font-mono font-semibold text-foreground">
            {formatCountdown(remainingMs)}
          </span>
        </div>
        <Card className="text-center">
          <p className="text-xl font-bold">{view.question}</p>
        </Card>
        <p className="text-center text-sm text-muted">{view.answeredCount}/{connectedCount} answered</p>
        <div className="flex flex-col gap-2">
          {view.choices.map((choice, i) => (
            <button
              key={i}
              disabled={view.hasAnswered}
              onClick={() => send({ type: "game_action", payload: { type: "answer", index: i } })}
              className="flex items-center gap-3 rounded-2xl border border-card-border bg-card px-5 py-4 text-left text-lg font-medium hover:border-accent disabled:opacity-40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-accent">
                {LETTERS[i]}
              </span>
              {choice}
            </button>
          ))}
        </div>
        {view.hasAnswered && <p className="text-center text-muted">Answer locked in…</p>}
      </div>
    );
  }

  const answers = view.answers ?? {};
  const answersByChoice: string[][] = view.choices.map(() => []);
  for (const [playerId, idx] of Object.entries(answers)) {
    if (answersByChoice[idx]) answersByChoice[idx].push(playerId);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <p className="text-xl font-bold">{view.question}</p>
      </Card>
      <div className="flex flex-col gap-2">
        {view.choices.map((choice, i) => {
          const isCorrect = i === view.correctIndex;
          const isYours = i === view.yourAnswer;
          const isYourWrongPick = isYours && !isCorrect;
          return (
            <div
              key={i}
              className={`rounded-2xl border px-5 py-4 ${
                isCorrect
                  ? "border-emerald-400 bg-emerald-400/10"
                  : isYourWrongPick
                    ? "border-red-400 bg-red-400/10"
                    : "border-card-border bg-card"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-accent">
                  {LETTERS[i]}
                </span>
                <span className="flex-1">{choice}</span>
                {isCorrect && <span className="text-emerald-400">✓</span>}
                {isYourWrongPick && <span className="text-red-400">✗ your answer</span>}
              </div>
              {answersByChoice[i].length > 0 && (
                <p className="mt-2 pl-11 text-sm text-muted">
                  {answersByChoice[i].map((id) => nameOf(players, id)).join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
