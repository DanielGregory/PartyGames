import type { GameId } from "@/server/types";

export type GameCategory = "party" | "word" | "twoplayer";

export const CATEGORY_ORDER: GameCategory[] = ["party", "word", "twoplayer"];

export const CATEGORY_META: Record<GameCategory, { label: string; emoji: string }> = {
  party: { label: "Party Games", emoji: "🎉" },
  word: { label: "Word Games", emoji: "📝" },
  twoplayer: { label: "2-Player Games", emoji: "🎲" },
};

// Kept separate from server/games/registry.ts (server-only) so the client
// bundle never pulls in game logic or answer banks.
export type GameMeta = {
  id: GameId;
  label: string;
  emoji: string;
  description: string;
  category: GameCategory;
  minPlayers: number;
  // Undefined means no cap. Classical board games (Tic-Tac-Toe, Chess,
  // Battleship, ...) will mostly set this to exactly 2.
  maxPlayers?: number;
  // Host-adjustable knobs shown in the lobby once this game is picked.
  // Values are sent as `config` on start_game; each game module reads them
  // with a fallback default, so this is purely additive - a room started
  // before this existed just gets each module's built-in default.
  settings?: GameSetting[];
};

export type GameSetting = {
  key: string;
  label: string;
  options: { value: string | number; label: string }[];
  default: string | number;
};

// Rounds pickers share a convention: 0 means "no cap" (∞) - the host ends
// the game manually via the scoreboard's "End game" button, same as these
// games behaved before rounds were configurable at all.
function roundsSetting(defaultValue: number, extra: number[] = [5, 10, 15]): GameSetting {
  return {
    key: "rounds",
    label: "Rounds",
    options: [{ value: 0, label: "∞" }, ...extra.map((n) => ({ value: n, label: String(n) }))],
    default: defaultValue,
  };
}

function minutesSetting(key: string, label: string, values: number[], defaultValue: number): GameSetting {
  return {
    key,
    label,
    options: values.map((n) => ({ value: n, label: `${n} min` })),
    default: defaultValue,
  };
}

export const GAME_LIST: GameMeta[] = [
  {
    id: "spyfall",
    label: "Spyfall",
    emoji: "🕵️",
    description: "Everyone shares a secret location except one spy. Discuss in person, then vote out the spy.",
    category: "party",
    minPlayers: 3,
    settings: [
      minutesSetting("discussionMinutes", "Discussion timer", [3, 5, 8, 10], 8),
      roundsSetting(0),
    ],
  },
  {
    id: "fibbingit",
    label: "Fibbing It",
    emoji: "🤥",
    description: "Bluff your way to points. Write a fake answer, then guess which answer is the real one.",
    category: "party",
    minPlayers: 3,
    settings: [roundsSetting(0)],
  },
  {
    id: "trivia",
    label: "Trivia",
    emoji: "🧠",
    description: "Answer multiple-choice questions faster and more accurately than everyone else.",
    category: "party",
    minPlayers: 2,
    settings: [
      roundsSetting(5, [3, 5, 10, 15]),
      {
        key: "timerSeconds",
        label: "Answer timer",
        options: [10, 15, 20, 30].map((n) => ({ value: n, label: `${n}s` })),
        default: 20,
      },
    ],
  },
  {
    id: "mostlikely",
    label: "Most Likely To",
    emoji: "👉",
    description: "Vote for the player most likely to... and see the results live.",
    category: "party",
    minPlayers: 3,
    settings: [roundsSetting(0)],
  },
  {
    id: "quizmaster",
    label: "Quiz Master",
    emoji: "🎤",
    description: "One player writes a question and the answer. Everyone else guesses, then the quiz master decides who's right.",
    category: "party",
    minPlayers: 3,
    settings: [roundsSetting(0)],
  },
  {
    id: "connectfour",
    label: "Connect Four",
    emoji: "🔴",
    description: "Drop discs to connect four in a row - horizontally, vertically, or diagonally.",
    category: "twoplayer",
    minPlayers: 2,
    maxPlayers: 2,
    settings: [
      {
        key: "boardSize",
        label: "Board size",
        options: [
          { value: "compact", label: "6×5 Compact" },
          { value: "classic", label: "7×6 Classic" },
          { value: "large", label: "9×7 Large" },
        ],
        default: "classic",
      },
    ],
  },
  {
    id: "hangman",
    label: "Hangman",
    emoji: "🔤",
    description: "Take turns guessing letters to reveal the secret word before you run out of guesses.",
    category: "word",
    minPlayers: 2,
    settings: [
      {
        key: "maxWrongGuesses",
        label: "Max wrong guesses",
        options: [4, 6, 8, 10].map((n) => ({ value: n, label: String(n) })),
        default: 6,
      },
    ],
  },
  {
    id: "battleship",
    label: "Battleship",
    emoji: "🚢",
    description: "Secretly place your fleet, then take turns firing at your opponent's grid to sink it.",
    category: "twoplayer",
    minPlayers: 2,
    maxPlayers: 2,
    settings: [
      {
        key: "fleet",
        label: "Fleet size",
        options: [
          { value: "quick", label: "Quick (3 ships)" },
          { value: "classic", label: "Classic (5 ships)" },
        ],
        default: "quick",
      },
    ],
  },
  {
    id: "guesswho",
    label: "Guess Who",
    emoji: "❓",
    description: "You're secretly assigned a character. Ask yes/no questions to guess your opponent's before they guess yours.",
    category: "twoplayer",
    minPlayers: 2,
    maxPlayers: 2,
    settings: [
      {
        key: "rosterSize",
        label: "Character roster",
        options: [12, 16, 20].map((n) => ({ value: n, label: String(n) })),
        default: 20,
      },
    ],
  },
  {
    id: "boggle",
    label: "Boggle",
    emoji: "🔠",
    description: "Find as many words as you can in the letter grid before time runs out. Longer words score more.",
    category: "word",
    minPlayers: 2,
    settings: [
      minutesSetting("roundMinutes", "Round timer", [2, 3, 4, 5], 3),
      {
        key: "minWordLength",
        label: "Min word length",
        options: [3, 4].map((n) => ({ value: n, label: `${n} letters` })),
        default: 3,
      },
      {
        key: "boardSize",
        label: "Board size",
        options: [
          { value: "classic", label: "4×4 Official" },
          { value: "big", label: "5×5 Big Boggle" },
        ],
        default: "classic",
      },
    ],
  },
  {
    id: "wordsearch",
    label: "Word Search",
    emoji: "🔎",
    description: "Race to find every hidden word in the grid before time runs out.",
    category: "word",
    minPlayers: 2,
    settings: [
      minutesSetting("roundMinutes", "Round timer", [2, 3, 4, 5], 3),
      {
        key: "wordCount",
        label: "Words to find",
        options: [6, 8, 10, 12].map((n) => ({ value: n, label: String(n) })),
        default: 8,
      },
      {
        key: "wordLength",
        label: "Word length",
        options: [
          { value: "short", label: "Short (3-6)" },
          { value: "medium", label: "Medium (4-8)" },
          { value: "long", label: "Long (6-10)" },
        ],
        default: "medium",
      },
    ],
  },
  {
    id: "wordle",
    label: "Wordle",
    emoji: "🟩",
    description: "Guess the secret word in one more try than its length. Fewer guesses score more.",
    category: "word",
    minPlayers: 2,
    settings: [
      {
        key: "wordLength",
        label: "Word length",
        options: [4, 5, 6, 7].map((n) => ({ value: n, label: `${n} letters` })),
        default: 5,
      },
      minutesSetting("roundMinutes", "Round timer", [2, 3, 5, 10], 3),
    ],
  },
  {
    id: "pictionary",
    label: "Pictionary",
    emoji: "🎨",
    description: "One player draws a secret word while everyone else races to guess it.",
    category: "party",
    minPlayers: 3,
    settings: [roundsSetting(0), minutesSetting("roundMinutes", "Drawing timer", [1, 2, 3, 5], 2)],
  },
];

export function gameMeta(id: GameId): GameMeta {
  const meta = GAME_LIST.find((g) => g.id === id);
  if (!meta) throw new Error(`Unknown game id: ${id}`);
  return meta;
}
