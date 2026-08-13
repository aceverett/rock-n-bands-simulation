import type { ProjectEvent, TaskDefinition, TaskId } from "./types";

export const TASKS: readonly TaskDefinition[] = [
  { id: "A", description: "Contract negotiation with selected music groups", initialDuration: 3, predecessors: [] },
  { id: "B", description: "Find a construction firm and build the stage", initialDuration: 5, predecessors: ["C"] },
  { id: "C", description: "Contract negotiation with roadies", initialDuration: 2, predecessors: [] },
  { id: "D", description: "Screen and hire security personnel", initialDuration: 3, predecessors: [] },
  { id: "E", description: "Ticket distribution arrangements", initialDuration: 1, predecessors: ["A"] },
  { id: "F", description: "Organize advertising brochures and souvenir-program printing", initialDuration: 4, predecessors: ["D"] },
  { id: "G", description: "Logistical arrangements for music-group transportation", initialDuration: 1, predecessors: ["E"] },
  { id: "H", description: "Sound-equipment arrangements", initialDuration: 3, predecessors: ["C", "D"] },
  { id: "I", description: "Process travel visas for international groups", initialDuration: 5, predecessors: ["F", "H"] },
  { id: "J", description: "Hire parking staff and make parking arrangements", initialDuration: 4, predecessors: ["B", "E", "H"] },
  { id: "K", description: "Distribute media passes and arrange for recording", initialDuration: 5, predecessors: ["G"] },
  { id: "L", description: "Arrange concession sales and restroom facilities", initialDuration: 2, predecessors: ["F"] },
] as const;

export const TASK_BY_ID = Object.fromEntries(TASKS.map((task) => [task.id, task])) as Record<TaskId, TaskDefinition>;

export const EVENTS: readonly ProjectEvent[] = [
  { afterWeek: 1, title: "Security screening expands", message: "Task D now requires 4 worker-weeks instead of 3.", changes: [{ taskId: "D", duration: 4 }] },
  { afterWeek: 2, title: "Stage efficiency and ticket complexity", message: "Task B now requires 3 worker-weeks; Task E now requires 2.", changes: [{ taskId: "B", duration: 3 }, { taskId: "E", duration: 2 }] },
  { afterWeek: 3, title: "Print scope expands", message: "Task F now requires 5 worker-weeks instead of 4.", changes: [{ taskId: "F", duration: 5 }] },
  { afterWeek: 4, title: "Sound planning improves", message: "Task H now requires 2 worker-weeks instead of 3.", changes: [{ taskId: "H", duration: 2 }] },
  { afterWeek: 5, title: "Deadline moved forward", message: "The contractual deadline is now the end of Week 9.", deadline: 9 },
  { afterWeek: 6, title: "Parking scope expands", message: "Task J now requires 5 worker-weeks instead of 4.", changes: [{ taskId: "J", duration: 5 }] },
  { afterWeek: 7, title: "Media efficiency and visa delays", message: "Task K now requires 4 worker-weeks; Task I now requires 7.", changes: [{ taskId: "K", duration: 4 }, { taskId: "I", duration: 7 }] },
] as const;

export const INITIAL_DEADLINE = 10;
export const REGULAR_WORKERS = 4;
export const MAX_WORKERS = 5;
export const MAX_PER_TASK = 2;
export const REGULAR_WORKER_COST = 200;
export const FIFTH_WORKER_PREMIUM = 100;
export const CRASHING_COST = 100;
export const LATE_PENALTY = 2000;

export const INITIAL_PATHS = [
  "A-E-G-K: 10 weeks",
  "C-B-J: 11 weeks",
  "C-H-I: 10 weeks",
  "D-H-I: 11 weeks",
  "A-E-J: 8 weeks",
  "D-H-J: 10 weeks",
  "D-F-I: 12 weeks",
  "D-F-L: 9 weeks",
] as const;
