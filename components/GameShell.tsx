"use client";

import { useState } from "react";
import type { RoomView } from "@/lib/useRoom";
import { ScoreboardPanel } from "./Scoreboard";
import { ScoreboardOverlay } from "./ScoreboardOverlay";
import { SpyfallGame } from "./games/SpyfallGame";
import { FibbingItGame } from "./games/FibbingItGame";
import { TriviaGame } from "./games/TriviaGame";
import { MostLikelyGame } from "./games/MostLikelyGame";
import { QuizMasterGame } from "./games/QuizMasterGame";
import { ConnectFourGame } from "./games/ConnectFourGame";
import { HangmanGame } from "./games/HangmanGame";
import { BattleshipGame } from "./games/BattleshipGame";
import { GuessWhoGame } from "./games/GuessWhoGame";
import { BoggleGame } from "./games/BoggleGame";
import { WordSearchGame } from "./games/WordSearchGame";
import { WordleGame } from "./games/WordleGame";
import { PictionaryGame } from "./games/PictionaryGame";
import { SorryGame } from "./games/SorryGame";
import { YahtzeeGame } from "./games/YahtzeeGame";
import { UnoGame } from "./games/UnoGame";

type Props = RoomView & {
  room: NonNullable<RoomView["room"]>;
  you: NonNullable<RoomView["you"]>;
  game: NonNullable<RoomView["game"]>;
};

export function GameShell({ room, game, you, send }: Props) {
  const gameProps = { game, players: room.players, you, send };
  const [showScoreboard, setShowScoreboard] = useState(false);

  return (
    <main className="animate-fade-slide-in mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {room.code} · Round {game.round}
        </span>
        <button
          onClick={() => setShowScoreboard(true)}
          className="rounded-full border border-card-border bg-card px-3 py-1 font-semibold text-foreground"
        >
          🏆 Scores
        </button>
      </div>

      {showScoreboard && (
        <ScoreboardOverlay
          players={room.players}
          hostId={room.hostId}
          youId={you.id}
          onClose={() => setShowScoreboard(false)}
        />
      )}

      {room.selectedGame === "spyfall" && <SpyfallGame {...gameProps} />}
      {room.selectedGame === "fibbingit" && <FibbingItGame {...gameProps} />}
      {room.selectedGame === "trivia" && <TriviaGame {...gameProps} />}
      {room.selectedGame === "mostlikely" && <MostLikelyGame {...gameProps} />}
      {room.selectedGame === "quizmaster" && <QuizMasterGame {...gameProps} />}
      {room.selectedGame === "connectfour" && <ConnectFourGame {...gameProps} />}
      {room.selectedGame === "hangman" && <HangmanGame {...gameProps} />}
      {room.selectedGame === "battleship" && <BattleshipGame {...gameProps} />}
      {room.selectedGame === "guesswho" && <GuessWhoGame {...gameProps} />}
      {room.selectedGame === "boggle" && <BoggleGame {...gameProps} />}
      {room.selectedGame === "wordsearch" && <WordSearchGame {...gameProps} />}
      {room.selectedGame === "wordle" && <WordleGame {...gameProps} />}
      {room.selectedGame === "pictionary" && <PictionaryGame {...gameProps} />}
      {room.selectedGame === "sorry" && <SorryGame {...gameProps} />}
      {room.selectedGame === "yahtzee" && <YahtzeeGame {...gameProps} />}
      {room.selectedGame === "uno" && <UnoGame {...gameProps} />}

      {game.roundOver && (
        <ScoreboardPanel
          players={room.players}
          hostId={room.hostId}
          youId={you.id}
          isHost={you.isHost}
          round={game.round}
          gameOver={game.gameOver}
          scoreDeltas={game.scoreDeltas}
          onNextRound={() => send({ type: "next_round" })}
          onEndGame={() => send({ type: "end_game" })}
        />
      )}
    </main>
  );
}
