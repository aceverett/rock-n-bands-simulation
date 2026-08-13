import type { GameState } from "../domain/types";

export const SAVE_KEY = "rock-n-bands-state-v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveState(state: GameState, storage: StorageLike = localStorage): void {
  storage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadState(storage: StorageLike = localStorage): GameState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.version !== 1 || !parsed.tasks || !Array.isArray(parsed.history)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearState(storage: StorageLike = localStorage): void {
  storage.removeItem(SAVE_KEY);
}
