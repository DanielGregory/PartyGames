// Generic card/deck primitives shared by any card-based game module -
// currently Uno, later Texas Hold'em/Blackjack/etc. Deliberately game-
// agnostic: shuffle/draw/discard/reshuffle work over any card type `T`, so
// a new card game defines its own card shape (see server/games/uno.ts's
// UnoCard) and reuses these mechanics rather than reimplementing them.
// The standard 52-card representation below is for those future games -
// Uno doesn't use it.

export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type Deck<T> = {
  drawPile: T[]; // top of the pile is the end of the array
  discardPile: T[]; // top of the pile is the end of the array
};

export function createDeck<T>(cards: T[], opts: { shuffle?: boolean } = {}): Deck<T> {
  return { drawPile: opts.shuffle === false ? [...cards] : shuffled(cards), discardPile: [] };
}

export function topOfDiscard<T>(deck: Deck<T>): T | null {
  return deck.discardPile.length > 0 ? deck.discardPile[deck.discardPile.length - 1] : null;
}

/**
 * Draws up to `count` cards, reshuffling the discard pile (everything
 * except its top card, which stays put as the active discard) back into
 * the draw pile if it runs dry mid-draw. Returns fewer than `count` cards
 * only if the whole deck (draw + discard) doesn't have that many left.
 */
export function drawCards<T>(deck: Deck<T>, count: number): { cards: T[]; deck: Deck<T> } {
  let drawPile = [...deck.drawPile];
  let discardPile = [...deck.discardPile];
  const drawn: T[] = [];

  for (let i = 0; i < count; i++) {
    if (drawPile.length === 0) {
      if (discardPile.length <= 1) break; // nothing left to reshuffle
      const top = discardPile[discardPile.length - 1];
      drawPile = shuffled(discardPile.slice(0, -1));
      discardPile = [top];
    }
    const card = drawPile.pop();
    if (card === undefined) break;
    drawn.push(card);
  }

  return { cards: drawn, deck: { drawPile, discardPile } };
}

export function discardCard<T>(deck: Deck<T>, card: T): Deck<T> {
  return { ...deck, discardPile: [...deck.discardPile, card] };
}

// --- Standard 52-card deck (for future card games; unused by Uno) ---

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type PlayingCard = { suit: Suit; rank: Rank };

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export function standardDeck(): PlayingCard[] {
  const cards: PlayingCard[] = [];
  for (const suit of SUITS) for (const rank of RANKS) cards.push({ suit, rank });
  return cards;
}

/** Blackjack-style rank value (Ace as 11 - callers adjust for soft/hard
 * totals themselves, this just gives the baseline number a rank spells). */
export function rankValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}
