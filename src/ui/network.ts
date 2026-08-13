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

export function networkDiagram(state: GameState): string {
  const lines = EDGES.map(([from, to]) => {
    const [x1, y1] = POSITIONS[from];
    const [x2, y2] = POSITIONS[to];
    return `<line x1="${x1 + 42}" y1="${y1}" x2="${x2 - 42}" y2="${y2}" marker-end="url(#arrow)" />`;
  }).join("");
  const nodes = TASK_IDS.map((id) => {
    const [x, y] = POSITIONS[id];
    const status = taskStatus(state, id);
    const progress = state.tasks[id];
    return `<g class="network-node status-${status}" transform="translate(${x} ${y})" role="listitem" aria-label="Task ${id}, ${status}, ${progress.completed} of ${progress.required} worker-weeks complete">
      <rect x="-40" y="-27" width="80" height="54" rx="12" />
      <text x="0" y="-4" text-anchor="middle" class="network-letter">${id}</text>
      <text x="0" y="16" text-anchor="middle" class="network-progress">${progress.completed}/${progress.required}</text>
    </g>`;
  }).join("");
  return `<figure class="network-figure">
    <svg class="network-svg" viewBox="0 0 760 470" role="img" aria-labelledby="network-title network-desc">
      <title id="network-title">Rock'n Bands task network</title>
      <desc id="network-desc">A dependency network for Tasks A through L. The adjacent task table provides the complete equivalent text description.</desc>
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
      <g class="network-edges">${lines}</g>
      <g role="list">${nodes}</g>
    </svg>
    <figcaption>Arrows show immediate-predecessor relationships. Each node reports completed/required worker-weeks.</figcaption>
  </figure>`;
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
