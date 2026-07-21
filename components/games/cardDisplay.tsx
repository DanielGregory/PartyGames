// Shared standard-playing-card presentation for War/Blackjack/Hold'em - the
// three modes that all render the same 52-card deck. Types are duplicated
// (not imported from server/cards.ts) matching this codebase's convention
// of keeping client components decoupled from server/*, even for shapes
// that aren't secret.

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type PlayingCard = { suit: Suit; rank: Rank };

const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SUIT_RED: Record<Suit, boolean> = {
  hearts: true,
  diamonds: true,
  clubs: false,
  spades: false,
};

export function PlayingCardFace({
  card,
  faceDown,
  animate,
  dim,
  size = "md",
}: {
  card: PlayingCard | null;
  faceDown?: boolean;
  animate?: boolean;
  dim?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "sm" ? "h-14 w-10 text-sm" : size === "lg" ? "h-24 w-16 text-2xl" : "h-16 w-11 text-base";

  if (faceDown || !card) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg border-2 border-white/20 bg-gradient-to-br from-indigo-700 to-indigo-900 shadow ${dims} ${
          animate ? "animate-card-deal" : ""
        }`}
      >
        <span className="text-white/30">✦</span>
      </span>
    );
  }

  const red = SUIT_RED[card.suit];
  return (
    <span
      className={`flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-white/20 bg-white font-extrabold shadow ${dims} ${
        red ? "text-red-600" : "text-black"
      } ${dim ? "opacity-40" : ""} ${animate ? "animate-card-deal" : ""}`}
    >
      <span>{card.rank}</span>
      <span className="text-[0.85em]">{SUIT_SYMBOL[card.suit]}</span>
    </span>
  );
}
