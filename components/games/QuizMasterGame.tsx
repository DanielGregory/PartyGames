"use client";

import { useState } from "react";
import { Button, Card, TextField } from "../ui";
import { GameProps, nameOf } from "./types";

type QuizMasterView = {
  stage: "ask" | "guess" | "judge" | "reveal";
  askerId: string;
  isAsker: boolean;
  question?: string | null;
  correctAnswer?: string | null;
  hasGuessed?: boolean;
  guessedCount?: number;
  yourGuess?: string | null;
  guesses?: Record<string, string>;
  judgments?: Record<string, boolean>;
};

export function QuizMasterGame({ game, players, send }: GameProps) {
  const view = game as unknown as QuizMasterView;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [guess, setGuess] = useState("");
  const askerName = nameOf(players, view.askerId);
  const guesserCount = players.filter((p) => p.connected && p.id !== view.askerId).length;

  if (view.stage === "ask") {
    if (!view.isAsker) {
      return (
        <Card className="text-center text-muted">
          Waiting for <span className="font-semibold text-foreground">{askerName}</span> to write a
          question…
        </Card>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center text-lg font-semibold">You&rsquo;re the quiz master!</p>
        <TextField
          placeholder="Write a question"
          value={question}
          maxLength={150}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <TextField
          placeholder="The correct answer"
          value={answer}
          maxLength={80}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <Button
          disabled={!question.trim() || !answer.trim()}
          onClick={() =>
            send({ type: "game_action", payload: { type: "submit_question", question, answer } })
          }
        >
          Ask the group
        </Button>
      </div>
    );
  }

  if (view.stage === "guess") {
    if (view.isAsker) {
      return (
        <Card className="text-center text-muted">
          {view.guessedCount ?? 0}/{guesserCount} have guessed…
        </Card>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <Card className="text-center">
          <p className="text-sm text-muted">{askerName} asks</p>
          <p className="mt-1 text-xl font-bold">{view.question}</p>
        </Card>
        {view.hasGuessed ? (
          <Card className="text-center text-muted">Guess locked in. Waiting for everyone else…</Card>
        ) : (
          <>
            <TextField
              placeholder="Your answer"
              value={guess}
              maxLength={80}
              onChange={(e) => setGuess(e.target.value)}
            />
            <Button
              disabled={!guess.trim()}
              onClick={() => send({ type: "game_action", payload: { type: "submit_guess", text: guess } })}
            >
              Submit guess
            </Button>
          </>
        )}
      </div>
    );
  }

  if (view.stage === "judge") {
    if (!view.isAsker) {
      return (
        <div className="flex flex-col gap-4">
          <Card className="text-center">
            <p className="text-sm text-muted">The question</p>
            <p className="mt-1 text-xl font-bold">{view.question}</p>
          </Card>
          <Card className="text-center text-muted">
            {askerName} is judging the answers…
            {view.yourGuess && (
              <span className="mt-1 block text-sm">
                Your guess: <span className="text-foreground">{view.yourGuess}</span>
              </span>
            )}
          </Card>
        </div>
      );
    }

    const guesses = view.guesses ?? {};
    const judgments = view.judgments ?? {};
    return (
      <div className="flex flex-col gap-4">
        <Card className="text-center">
          <p className="text-sm text-muted">Correct answer</p>
          <p className="mt-1 text-xl font-bold">{view.correctAnswer}</p>
        </Card>
        <div className="flex flex-col gap-2">
          {Object.entries(guesses).map(([guesserId, text]) => {
            const judged = judgments[guesserId];
            return (
              <div
                key={guesserId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-card-border bg-card px-4 py-3"
              >
                <div>
                  <p className="text-sm text-muted">{nameOf(players, guesserId)}</p>
                  <p className="font-medium">{text}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      send({
                        type: "game_action",
                        payload: { type: "judge", guesserId, correct: true },
                      })
                    }
                    className={`h-9 w-9 rounded-full border text-lg ${
                      judged === true ? "border-emerald-400 bg-emerald-400/20" : "border-card-border"
                    }`}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() =>
                      send({
                        type: "game_action",
                        payload: { type: "judge", guesserId, correct: false },
                      })
                    }
                    className={`h-9 w-9 rounded-full border text-lg ${
                      judged === false ? "border-red-400 bg-red-400/20" : "border-card-border"
                    }`}
                  >
                    ✗
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <Button onClick={() => send({ type: "game_action", payload: { type: "finish_judging" } })}>
          Done judging
        </Button>
      </div>
    );
  }

  // reveal
  const guesses = view.guesses ?? {};
  const judgments = view.judgments ?? {};
  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <p className="text-sm text-muted">{view.question}</p>
        <p className="mt-1 text-xl font-bold">{view.correctAnswer}</p>
      </Card>
      <div className="flex flex-col gap-2">
        {Object.entries(guesses).map(([guesserId, text]) => (
          <div
            key={guesserId}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
              judgments[guesserId]
                ? "border-emerald-400 bg-emerald-400/10"
                : "border-red-400 bg-red-400/10"
            }`}
          >
            <div>
              <p className="text-sm text-muted">{nameOf(players, guesserId)}</p>
              <p className="font-medium">{text}</p>
            </div>
            <span className={judgments[guesserId] ? "text-emerald-400" : "text-red-400"}>
              {judgments[guesserId] ? "✓" : "✗"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
