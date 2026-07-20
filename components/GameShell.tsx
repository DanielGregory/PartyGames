"use client";

import type { RoomView } from "@/lib/useRoom";
import { ScoreboardPanel } from "./Scoreboard";
import { SpyfallGame } from "./games/SpyfallGame";
import { FibbingItGame } from "./games/FibbingItGame";
import { TriviaGame } from "./games/TriviaGame";
import { MostLikelyGame } from "./games/MostLikelyGame";

type Props = RoomView & {
  room: NonNullable<RoomView["room"]>;
  you: NonNullable<RoomView["you"]>;
  game: NonNullable<RoomView["game"]>;
};

export function GameShell({ room, game, you, send }: Props) {
  const gameProps = { game, players: room.players, you, send };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
      <div className="text-center text-sm text-muted">
        {room.code} · Round {game.round}
      </div>

      {room.selectedGame === "spyfall" && <SpyfallGame {...gameProps} />}
      {room.selectedGame === "fibbingit" && <FibbingItGame {...gameProps} />}
      {room.selectedGame === "trivia" && <TriviaGame {...gameProps} />}
      {room.selectedGame === "mostlikely" && <MostLikelyGame {...gameProps} />}

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
