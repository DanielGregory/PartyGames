"use client";

import { useState } from "react";
import { Board } from "../Board";
import { Button, Card } from "../ui";
import { GameProps, nameOf } from "./types";

type Character = { id: string; name: string; emoji: string };

type GuessWhoView = {
  stage: "asking" | "reveal";
  currentTurn: string | null;
  winner: string | null;
  isYourTurn: boolean;
  characterPool: Character[];
  yourCharacter: string | null;
  eliminated: string[];
  opponentCharacter?: string | null;
  wrongGuess?: { playerId: string; characterId: string } | null;
};

export function GuessWhoGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as GuessWhoView;
  const [guessMode, setGuessMode] = useState(false);
  const yourCharacter = view.characterPool.find((c) => c.id === view.yourCharacter);

  function tapCharacter(character: Character) {
    if (guessMode) {
      send({ type: "game_action", payload: { type: "guess", characterId: character.id } });
      setGuessMode(false);
      return;
    }
    send({ type: "game_action", payload: { type: "toggle_eliminate", characterId: character.id } });
  }

  if (view.stage === "reveal") {
    const opponentCharacter = view.characterPool.find((c) => c.id === view.opponentCharacter);
    const won = view.winner === you.id;
    return (
      <div className="flex flex-col gap-4">
        <Card className="text-center">
          <p className="text-lg font-semibold">{won ? "🎉 You win!" : `${nameOf(players, view.winner)} wins!`}</p>
          {view.wrongGuess && (
            <p className="mt-1 text-sm text-muted">
              {nameOf(players, view.wrongGuess.playerId)} guessed{" "}
              {view.characterPool.find((c) => c.id === view.wrongGuess?.characterId)?.name} — wrong!
            </p>
          )}
        </Card>
        <Card className="flex items-center justify-center gap-6 text-center">
          <div>
            <p className="text-sm text-muted">Your character</p>
            <p className="text-4xl">{yourCharacter?.emoji}</p>
            <p className="font-semibold">{yourCharacter?.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Opponent&apos;s character</p>
            <p className="text-4xl">{opponentCharacter?.emoji}</p>
            <p className="font-semibold">{opponentCharacter?.name}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-center gap-3 text-center">
        <span className="text-3xl">{yourCharacter?.emoji}</span>
        <span>
          <p className="text-sm text-muted">Your character</p>
          <p className="font-semibold">{yourCharacter?.name}</p>
        </span>
      </Card>

      <Card className="text-center">
        <p className="font-semibold">
          {view.isYourTurn ? "Your turn - ask a yes/no question out loud" : `${nameOf(players, view.currentTurn)}'s turn`}
        </p>
        <p className="text-sm text-muted">Tap faces to cross them off as you narrow it down</p>
      </Card>

      <Board
        columns={4}
        cells={view.characterPool}
        onCellClick={(character) => tapCharacter(character)}
        getCellKey={(character) => character.id}
        cellClassName={(character) =>
          view.eliminated.includes(character.id) ? "opacity-30" : ""
        }
        renderCell={(character) => (
          <span className="flex flex-col items-center justify-center gap-0.5 p-1">
            <span className="text-2xl leading-none">{character.emoji}</span>
            <span className="text-[10px] leading-tight text-muted">{character.name.split(" ")[0]}</span>
          </span>
        )}
      />

      <div className="flex gap-3">
        <Button
          variant={guessMode ? "primary" : "secondary"}
          disabled={!view.isYourTurn}
          onClick={() => setGuessMode((g) => !g)}
        >
          {guessMode ? "Tap a face to guess…" : "🎯 Make a guess"}
        </Button>
        <Button variant="secondary" disabled={!view.isYourTurn} onClick={() => send({ type: "game_action", payload: { type: "end_turn" } })}>
          End turn
        </Button>
      </div>
    </div>
  );
}
