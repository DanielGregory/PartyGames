"use client";

import { Card } from "../ui";
import { GameProps, nameOf } from "./types";

type TriviaView = {
  stage: "question" | "reveal";
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
  const connectedCount = players.filter((p) => p.connected).length;

  if (view.stage === "question") {
    return (
      <div className="flex flex-col gap-4">
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

  const correctIds = Object.entries(view.answers ?? {})
    .filter(([, idx]) => idx === view.correctIndex)
    .map(([id]) => id);

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <p className="text-xl font-bold">{view.question}</p>
      </Card>
      <div className="flex flex-col gap-2">
        {view.choices.map((choice, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${
              i === view.correctIndex ? "border-emerald-400 bg-emerald-400/10" : "border-card-border bg-card"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-accent">
              {LETTERS[i]}
            </span>
            {choice}
            {i === view.correctIndex && <span className="ml-auto text-emerald-400">✓</span>}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted">
        {correctIds.length > 0
          ? `Correct: ${correctIds.map((id) => nameOf(players, id)).join(", ")}`
          : "Nobody got it right"}
      </p>
    </div>
  );
}
