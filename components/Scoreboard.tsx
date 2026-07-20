import type { Player } from "@/server/types";
import { PlayerList } from "./PlayerList";
import { Button } from "./ui";

export function ScoreboardPanel({
  players,
  hostId,
  youId,
  isHost,
  round,
  gameOver,
  scoreDeltas,
  onNextRound,
  onEndGame,
}: {
  players: Player[];
  hostId: string | null;
  youId: string;
  isHost: boolean;
  round: number;
  gameOver: boolean;
  scoreDeltas: Record<string, number>;
  onNextRound: () => void;
  onEndGame: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-card-border bg-card p-5">
      <p className="text-center text-sm font-semibold text-muted">
        {gameOver ? "Final scores" : `Scoreboard · Round ${round}`}
      </p>
      <PlayerList players={players} hostId={hostId} youId={youId} showScores />
      {Object.keys(scoreDeltas).length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-muted">
          {players
            .filter((p) => scoreDeltas[p.id])
            .map((p) => (
              <li key={p.id}>
                {p.name} <span className="text-emerald-400">+{scoreDeltas[p.id]}</span>
              </li>
            ))}
        </ul>
      )}
      {isHost ? (
        <div className="flex flex-col gap-3">
          {!gameOver && <Button onClick={onNextRound}>Next round</Button>}
          <Button variant="secondary" onClick={onEndGame}>
            {gameOver ? "Back to lobby" : "End game"}
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted">
          {gameOver ? "Waiting for the host to return to the lobby…" : "Waiting for the host to continue…"}
        </p>
      )}
    </div>
  );
}
