"use client";

import { useState } from "react";
import { Button, Card, TextField } from "../ui";
import { GameProps, nameOf } from "./types";

type Option = { id: string; text: string; isMine?: boolean; authorId?: string | null; isTrue?: boolean; votes?: string[] };

type FibView = {
  stage: "submit" | "vote" | "reveal";
  question: string;
  hasSubmitted: boolean;
  submittedCount: number;
  hasVoted: boolean;
  votedCount: number;
  options?: Option[];
  trueAnswer?: string;
};

export function FibbingItGame({ game, players, send }: GameProps) {
  const view = game as unknown as FibView;
  const [draft, setDraft] = useState("");
  const connectedCount = players.filter((p) => p.connected).length;

  if (view.stage === "submit") {
    return (
      <div className="flex flex-col gap-4">
        <Card className="text-center">
          <p className="text-sm text-muted">The question</p>
          <p className="mt-1 text-xl font-bold">{view.question}</p>
        </Card>

        {view.hasSubmitted ? (
          <Card className="text-center text-muted">
            Answer locked in. Waiting for {view.submittedCount}/{connectedCount}…
          </Card>
        ) : (
          <>
            <TextField
              placeholder="Write a convincing fake answer"
              value={draft}
              maxLength={80}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Button
              disabled={!draft.trim()}
              onClick={() => send({ type: "game_action", payload: { type: "submit_fake", text: draft } })}
            >
              Submit answer
            </Button>
          </>
        )}
      </div>
    );
  }

  if (view.stage === "vote") {
    return (
      <div className="flex flex-col gap-4">
        <Card className="text-center">
          <p className="text-sm text-muted">Which answer is real?</p>
          <p className="mt-1 text-xl font-bold">{view.question}</p>
        </Card>
        <p className="text-center text-sm text-muted">{view.votedCount}/{connectedCount} voted</p>
        <div className="flex flex-col gap-2">
          {view.options?.map((option) => (
            <button
              key={option.id}
              disabled={view.hasVoted || option.isMine}
              onClick={() => send({ type: "game_action", payload: { type: "vote", optionId: option.id } })}
              className="rounded-2xl border border-card-border bg-card px-5 py-4 text-left text-lg font-medium hover:border-accent disabled:opacity-40"
            >
              {option.text}
              {option.isMine && <span className="ml-2 text-sm text-muted">(yours)</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="text-center">
        <p className="text-sm text-muted">The question</p>
        <p className="mt-1 text-xl font-bold">{view.question}</p>
      </Card>
      {view.options?.map((option) => (
        <div
          key={option.id}
          className={`rounded-2xl border px-5 py-4 ${
            option.isTrue ? "border-emerald-400 bg-emerald-400/10" : "border-card-border bg-card"
          }`}
        >
          <p className="font-medium">
            {option.text} {option.isTrue && <span className="text-emerald-400">✓ true answer</span>}
          </p>
          <p className="text-sm text-muted">
            {option.authorId ? `by ${nameOf(players, option.authorId)}` : ""}
            {option.votes && option.votes.length > 0
              ? ` · voted by ${option.votes.map((v) => nameOf(players, v)).join(", ")}`
              : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
