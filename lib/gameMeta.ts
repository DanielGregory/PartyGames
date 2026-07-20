import type { GameId } from "@/server/types";

// Kept separate from server/games/registry.ts (server-only) so the client
// bundle never pulls in game logic or answer banks.
export type GameMeta = {
  id: GameId;
  label: string;
  emoji: string;
  description: string;
  minPlayers: number;
};

export const GAME_LIST: GameMeta[] = [
  {
    id: "spyfall",
    label: "Spyfall",
    emoji: "🕵️",
    description: "Everyone shares a secret location except one spy. Discuss in person, then vote out the spy.",
    minPlayers: 3,
  },
  {
    id: "fibbingit",
    label: "Fibbing It",
    emoji: "🤥",
    description: "Bluff your way to points. Write a fake answer, then guess which answer is the real one.",
    minPlayers: 3,
  },
  {
    id: "trivia",
    label: "Trivia",
    emoji: "🧠",
    description: "Answer multiple-choice questions faster and more accurately than everyone else.",
    minPlayers: 2,
  },
  {
    id: "mostlikely",
    label: "Most Likely To",
    emoji: "👉",
    description: "Vote for the player most likely to... and see the results live.",
    minPlayers: 3,
  },
];

export function gameMeta(id: GameId): GameMeta {
  const meta = GAME_LIST.find((g) => g.id === id);
  if (!meta) throw new Error(`Unknown game id: ${id}`);
  return meta;
}
