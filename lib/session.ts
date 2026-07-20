import { nanoid } from "nanoid";
import { useSyncExternalStore } from "react";

const PLAYER_ID_KEY = "partygames:playerId";
const PLAYER_NAME_KEY = "partygames:playerName";

function noopSubscribe() {
  return () => {};
}

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = nanoid(12);
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getSavedName(): string {
  return localStorage.getItem(PLAYER_NAME_KEY) ?? "";
}

export function saveName(name: string) {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

// Reads the saved name without desyncing SSR/hydration: the server snapshot
// is always "", and the real value appears right after mount.
export function useSavedName(): string {
  return useSyncExternalStore(noopSubscribe, getSavedName, () => "");
}
