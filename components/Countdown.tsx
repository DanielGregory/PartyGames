"use client";

import { formatCountdown } from "@/lib/useCountdown";

export function Countdown({
  remainingMs,
  lowMs = 10_000,
  className = "font-mono font-semibold",
  colorClassName = "text-foreground",
}: {
  remainingMs: number;
  lowMs?: number;
  className?: string;
  colorClassName?: string;
}) {
  const low = remainingMs > 0 && remainingMs <= lowMs;
  return (
    <span className={`${className} ${low ? "animate-pulse text-red-400" : colorClassName}`}>
      {formatCountdown(remainingMs)}
    </span>
  );
}
