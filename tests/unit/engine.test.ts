import { describe, expect, it } from "vitest";
import { EVENTS, TASKS } from "../../src/domain/config";
import {
  calculateCosts,
  commitWeek,
  createInitialState,
  enterDebrief,
  getEligibleTasks,
  resolveCapacityRecovery,
  totalCosts,
  validateAllocation,
} from "../../src/domain/engine";
import type { GameState } from "../../src/domain/types";
import { playFixture } from "../fixtures/fullGames";

const playing = (): GameState => ({ ...createInitialState(), phase: "playing" });

describe("authoritative rules engine", () => {
  it("starts with exactly A, C, and D eligible", () => {
    expect(getEligibleTasks(createInitialState())).toEqual(["A", "C", "D"]);
  });

  it("does not unlock successors during the same committed week", () => {
    const state = playing();
    expect(validateAllocation(state, { C: 2, B: 1 }).valid).toBe(false);
    const next = commitWeek(state, { C: 2 });
    expect(next.history[0]?.eligibleAtStart).toEqual(["A", "C", "D"]);
    expect(getEligibleTasks(next)).toContain("B");
  });

  it("rejects more than two workers on one task", () => {
    expect(validateAllocation(playing(), { A: 3 }).errors.join(" ")).toContain("no more than 2");
  });

  it("rejects more than five workers in one week", () => {
    expect(validateAllocation(playing(), { A: 2, C: 2, D: 2 }).errors.join(" ")).toContain("maximum is 5");
  });

  it("prices regular labor, fifth-worker premium, and crashing transparently", () => {
    expect(calculateCosts({ A: 1 }, 1, 10)).toEqual({ regularLabor: 200, fifthWorkerPremium: 0, crashing: 0, latePenalty: 0, total: 200 });
    const five = calculateCosts({ A: 2, C: 2, D: 1 }, 1, 10);
    expect(five.regularLabor).toBe(1000);
    expect(five.fifthWorkerPremium).toBe(100);
    expect(five.crashing).toBe(200);
    expect(five.total).toBe(1300);
  });

  it("charges one crashing fee for each task with two workers", () => {
    expect(calculateCosts({ A: 2, C: 2 }, 1, 10).crashing).toBe(200);
  });

  it("changes the deadline after Week 5", () => {
    let state = playing();
    for (let week = 1; week <= 5; week += 1) state = commitWeek(state, {});
    expect(state.deadline).toBe(9);
    expect(state.history[4]?.event?.deadline).toBe(9);
  });

  it("adds $2,000 for each committed late week", () => {
    expect(calculateCosts({}, 9, 9).latePenalty).toBe(0);
    expect(calculateCosts({}, 10, 9).latePenalty).toBe(2000);
    const late = playFixture(11);
    expect(totalCosts(late).latePenalty).toBe(4000);
  });

  it("applies every duration event after the configured week", () => {
    let state = playing();
    for (let week = 1; week <= 7; week += 1) state = commitWeek(state, {});
    expect(state.history.flatMap((record) => record.event ? [record.event.afterWeek] : [])).toEqual(EVENTS.map((event) => event.afterWeek));
    expect(state.tasks).toMatchObject({ B: { required: 3 }, D: { required: 4 }, E: { required: 2 }, F: { required: 5 }, H: { required: 2 }, I: { required: 7 }, J: { required: 5 }, K: { required: 4 } });
  });

  it("records the event week when a duration reduction completes a task", () => {
    let state = playing();
    state = commitWeek(state, { C: 2, D: 2 });
    state = commitWeek(state, { D: 2 });
    state = commitWeek(state, { H: 2 });
    state = commitWeek(state, {});
    expect(state.tasks.H.completedWeek).toBe(4);
    expect(state.history[3]?.completedTasks).toContain("H");
  });

  it("has 38 initial and 40 final worker-weeks", () => {
    expect(TASKS.reduce((sum, task) => sum + task.initialDuration, 0)).toBe(38);
    let state = playing();
    for (let week = 1; week <= 7; week += 1) state = commitWeek(state, {});
    expect(Object.values(state.tasks).reduce((sum, task) => sum + task.required, 0)).toBe(40);
  });

  it("restricts capacity recovery to historically eligible tasks", () => {
    let state = playing();
    state = commitWeek(state, { C: 2, D: 2 });
    state = commitWeek(state, { A: 1, D: 2 });
    state = commitWeek(state, { F: 2, H: 2 });
    state = commitWeek(state, { F: 1, H: 1 });
    expect(state.pendingRecoveries[0]).toMatchObject({ sourceTask: "H", historicalWeek: 4 });
    expect(state.pendingRecoveries[0]?.eligibleTargets).toContain("F");
    expect(() => resolveCapacityRecovery(state, "I")).toThrow(/not eligible/);
    expect(resolveCapacityRecovery(state).pendingRecoveries).toHaveLength(0);
  });

  it("automatically resolves capacity recovery when no valid reassignment target exists", () => {
    let state = playing();
    state = commitWeek(state, { C: 2, D: 2 });
    state = commitWeek(state, { B: 2, D: 2 });
    state = commitWeek(state, { B: 1, F: 2, H: 2 });
    state = commitWeek(state, { A: 2, F: 2, H: 1 });
    expect(state.pendingRecoveries).toHaveLength(0);
    expect(state.recoveries.at(-1)).toMatchObject({ sourceTask: "H", historicalWeek: 4, leftUnused: true });
  });

  it("produces deterministic Week 9, Week 10, and Week 11 fixtures", () => {
    for (const week of [9, 10, 11] as const) {
      const state = playFixture(week);
      expect(state.phase).toBe("complete");
      expect(state.history.at(-1)?.week).toBe(week);
      expect(Object.keys(state.tasks)).toHaveLength(12);
    }
  });

  it("does not enter the debrief before all twelve tasks are complete", () => {
    expect(() => enterDebrief(playing())).toThrow(/only after all twelve/);
    expect(enterDebrief(playFixture(9)).phase).toBe("debrief");
  });
});
