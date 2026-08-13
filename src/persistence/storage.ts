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

export function normalizeRestoredState(value: unknown): GameState | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as Record<string, unknown>;
  if (legacy.version !== 1 || !legacy.tasks || !Array.isArray(legacy.history)) return null;
  if (legacy.phase === "planning") legacy.phase = "playing";
  if (typeof legacy.deadlineNoticeAcknowledged !== "boolean") legacy.deadlineNoticeAcknowledged = false;
  if (!Array.isArray(legacy.acknowledgedEventWeeks)) legacy.acknowledgedEventWeeks = legacy.deadlineNoticeAcknowledged ? [5] : [];
  delete legacy.initialPlan;
  delete legacy.reflections;
  return legacy as unknown as GameState;
}

export function loadState(storage: StorageLike = localStorage): GameState | null {
  const raw = storage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return normalizeRestoredState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearState(storage: StorageLike = localStorage): void {
  storage.removeItem(SAVE_KEY);
}
