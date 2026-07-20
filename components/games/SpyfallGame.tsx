"use client";

import { Button, Card } from "../ui";
import { Countdown } from "../Countdown";
import { PlayerList } from "../PlayerList";
import { GameProps, nameOf } from "./types";
import { useCountdownMs } from "@/lib/useCountdown";

type SpyfallView = {
  stage: "discussion" | "voting" | "reveal";
  isSpy: boolean;
  role: string | null;
  location: string | null;
  timerEndsAt: number;
  votedCount: number;
  hasVoted: boolean;
  allLocations: string[];
  result?: { spyId: string; location: string; votes: Record<string, string>; spyCaught: boolean };
};

export function SpyfallGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as SpyfallView;
  const remainingMs = useCountdownMs(view.timerEndsAt);
  const connected = players.filter((p) => p.connected);

  if (view.stage === "discussion") {
    return (
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col items-center gap-3 text-center">
          {view.isSpy ? (
            <>
              <p className="text-2xl font-extrabold">🕵️ You are the SPY</p>
              <p className="text-muted">
                Blend in! Try to figure out the location from what others say.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">The location is</p>
              <p className="text-3xl font-extrabold">{view.location}</p>
              <p className="text-lg">
                Your role: <span className="font-semibold">{view.role}</span>
              </p>
            </>
          )}
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted">Discuss out loud, then vote</p>
          <Countdown remainingMs={remainingMs} className="font-mono text-4xl font-bold" />
        </div>

        {view.isSpy && (
          <details className="rounded-2xl border border-card-border bg-card p-4 text-sm text-muted">
            <summary className="cursor-pointer font-semibold text-foreground">Possible locations</summary>
            <p className="mt-2">{view.allLocations.join(", ")}</p>
          </details>
        )}

        {you.isHost && (
          <Button onClick={() => send({ type: "game_action", payload: { type: "advance_to_vote" } })}>
            Move to voting
          </Button>
        )}
      </div>
    );
  }

  if (view.stage === "voting") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center text-lg font-semibold">Who is the spy?</p>
        <p className="text-center text-sm text-muted">{view.votedCount}/{connected.length} voted</p>
        <div className="flex flex-col gap-2">
          {connected.map((p) => (
            <button
              key={p.id}
              disabled={view.hasVoted}
              onClick={() => send({ type: "game_action", payload: { type: "vote", targetId: p.id } })}
              className="rounded-2xl border border-card-border bg-card px-5 py-4 text-left text-lg font-medium hover:border-accent disabled:opacity-40"
            >
              {p.name} {p.id === you.id && <span className="text-muted">(you)</span>}
            </button>
          ))}
        </div>
        {view.hasVoted && <p className="text-center text-muted">Vote locked in. Waiting for everyone else…</p>}
      </div>
    );
  }

  const result = view.result;
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-muted">The location was</p>
        <p className="text-2xl font-extrabold">{result?.location}</p>
        <p className="mt-2">
          The spy was <span className="font-semibold">{nameOf(players, result?.spyId)}</span>
        </p>
        <p className={result?.spyCaught ? "text-emerald-400" : "text-red-400"}>
          {result?.spyCaught ? "The spy was caught!" : "The spy got away!"}
        </p>
      </Card>
      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Votes</p>
        <PlayerList players={players} hostId={null} youId={you.id} />
        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
          {Object.entries(result?.votes ?? {}).map(([voter, target]) => (
            <li key={voter}>
              {nameOf(players, voter)} voted for {nameOf(players, target)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
