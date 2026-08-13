import { commitWeek, createInitialState, resolveCapacityRecovery } from "../../src/domain/engine";
import type { Allocation, GameState } from "../../src/domain/types";

export const ON_TIME_ALLOCATIONS: Allocation[] = [
  { A: 1, C: 2, D: 2 },
  { A: 2, B: 1, D: 2 },
  { B: 2, E: 2, F: 1 },
  { F: 2, G: 1, H: 2 },
  { F: 2, J: 1, K: 2 },
  { I: 2, K: 2, L: 1 },
  { I: 2, J: 2, K: 1 },
  { I: 2, J: 2, L: 1 },
  { I: 1 },
];

export function playFixture(completionWeek: 9 | 10 | 11): GameState {
  let state = createInitialState();
  state.phase = "playing";
  for (let week = 1; week <= completionWeek; week += 1) {
    let allocation: Allocation;
    if (week <= 8) allocation = ON_TIME_ALLOCATIONS[week - 1]!;
    else if (week === completionWeek) allocation = { I: 1 };
    else allocation = {};
    state = commitWeek(state, allocation);
    while (state.pendingRecoveries.length) state = resolveCapacityRecovery(state);
  }
  return state;
}
