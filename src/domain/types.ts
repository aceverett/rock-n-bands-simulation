export const TASK_IDS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;
export type TaskId = (typeof TASK_IDS)[number];

export type Phase = "welcome" | "briefing" | "planning" | "playing" | "complete" | "debrief";

export interface TaskDefinition {
  id: TaskId;
  description: string;
  initialDuration: number;
  predecessors: TaskId[];
}

export interface TaskProgress {
  required: number;
  completed: number;
  completedWeek?: number;
}

export type Allocation = Partial<Record<TaskId, number>>;

export interface CostBreakdown {
  regularLabor: number;
  fifthWorkerPremium: number;
  crashing: number;
  latePenalty: number;
  total: number;
}

export interface DurationChange {
  taskId: TaskId;
  from: number;
  to: number;
}

export interface ProjectEvent {
  afterWeek: number;
  title: string;
  message: string;
  changes?: ReadonlyArray<{ taskId: TaskId; duration: number }>;
  deadline?: number;
}

export interface WeekRecord {
  week: number;
  eligibleAtStart: TaskId[];
  allocations: Allocation;
  completedTasks: TaskId[];
  availableNextWeek: TaskId[];
  event?: ProjectEvent;
  costs: CostBreakdown;
}

export interface RecoveryRecord {
  eventAfterWeek: number;
  sourceTask: TaskId;
  historicalWeek: number;
  reassignedTo?: TaskId;
  leftUnused: boolean;
  costDelta: number;
  message: string;
}

export interface PendingRecovery {
  sourceTask: TaskId;
  historicalWeek: number;
  eventAfterWeek: number;
  eligibleTargets: TaskId[];
}

export interface InitialPlan {
  strategy: string;
  allocationSketch: string;
}

export interface GameState {
  version: 1;
  phase: Phase;
  currentWeek: number;
  deadline: number;
  tasks: Record<TaskId, TaskProgress>;
  history: WeekRecord[];
  recoveries: RecoveryRecord[];
  pendingRecoveries: PendingRecovery[];
  initialPlan: InitialPlan;
  reflections: [string, string, string];
  rulesCheckComplete: boolean;
  lastUpdate?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
