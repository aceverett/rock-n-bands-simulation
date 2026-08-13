import type { GameState } from "../domain/types";

interface ScormApi {
  Initialize(parameter: string): string;
  Terminate(parameter: string): string;
  GetValue(element: string): string;
  SetValue(element: string, value: string): string;
  Commit(parameter: string): string;
  GetLastError(): string;
}

type ScormWindow = Window & { API_1484_11?: ScormApi };

export interface LmsAdapter {
  readonly mode: "scorm" | "local";
  initialize(): void;
  loadSuspendData(): string | null;
  save(state: GameState): void;
  complete(state: GameState): void;
  terminate(): void;
}

function findApi(start: Window): ScormApi | null {
  let current: ScormWindow | null = start as ScormWindow;
  for (let hops = 0; current && hops < 10; hops += 1) {
    try {
      if (current.API_1484_11) return current.API_1484_11;
      if (current.parent === current) break;
      current = current.parent as ScormWindow;
    } catch {
      break;
    }
  }
  try {
    const opener = start.opener as ScormWindow | null;
    return opener?.API_1484_11 ?? null;
  } catch {
    return null;
  }
}

export class ScormAdapter implements LmsAdapter {
  readonly mode: "scorm" | "local";
  private initialized = false;

  constructor(private readonly api: ScormApi | null = typeof window === "undefined" ? null : findApi(window)) {
    this.mode = api ? "scorm" : "local";
  }

  initialize(): void {
    if (!this.api || this.initialized) return;
    this.initialized = this.api.Initialize("") === "true";
    if (!this.initialized) return;
    const status = this.api.GetValue("cmi.completion_status");
    if (!status || status === "unknown" || status === "not attempted") {
      this.api.SetValue("cmi.completion_status", "incomplete");
      this.api.SetValue("cmi.success_status", "unknown");
      this.api.Commit("");
    }
  }

  loadSuspendData(): string | null {
    if (!this.api || !this.initialized) return null;
    const value = this.api.GetValue("cmi.suspend_data");
    return value || null;
  }

  save(state: GameState): void {
    if (!this.api || !this.initialized) return;
    this.api.SetValue("cmi.suspend_data", JSON.stringify(state));
    this.api.SetValue("cmi.location", `${state.phase}:${state.currentWeek}`);
    this.api.SetValue("cmi.exit", "suspend");
    this.api.Commit("");
  }

  complete(state: GameState): void {
    if (!this.api || !this.initialized || state.phase !== "debrief") return;
    this.api.SetValue("cmi.suspend_data", JSON.stringify(state));
    this.api.SetValue("cmi.completion_status", "completed");
    this.api.SetValue("cmi.success_status", "passed");
    this.api.SetValue("cmi.score.min", "0");
    this.api.SetValue("cmi.score.max", "100");
    this.api.SetValue("cmi.score.raw", "100");
    this.api.SetValue("cmi.score.scaled", "1");
    this.api.SetValue("cmi.exit", "suspend");
    this.api.Commit("");
  }

  terminate(): void {
    if (!this.api || !this.initialized) return;
    this.api.Terminate("");
    this.initialized = false;
  }
}

export function restoreFromScorm(adapter: LmsAdapter): GameState | null {
  const raw = adapter.loadSuspendData();
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as GameState;
    return state.version === 1 ? state : null;
  } catch {
    return null;
  }
}
