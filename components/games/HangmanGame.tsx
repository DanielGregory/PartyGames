"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "../ui";
import { GameProps, nameOf } from "./types";

type HangmanView = {
  stage: "guessing" | "reveal";
  guessedLetters: string[];
  wrongGuesses: string[];
  maxWrongGuesses: number;
  currentTurn: string | null;
  isYourTurn: boolean;
  pattern: (string | null)[];
  wordLength: number;
  word?: string;
  won?: boolean | null;
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function HangmanGame({ game, players, send }: GameProps) {
  const view = game as unknown as HangmanView;
  const prevGuessedCountRef = useRef(view.guessedLetters.length);
  const [justGuessed, setJustGuessed] = useState<{ letter: string; wrong: boolean } | null>(null);

  // guessedLetters is append-only server-side, so the last entry is always
  // whichever letter was just tried - pop it if it hit, shake the word (and
  // that button) if it missed.
  useEffect(() => {
    if (view.guessedLetters.length > prevGuessedCountRef.current) {
      const letter = view.guessedLetters[view.guessedLetters.length - 1];
      setJustGuessed({ letter, wrong: view.wrongGuesses.includes(letter) });
    }
    prevGuessedCountRef.current = view.guessedLetters.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.guessedLetters.length]);

  useEffect(() => {
    if (!justGuessed) return;
    const timeout = setTimeout(() => setJustGuessed(null), 500);
    return () => clearTimeout(timeout);
  }, [justGuessed]);

  const shakeWord = justGuessed?.wrong ?? false;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-muted">
          Strikes: {view.wrongGuesses.length}/{view.maxWrongGuesses}
        </p>
        <p
          className={`flex flex-wrap justify-center gap-1.5 font-mono text-3xl font-bold ${
            shakeWord ? "animate-shake" : justGuessed && !justGuessed.wrong ? "animate-pop" : ""
          }`}
        >
          {view.pattern.map((ch, i) => (
            <span key={i} className="inline-block w-6 border-b-2 border-card-border text-center">
              {ch ?? " "}
            </span>
          ))}
        </p>
      </Card>

      {view.stage === "guessing" ? (
        <>
          <p className="text-center text-sm text-muted">
            {view.isYourTurn ? "Your turn - pick a letter" : `${nameOf(players, view.currentTurn)}'s turn`}
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {ALPHABET.map((letter) => {
              const guessed = view.guessedLetters.includes(letter);
              const wrong = view.wrongGuesses.includes(letter);
              const isJust = justGuessed?.letter === letter;
              return (
                <button
                  key={letter}
                  disabled={!view.isYourTurn || guessed}
                  onClick={() => send({ type: "game_action", payload: { type: "guess", letter } })}
                  className={`aspect-square rounded-lg border text-sm font-semibold transition-colors disabled:opacity-40 ${
                    isJust ? (justGuessed!.wrong ? "animate-shake" : "animate-pop") : ""
                  } ${
                    wrong
                      ? "border-red-400 bg-red-400/10 text-red-400"
                      : guessed
                        ? "border-emerald-400 bg-emerald-400/10 text-emerald-400"
                        : "border-card-border bg-card hover:border-accent"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <Card className="animate-bounce-in text-center">
          <p className="text-lg font-semibold">{view.won ? "🎉 You got it!" : "💀 Out of guesses!"}</p>
          <p className="mt-1 text-muted">
            The word was <span className="font-bold text-foreground">{view.word}</span>
          </p>
        </Card>
      )}
    </div>
  );
}
