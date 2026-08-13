import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/domain/engine";
import { clearState, loadState, saveState, SAVE_KEY, type StorageLike } from "../../src/persistence/storage";

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

describe("persistence", () => {
  it("restores an equivalent complete game state", () => {
    const storage = new MemoryStorage();
    const state = createInitialState(); state.currentWeek = 4;
    saveState(state, storage);
    expect(loadState(storage)).toEqual(state);
  });

  it("migrates a legacy planning save without retaining written responses", () => {
    const storage = new MemoryStorage();
    const state = createInitialState() as unknown as Record<string, unknown>;
    state.phase = "planning";
    state.initialPlan = { strategy: "Legacy response", allocationSketch: "Legacy sketch" };
    state.reflections = ["One", "Two", "Three"];
    delete state.deadlineNoticeAcknowledged;
    storage.setItem(SAVE_KEY, JSON.stringify(state));
    const restored = loadState(storage)! as unknown as Record<string, unknown>;
    expect(restored.phase).toBe("playing");
    expect(restored.initialPlan).toBeUndefined();
    expect(restored.reflections).toBeUndefined();
    expect(restored.deadlineNoticeAcknowledged).toBe(false);
  });

  it("clears only the application save key", () => {
    const storage = new MemoryStorage(); storage.setItem(SAVE_KEY, "saved"); storage.setItem("other", "keep");
    clearState(storage);
    expect(storage.getItem(SAVE_KEY)).toBeNull(); expect(storage.getItem("other")).toBe("keep");
  });
});
