import type { ClientMessage, Player } from "@/server/types";
import type { GameView } from "@/lib/useRoom";

export type GameProps = {
  game: GameView;
  players: Player[];
  you: { id: string; isHost: boolean };
  send: (message: ClientMessage) => void;
};

export function nameOf(players: Player[], id: string | null | undefined): string {
  if (!id) return "—";
  return players.find((p) => p.id === id)?.name ?? "Unknown";
}
