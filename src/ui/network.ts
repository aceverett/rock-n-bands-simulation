import { TASK_BY_ID } from "../domain/config";
import { taskStatus } from "../domain/engine";
import { TASK_IDS, type GameState, type TaskId } from "../domain/types";

const POSITIONS: Record<TaskId, [number, number]> = {
  A: [120, 70], C: [120, 210], D: [120, 350],
  E: [300, 70], B: [300, 180], H: [300, 280], F: [300, 390],
  G: [480, 45], J: [500, 190], I: [500, 310], L: [480, 410],
  K: [660, 80],
};

const EDGES: Array<[TaskId, TaskId]> = [
  ["A", "E"], ["C", "B"], ["C", "H"], ["D", "H"], ["D", "F"],
  ["E", "G"], ["E", "J"], ["B", "J"], ["H", "I"], ["H", "J"],
  ["F", "I"], ["F", "L"], ["G", "K"],
];

const REFERENCE_COMPLETION_WEEK: Record<TaskId, number> = {
  A: 2, B: 3, C: 1, D: 2, E: 3, F: 5, G: 4, H: 4, I: 9, J: 8, K: 7, L: 8,
};

const CRITICAL_PATH = new Set<TaskId>(["D", "F", "I"]);

type NetworkMode = "progress" | "student-completion" | "reference-completion";

function renderNetwork(state: GameState, mode: NetworkMode, idPrefix: string): string {
  const lines = EDGES.map(([from, to]) => {
    const [x1, y1] = POSITIONS[from];
    const [x2, y2] = POSITIONS[to];
    return `<line x1="${x1 + 42}" y1="${y1}" x2="${x2 - 42}" y2="${y2}" marker-end="url(#${idPrefix}-arrow)" />`;
  }).join("");
  const nodes = TASK_IDS.map((id) => {
    const [x, y] = POSITIONS[id];
    const status = taskStatus(state, id);
    const progress = state.tasks[id];
    const completionWeek = mode === "reference-completion" ? REFERENCE_COMPLETION_WEEK[id] : progress.completedWeek;
    const nodeClass = mode === "reference-completion" ? (CRITICAL_PATH.has(id) ? "reference-critical" : "reference-standard") : `status-${status}`;
    const nodeValue = mode === "progress" ? `${progress.completed}/${progress.required}` : `Done W${completionWeek ?? "—"}`;
    const ariaLabel = mode === "progress"
      ? `Task ${id}, ${status}, ${progress.completed} of ${progress.required} worker-weeks complete`
      : `Task ${id}, completed in Week ${completionWeek ?? "not recorded"}, ${progress.required} required worker-weeks, immediate predecessors ${TASK_BY_ID[id].predecessors.join(", ") || "none"}${mode === "reference-completion" && CRITICAL_PATH.has(id) ? ", reference critical path" : ""}`;
    return `<g class="network-node ${nodeClass}" transform="translate(${x} ${y})" role="listitem" aria-label="${ariaLabel}">
      <rect x="-40" y="-27" width="80" height="54" rx="12" />
      <text x="0" y="-4" text-anchor="middle" class="network-letter">${id}</text>
      <text x="0" y="16" text-anchor="middle" class="network-progress">${nodeValue}</text>
    </g>`;
  }).join("");
  const title = mode === "student-completion" ? "Your completed project network" : mode === "reference-completion" ? "Reference on-time project network" : "Rock'n Bands task network";
  const description = mode === "student-completion"
    ? "The authoritative dependency network labeled with the week in which each task was completed in this attempt."
    : mode === "reference-completion"
      ? "The authoritative dependency network labeled with completion weeks from a validated Week 9 reference solution. Tasks D, F, and I form the initial critical path."
      : "A dependency network for Tasks A through L. The adjacent task table provides the complete equivalent text description.";
  const caption = mode === "student-completion"
    ? "Each node shows when your allocations completed that task. Your week-by-week worker choices appear in the history table below."
    : mode === "reference-completion"
      ? "Each node shows completion timing from one validated Week 9 solution. D–F–I is identified by both a distinct outline and this text label as the initial critical path."
      : "Arrows show immediate-predecessor relationships. Each node reports completed/required worker-weeks.";
  return `<figure class="network-figure">
    <svg class="network-svg" viewBox="0 0 760 470" role="img" aria-labelledby="${idPrefix}-title ${idPrefix}-desc">
      <title id="${idPrefix}-title">${title}</title>
      <desc id="${idPrefix}-desc">${description}</desc>
      <defs><marker id="${idPrefix}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
      <g class="network-edges">${lines}</g>
      <g role="list">${nodes}</g>
    </svg>
    <figcaption>${caption}</figcaption>
  </figure>`;
}

export function networkDiagram(state: GameState): string {
  return renderNetwork(state, "progress", "network");
}

export function completedNetworkComparison(state: GameState): string {
  return `<section class="network-comparison" aria-labelledby="network-comparison-title">
    <h2 id="network-comparison-title">Compare the completed networks</h2>
    <p>The first diagram reflects the completion timing produced by your worker allocations. The second shows one validated on-time reference solution using the correct task dependencies. It is a comparison model, not the only defensible allocation strategy.</p>
    <article aria-labelledby="student-network-heading"><h3 id="student-network-heading">Your completed network</h3>${renderNetwork(state, "student-completion", "student-network")}</article>
    <article aria-labelledby="reference-network-heading"><h3 id="reference-network-heading">Correct/reference network</h3>${renderNetwork(state, "reference-completion", "reference-network")}</article>
  </section>`;
}

export function dependencyTable(state: GameState): string {
  return `<div class="table-wrap"><table>
    <caption>Complete task and dependency list</caption>
    <thead><tr><th scope="col">Task</th><th scope="col">Description</th><th scope="col">Progress</th><th scope="col">Immediate predecessors</th><th scope="col">Status</th></tr></thead>
    <tbody>${TASK_IDS.map((id) => {
      const progress = state.tasks[id];
      return `<tr><th scope="row">${id}</th><td>${TASK_BY_ID[id].description}</td><td>${progress.completed} of ${progress.required}</td><td>${TASK_BY_ID[id].predecessors.length ? TASK_BY_ID[id].predecessors.join(", ") : "None"}</td><td>${taskStatus(state, id).replace("-", " ")}</td></tr>`;
    }).join("")}</tbody>
  </table></div>`;
}
