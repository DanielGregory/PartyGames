import type { GameId } from "@/server/types";

// Kept separate from server/games/registry.ts (server-only) so the client
// bundle never pulls in game logic or answer banks.
export type GameMeta = {
  id: GameId;
  label: string;
  emoji: string;
  description: string;
  minPlayers: number;
  // Undefined means no cap. Classical board games (Tic-Tac-Toe, Chess,
  // Battleship, ...) will mostly set this to exactly 2.
  maxPlayers?: number;
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
  {
    id: "quizmaster",
    label: "Quiz Master",
    emoji: "🎤",
    description: "One player writes a question and the answer. Everyone else guesses, then the quiz master decides who's right.",
    minPlayers: 3,
  },
  {
    id: "connectfour",
    label: "Connect Four",
    emoji: "🔴",
    description: "Drop discs to connect four in a row - horizontally, vertically, or diagonally.",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "hangman",
    label: "Hangman",
    emoji: "🔤",
    description: "Take turns guessing letters to reveal the secret word before you run out of guesses.",
    minPlayers: 2,
  },
  {
    id: "battleship",
    label: "Battleship",
    emoji: "🚢",
    description: "Secretly place your fleet, then take turns firing at your opponent's grid to sink it.",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "guesswho",
    label: "Guess Who",
    emoji: "❓",
    description: "You're secretly assigned a character. Ask yes/no questions to guess your opponent's before they guess yours.",
    minPlayers: 2,
    maxPlayers: 2,
  },
  {
    id: "boggle",
    label: "Boggle",
    emoji: "🔠",
    description: "Find as many words as you can in the letter grid before time runs out. Longer words score more.",
    minPlayers: 2,
  },
  {
    id: "wordsearch",
    label: "Word Search",
    emoji: "🔎",
    description: "Race to find every hidden word in the grid before time runs out.",
    minPlayers: 2,
  },
  {
    id: "wordle",
    label: "Wordle",
    emoji: "🟩",
    description: "Guess the secret 5-letter word in 6 tries. Fewer guesses score more.",
    minPlayers: 2,
  },
];

export function gameMeta(id: GameId): GameMeta {
  const meta = GAME_LIST.find((g) => g.id === id);
  if (!meta) throw new Error(`Unknown game id: ${id}`);
  return meta;
}
