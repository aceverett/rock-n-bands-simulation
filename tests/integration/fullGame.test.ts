import { describe, expect, it } from "vitest";
import { enterDebrief } from "../../src/domain/engine";
import { ScormAdapter } from "../../src/lms/scorm";
import { loadState, saveState, type StorageLike } from "../../src/persistence/storage";
import { playFixture } from "../fixtures/fullGames";

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

class FakeApi {
  values = new Map<string, string>();
  Initialize() { return "true"; } Terminate() { return "true"; }
  GetValue(key: string) { return this.values.get(key) ?? ""; }
  SetValue(key: string, value: string) { this.values.set(key, value); return "true"; }
  Commit() { return "true"; } GetLastError() { return "0"; }
}

describe("complete learner journey", () => {
  it("survives local resume and reports SCORM completion only at the debrief", () => {
    const storage = new MemoryStorage();
    const completed = playFixture(9);
    saveState(completed, storage);
    const restored = loadState(storage)!;
    expect(restored).toEqual(completed);

    const api = new FakeApi(); const lms = new ScormAdapter(api);
    lms.initialize(); lms.save(restored);
    expect(api.values.get("cmi.completion_status")).toBe("incomplete");
    const debrief = enterDebrief(restored); lms.complete(debrief);
    expect(api.values.get("cmi.completion_status")).toBe("completed");
    expect(JSON.parse(api.values.get("cmi.suspend_data") ?? "null")).toEqual(debrief);
  });
});
