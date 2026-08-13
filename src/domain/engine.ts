import {
  CRASHING_COST,
  EVENTS,
  FIFTH_WORKER_PREMIUM,
  INITIAL_DEADLINE,
  LATE_PENALTY,
  MAX_PER_TASK,
  MAX_WORKERS,
  REGULAR_WORKER_COST,
  TASK_BY_ID,
  TASKS,
} from "./config";
import {
  TASK_IDS,
  type Allocation,
  type CostBreakdown,
  type GameState,
  type PendingRecovery,
  type TaskId,
  type ValidationResult,
  type WeekRecord,
} from "./types";

const clone = <T>(value: T): T => structuredClone(value);

export function createInitialState(): GameState {
  return {
    version: 1,
    phase: "welcome",
    currentWeek: 1,
    deadline: INITIAL_DEADLINE,
    tasks: Object.fromEntries(
      TASKS.map((task) => [task.id, { required: task.initialDuration, completed: 0 }]),
    ) as GameState["tasks"],
    history: [],
    recoveries: [],
    pendingRecoveries: [],
    rulesCheckComplete: false,
    deadlineNoticeAcknowledged: false,
    acknowledgedEventWeeks: [],
  };
}

export function acknowledgeProjectEvent(input: GameState, afterWeek: number): GameState {
  const state = clone(input);
  if (!state.acknowledgedEventWeeks.includes(afterWeek)) state.acknowledgedEventWeeks.push(afterWeek);
  if (afterWeek === 5) state.deadlineNoticeAcknowledged = true;
  return state;
}

export function isComplete(state: GameState, taskId: TaskId): boolean {
  const task = state.tasks[taskId];
  return task.completed >= task.required;
}

export function allTasksComplete(state: GameState): boolean {
  return TASK_IDS.every((id) => isComplete(state, id));
}

export function getEligibleTasks(state: GameState): TaskId[] {
  return TASK_IDS.filter(
    (id) =>
      !isComplete(state, id) &&
      TASK_BY_ID[id].predecessors.every((predecessor) => isComplete(state, predecessor)),
  );
}

export function taskStatus(state: GameState, taskId: TaskId): "available" | "in-progress" | "locked" | "complete" {
  if (isComplete(state, taskId)) return "complete";
  if (!getEligibleTasks(state).includes(taskId)) return "locked";
  return state.tasks[taskId].completed > 0 ? "in-progress" : "available";
}

export function lockedReason(state: GameState, taskId: TaskId): string {
  if (isComplete(state, taskId)) return "Task is already complete.";
  const missing = TASK_BY_ID[taskId].predecessors.filter((id) => !isComplete(state, id));
  return missing.length ? `Waiting for ${missing.join(" and ")} to be completed.` : "Task is available.";
}

export function normalizeAllocation(allocation: Allocation): Allocation {
  return Object.fromEntries(
    TASK_IDS.map((id) => [id, Number(allocation[id] ?? 0)]).filter(([, workers]) => workers !== 0),
  ) as Allocation;
}

export function validateAllocation(state: GameState, allocation: Allocation): ValidationResult {
  const errors: string[] = [];
  const eligible = new Set(getEligibleTasks(state));
  let total = 0;
  for (const taskId of TASK_IDS) {
    const raw = allocation[taskId] ?? 0;
    if (!Number.isInteger(raw) || raw < 0) {
      errors.push(`Task ${taskId}: workers must be a whole number from 0 to 2.`);
      continue;
    }
    if (raw > MAX_PER_TASK) errors.push(`Task ${taskId}: no more than 2 workers may be assigned.`);
    if (raw > 0 && isComplete(state, taskId)) errors.push(`Task ${taskId} is complete and cannot receive workers.`);
    if (raw > 0 && !eligible.has(taskId)) errors.push(`Task ${taskId} is locked. ${lockedReason(state, taskId)}`);
    const remaining = Math.max(0, state.tasks[taskId].required - state.tasks[taskId].completed);
    if (raw > remaining) errors.push(`Task ${taskId} has only ${remaining} worker-week${remaining === 1 ? "" : "s"} remaining.`);
    total += raw;
  }
  if (total > MAX_WORKERS) errors.push(`This week uses ${total} workers; the maximum is 5.`);
  return { valid: errors.length === 0, errors };
}

export function calculateCosts(allocation: Allocation, week: number, deadline: number): CostBreakdown {
  const totalWorkers = TASK_IDS.reduce((sum, id) => sum + (allocation[id] ?? 0), 0);
  const regularLabor = totalWorkers * REGULAR_WORKER_COST;
  const fifthWorkerPremium = totalWorkers === 5 ? FIFTH_WORKER_PREMIUM : 0;
  const crashing = TASK_IDS.filter((id) => allocation[id] === 2).length * CRASHING_COST;
  const latePenalty = week > deadline ? LATE_PENALTY : 0;
  return {
    regularLabor,
    fifthWorkerPremium,
    crashing,
    latePenalty,
    total: regularLabor + fifthWorkerPremium + crashing + latePenalty,
  };
}

function findFirstUnnecessaryWeek(history: WeekRecord[], taskId: TaskId, newDuration: number): number | undefined {
  let cumulative = 0;
  for (const record of history) {
    cumulative += record.allocations[taskId] ?? 0;
    if (cumulative > newDuration) return record.week;
  }
  return undefined;
}

function recoveryTargets(state: GameState, record: WeekRecord, sourceTask: TaskId): TaskId[] {
  return record.eligibleAtStart.filter((id) => {
    if (id === sourceTask) return false;
    if ((record.allocations[id] ?? 0) >= MAX_PER_TASK) return false;
    return state.tasks[id].completed < state.tasks[id].required;
  });
}

function applyEvent(state: GameState, record: WeekRecord): void {
  const event = EVENTS.find((candidate) => candidate.afterWeek === record.week);
  if (!event) return;
  record.event = clone(event);
  if (event.deadline !== undefined) state.deadline = event.deadline;
  for (const change of event.changes ?? []) {
    const task = state.tasks[change.taskId];
    const oldRequired = task.required;
    const oldCompleted = task.completed;
    task.required = change.duration;

    if (change.duration < oldRequired) {
      if (oldCompleted >= change.duration && !task.completedWeek) {
        task.completedWeek = record.week;
        if (!record.completedTasks.includes(change.taskId)) record.completedTasks.push(change.taskId);
      }
      if (oldCompleted > change.duration) {
        const historicalWeek = findFirstUnnecessaryWeek(state.history, change.taskId, change.duration);
        task.completed = change.duration;
        if (historicalWeek !== undefined) {
          const historicalRecord = state.history.find((item) => item.week === historicalWeek);
          if (historicalRecord) {
            const pending: PendingRecovery = {
              sourceTask: change.taskId,
              historicalWeek,
              eventAfterWeek: record.week,
              eligibleTargets: recoveryTargets(state, historicalRecord, change.taskId),
            };
            state.pendingRecoveries.push(pending);
          }
        }
      }
    } else if (change.duration > oldRequired && task.completed < change.duration) {
      delete task.completedWeek;
    }
  }
}

export function commitWeek(input: GameState, allocation: Allocation): GameState {
  if (input.phase !== "playing") throw new Error("A week can only be committed during active play.");
  if (input.pendingRecoveries.length) throw new Error("Resolve capacity recovery before committing another week.");
  const validation = validateAllocation(input, allocation);
  if (!validation.valid) throw new Error(validation.errors.join(" "));

  const state = clone(input);
  const eligibleAtStart = getEligibleTasks(state);
  const beforeComplete = new Set(TASK_IDS.filter((id) => isComplete(state, id)));
  const committed = normalizeAllocation(allocation);

  for (const taskId of eligibleAtStart) {
    const workers = committed[taskId] ?? 0;
    state.tasks[taskId].completed += workers;
  }

  const completedTasks = TASK_IDS.filter(
    (id) => !beforeComplete.has(id) && isComplete(state, id),
  );
  for (const id of completedTasks) state.tasks[id].completedWeek = state.currentWeek;

  const record: WeekRecord = {
    week: state.currentWeek,
    eligibleAtStart,
    allocations: committed,
    completedTasks,
    availableNextWeek: [],
    costs: calculateCosts(committed, state.currentWeek, state.deadline),
  };
  state.history.push(record);
  applyEvent(state, record);
  record.availableNextWeek = getEligibleTasks(state);
  state.lastUpdate = `Week ${record.week} committed. ${completedTasks.length ? `Completed: ${completedTasks.join(", ")}.` : "No tasks completed."}${record.event ? ` Update: ${record.event.message}` : ""}`;
  state.currentWeek += 1;
  let resolvedState = state;
  while (resolvedState.pendingRecoveries[0]?.eligibleTargets.length === 0) {
    resolvedState = resolveCapacityRecovery(resolvedState);
  }
  if (allTasksComplete(resolvedState)) resolvedState.phase = "complete";
  return resolvedState;
}

export function resolveCapacityRecovery(input: GameState, reassignedTo?: TaskId): GameState {
  if (!input.pendingRecoveries.length) throw new Error("No capacity recovery is pending.");
  const state = clone(input);
  const pending = state.pendingRecoveries[0]!;
  if (reassignedTo && !pending.eligibleTargets.includes(reassignedTo)) {
    throw new Error(`Task ${reassignedTo} was not eligible at the start of historical Week ${pending.historicalWeek}.`);
  }
  const record = state.history.find((item) => item.week === pending.historicalWeek);
  if (!record) throw new Error("The affected historical week could not be found.");
  const sourceWorkers = record.allocations[pending.sourceTask] ?? 0;
  if (sourceWorkers < 1) throw new Error("The recovered worker-week is not present in the historical allocation.");

  const oldCost = record.costs.total;
  record.allocations[pending.sourceTask] = sourceWorkers - 1;
  if (record.allocations[pending.sourceTask] === 0) delete record.allocations[pending.sourceTask];

  let message: string;
  if (reassignedTo) {
    record.allocations[reassignedTo] = (record.allocations[reassignedTo] ?? 0) + 1;
    const target = state.tasks[reassignedTo];
    target.completed = Math.min(target.required, target.completed + 1);
    if (target.completed >= target.required && !target.completedWeek) {
      target.completedWeek = pending.historicalWeek;
      if (!record.completedTasks.includes(reassignedTo)) record.completedTasks.push(reassignedTo);
    }
    message = `Recovered one worker-week from Task ${pending.sourceTask} in Week ${pending.historicalWeek} and reassigned it to Task ${reassignedTo}.`;
  } else {
    message = `Recovered one worker-week from Task ${pending.sourceTask} in Week ${pending.historicalWeek} and left it unused.`;
  }

  const deadlineAtWeek = record.week <= 5 ? INITIAL_DEADLINE : state.deadline;
  record.costs = calculateCosts(record.allocations, record.week, deadlineAtWeek);
  state.recoveries.push({
    eventAfterWeek: pending.eventAfterWeek,
    sourceTask: pending.sourceTask,
    historicalWeek: pending.historicalWeek,
    reassignedTo,
    leftUnused: !reassignedTo,
    costDelta: record.costs.total - oldCost,
    message,
  });
  state.pendingRecoveries.shift();
  state.lastUpdate = message;
  if (allTasksComplete(state)) state.phase = "complete";
  return state;
}

export function totalCosts(state: GameState): CostBreakdown {
  return state.history.reduce<CostBreakdown>(
    (sum, record) => ({
      regularLabor: sum.regularLabor + record.costs.regularLabor,
      fifthWorkerPremium: sum.fifthWorkerPremium + record.costs.fifthWorkerPremium,
      crashing: sum.crashing + record.costs.crashing,
      latePenalty: sum.latePenalty + record.costs.latePenalty,
      total: sum.total + record.costs.total,
    }),
    { regularLabor: 0, fifthWorkerPremium: 0, crashing: 0, latePenalty: 0, total: 0 },
  );
}

export function beginBriefing(input: GameState): GameState {
  const state = clone(input);
  state.phase = "briefing";
  return state;
}

export function completeRulesCheck(input: GameState): GameState {
  const state = clone(input);
  state.rulesCheckComplete = true;
  state.phase = "playing";
  return state;
}

export function enterDebrief(input: GameState): GameState {
  if (!allTasksComplete(input)) throw new Error("The debrief is available only after all twelve tasks are complete.");
  const state = clone(input);
  state.phase = "debrief";
  return state;
}
