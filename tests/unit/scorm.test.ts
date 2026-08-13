import { describe, expect, it } from "vitest";
import { enterDebrief } from "../../src/domain/engine";
import { ScormAdapter } from "../../src/lms/scorm";
import { playFixture } from "../fixtures/fullGames";

class FakeApi {
  values = new Map<string, string>(); commits = 0;
  Initialize() { return "true"; } Terminate() { return "true"; }
  GetValue(key: string) { return this.values.get(key) ?? ""; }
  SetValue(key: string, value: string) { this.values.set(key, value); return "true"; }
  Commit() { this.commits += 1; return "true"; } GetLastError() { return "0"; }
}

describe("SCORM adapter", () => {
  it("does not report completion before the learner reaches the debrief", () => {
    const api = new FakeApi(); const adapter = new ScormAdapter(api);
    adapter.initialize(); const complete = playFixture(9); adapter.complete(complete);
    expect(api.values.get("cmi.completion_status")).toBe("incomplete");
    adapter.complete(enterDebrief(complete));
    expect(api.values.get("cmi.completion_status")).toBe("completed");
    expect(api.values.get("cmi.score.raw")).toBe("100");
  });

  it("operates in local fallback mode without a SCORM API", () => {
    const adapter = new ScormAdapter(null); adapter.initialize(); adapter.save(playFixture(9)); adapter.terminate();
    expect(adapter.mode).toBe("local");
  });
});
