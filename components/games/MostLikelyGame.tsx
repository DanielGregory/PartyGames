"use client";

import { Card } from "../ui";
import { GameProps, nameOf } from "./types";

type MostLikelyView = {
  stage: "vote" | "reveal";
  prompt: string;
  hasVoted: boolean;
  votedCount: number;
  votes?: Record<string, string>;
  winners?: string[];
};

export function MostLikelyGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as MostLikelyView;
  const connected = players.filter((p) => p.connected);

  if (view.stage === "vote") {
    return (
      <div className="flex flex-col gap-4">
        <Card className="text-center">
          <p className="text-xl font-bold">{view.prompt}</p>
        </Card>
        <p className="text-center text-sm text-muted">{view.votedCount}/{connected.length} voted</p>
        <div className="flex flex-col gap-2">
          {connected
            .filter((p) => p.id !== you.id)
            .map((p) => (
              <button
                key={p.id}
                disabled={view.hasVoted}
                onClick={() => send({ type: "game_action", payload: { type: "vote", targetId: p.id } })}
                className="rounded-2xl border border-card-border bg-card px-5 py-4 text-left text-lg font-medium hover:border-accent disabled:opacity-40"
              >
                {p.name}
              </button>
            ))}
        </div>
        {view.hasVoted && <p className="text-center text-muted">Vote locked in. Waiting for everyone else…</p>}
      </div>
    );
  }

  const tally: Record<string, number> = {};
  for (const target of Object.values(view.votes ?? {})) {
    tally[target] = (tally[target] ?? 0) + 1;
  }
  const ranked = [...players]
    .filter((p) => tally[p.id])
    .sort((a, b) => (tally[b.id] ?? 0) - (tally[a.id] ?? 0));

  return (
    <div className="flex flex-col gap-4">
      <Card className="text-center">
        <p className="text-xl font-bold">{view.prompt}</p>
      </Card>
      <div className="flex flex-col gap-2">
        {ranked.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
              view.winners?.includes(p.id) ? "border-accent bg-accent/10" : "border-card-border bg-card"
            }`}
          >
            <span className="font-medium">
              {p.name} {view.winners?.includes(p.id) && "🏆"}
            </span>
            <span className="text-muted">{tally[p.id]} votes</span>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted">
        {view.winners && view.winners.length > 0
          ? `Most likely: ${view.winners.map((id) => nameOf(players, id)).join(", ")}`
          : ""}
      </p>
    </div>
  );
}
