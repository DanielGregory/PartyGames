"use client";

import { useEffect, useState } from "react";

export function useCountdownMs(endsAt: number): number {
  const [remaining, setRemaining] = useState(() => Math.max(0, endsAt - Date.now()));

  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, endsAt - Date.now())), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return remaining;
}

export function formatCountdown(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
