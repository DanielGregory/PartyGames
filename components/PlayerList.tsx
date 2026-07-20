import type { Player } from "@/server/types";

export function PlayerList({
  players,
  hostId,
  youId,
  showScores = false,
}: {
  players: Player[];
  hostId: string | null;
  youId?: string;
  showScores?: boolean;
}) {
  const sorted = showScores ? [...players].sort((a, b) => b.score - a.score) : players;

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((player) => (
        <li
          key={player.id}
          className="flex items-center justify-between rounded-2xl border border-card-border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                player.connected ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <span className="font-medium">
              {player.name}
              {player.id === youId && <span className="text-muted"> (you)</span>}
            </span>
            {player.id === hostId && <span title="Host">👑</span>}
          </div>
          {showScores && <span className="font-mono font-semibold text-accent">{player.score}</span>}
        </li>
      ))}
    </ul>
  );
}
