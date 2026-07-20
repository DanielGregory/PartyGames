"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Card, TextField } from "../ui";
import { GameProps, nameOf } from "./types";
import { formatCountdown, useCountdownMs } from "@/lib/useCountdown";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string; lineWidth: number };
type GuessEntry = { playerId: string; correct: boolean; text: string | null };

type PictionaryView = {
  stage: "choosing" | "drawing" | "reveal";
  round: number;
  drawerId: string;
  isDrawer: boolean;
  chooseEndsAt?: number;
  wordChoices?: string[] | null;
  timerEndsAt?: number | null;
  strokes?: Stroke[];
  guesses?: GuessEntry[];
  correctGuessers?: string[];
  hasSolved?: boolean;
  wordLength?: number;
  word?: string | null;
};

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 220;
const FLUSH_MS = 40;
const PALETTE = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#ffffff"];
const LINE_WIDTH = 4;

export function PictionaryGame({ game, players, you, send }: GameProps) {
  const view = game as unknown as PictionaryView;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pendingRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);
  const [color, setColor] = useState(PALETTE[0]);
  const [guessDraft, setGuessDraft] = useState("");
  const timedOutChoose = useRef<number | null>(null);
  const timedOutDraw = useRef<number | null>(null);

  const chooseRemaining = useCountdownMs(view.chooseEndsAt ?? 0);
  const drawRemaining = useCountdownMs(view.timerEndsAt ?? 0);

  useEffect(() => {
    if (view.stage !== "choosing") return;
    if (chooseRemaining > 0) return;
    if (timedOutChoose.current === view.round) return;
    timedOutChoose.current = view.round;
    send({ type: "game_action", payload: { type: "time_up" } });
  }, [chooseRemaining, view.stage, view.round, send]);

  useEffect(() => {
    if (view.stage !== "drawing") return;
    if (drawRemaining > 0) return;
    if (timedOutDraw.current === view.round) return;
    timedOutDraw.current = view.round;
    send({ type: "game_action", payload: { type: "time_up" } });
  }, [drawRemaining, view.stage, view.round, send]);

  // New round: wipe whatever was on the canvas locally, for drawer + guessers.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, [view.round]);

  // Guessers (and the drawer, once the round ends) redraw fully from the
  // broadcast stroke history. The drawer skips this while actively drawing
  // and instead renders locally for zero-latency feedback - see the pointer
  // handlers below - so it never fights with the eager local drawing.
  useEffect(() => {
    if (view.isDrawer && view.stage === "drawing") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of view.strokes ?? []) {
      drawStroke(ctx, canvas, stroke);
    }
  }, [view.isDrawer, view.stage, view.strokes]);

  function flush() {
    if (pendingRef.current.length === 0) return;
    const points = pendingRef.current;
    pendingRef.current = [];
    send({ type: "game_action", payload: { type: "add_points", points } });
  }

  useEffect(() => {
    if (!view.isDrawer || view.stage !== "drawing") return;
    const id = setInterval(flush, FLUSH_MS);
    return () => {
      clearInterval(id);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.isDrawer, view.stage]);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!view.isDrawer || view.stage !== "drawing") return;
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext("2d")!;
    const pt = pointFromEvent(e);
    isDrawingRef.current = true;
    pendingRef.current = [pt];
    styleContext(ctx, color, LINE_WIDTH);
    drawDot(ctx, canvas, pt, color);
    ctx.beginPath();
    ctx.moveTo(pt.x * canvas.width, pt.y * canvas.height);
    send({ type: "game_action", payload: { type: "start_stroke", color, lineWidth: LINE_WIDTH } });
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pt = pointFromEvent(e);
    ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
    ctx.stroke();
    pendingRef.current.push(pt);
  }

  function onPointerUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    flush();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    send({ type: "game_action", payload: { type: "clear_canvas" } });
  }

  function submitGuess() {
    const text = guessDraft.trim();
    if (!text) return;
    send({ type: "game_action", payload: { type: "guess", text } });
    setGuessDraft("");
  }

  if (view.stage === "choosing") {
    return (
      <div className="flex flex-col gap-4">
        <Card className="text-center">
          <p className="text-lg font-semibold">
            {view.isDrawer ? "Pick a word to draw" : `${nameOf(players, view.drawerId)} is picking a word…`}
          </p>
          <p className="mt-1 font-mono text-sm text-muted">{formatCountdown(chooseRemaining)}</p>
        </Card>
        {view.isDrawer && (
          <div className="flex flex-col gap-2">
            {(view.wordChoices ?? []).map((word) => (
              <button
                key={word}
                onClick={() => send({ type: "game_action", payload: { type: "choose_word", word } })}
                className="rounded-2xl border border-card-border bg-card px-5 py-4 text-lg font-semibold transition-colors hover:border-accent/50"
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const canGuess = view.stage === "drawing" && !view.isDrawer && !view.hasSolved;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{view.isDrawer ? "You're drawing" : `${nameOf(players, view.drawerId)} is drawing`}</span>
        {view.stage === "drawing" && (
          <span className="font-mono font-semibold text-foreground">{formatCountdown(drawRemaining)}</span>
        )}
      </div>

      {!view.isDrawer && (
        <p className="text-center text-2xl font-bold tracking-[0.3em]">
          {view.word ? view.word.toUpperCase() : "_ ".repeat(view.wordLength ?? 0).trim()}
        </p>
      )}
      {view.isDrawer && view.stage === "drawing" && (
        <p className="text-center text-lg font-bold uppercase">{view.word}</p>
      )}

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="h-auto w-full touch-none rounded-2xl border border-card-border bg-white"
      />

      {view.isDrawer && view.stage === "drawing" && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-accent" : "border-card-border"}`}
              />
            ))}
          </div>
          <button
            onClick={clearCanvas}
            className="rounded-md border border-card-border bg-card px-3 py-1.5 text-xs font-bold"
          >
            Clear
          </button>
        </div>
      )}

      {!view.isDrawer && view.stage === "drawing" && (
        <div className="flex gap-2">
          <TextField
            placeholder={view.hasSolved ? "You got it!" : "Type your guess"}
            value={guessDraft}
            disabled={!canGuess}
            maxLength={60}
            onChange={(e) => setGuessDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitGuess()}
          />
          <Button className="w-auto px-6" disabled={!canGuess} onClick={submitGuess}>
            Guess
          </Button>
        </div>
      )}

      {(view.guesses?.length ?? 0) > 0 && (
        <div className="flex max-h-40 flex-col-reverse gap-1 overflow-y-auto rounded-2xl border border-card-border bg-card p-3 text-sm">
          {[...(view.guesses ?? [])].reverse().map((g, i) => (
            <p
              key={i}
              className={g.correct ? "font-semibold text-emerald-400" : g.playerId === you.id ? "font-semibold" : "text-muted"}
            >
              {g.correct ? `✅ ${nameOf(players, g.playerId)} guessed it!` : `${nameOf(players, g.playerId)}: ${g.text}`}
            </p>
          ))}
        </div>
      )}

      {view.stage === "reveal" && (
        <Card className="flex flex-col gap-2 text-center">
          <p className="text-sm text-muted">The word was</p>
          <p className="text-2xl font-extrabold uppercase">{view.word}</p>
          {(view.correctGuessers?.length ?? 0) > 0 ? (
            <div className="mt-2 flex flex-col gap-1 text-sm text-muted">
              {(view.correctGuessers ?? []).map((pid, i) => (
                <p key={pid}>
                  #{i + 1} {nameOf(players, pid)}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nobody guessed it!</p>
          )}
        </Card>
      )}
    </div>
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function styleContext(ctx: CanvasRenderingContext2D, color: string, lineWidth: number) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function drawDot(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, pt: Point, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawStroke(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, stroke: Stroke) {
  if (stroke.points.length === 0) return;
  if (stroke.points.length === 1) {
    drawDot(ctx, canvas, stroke.points[0], stroke.color);
    return;
  }
  styleContext(ctx, stroke.color, stroke.lineWidth);
  ctx.beginPath();
  stroke.points.forEach((p, i) => {
    const x = p.x * canvas.width;
    const y = p.y * canvas.height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}
