import { TASK_BY_ID } from "../domain/config";
import {
  acknowledgeProjectEvent,
  beginBriefing,
  calculateCosts,
  commitWeek,
  completeRulesCheck,
  createInitialState,
  enterDebrief,
  getEligibleTasks,
  isComplete,
  lockedReason,
  resolveCapacityRecovery,
  taskStatus,
  totalCosts,
  validateAllocation,
} from "../domain/engine";
import { TASK_IDS, type Allocation, type GameState, type TaskId } from "../domain/types";
import type { LmsAdapter } from "../lms/scorm";
import { clearState, saveState } from "../persistence/storage";
import { dependencyTable, networkDiagram } from "./network";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

export class RockNBandsApp {
  private state: GameState = createInitialState();
  private resumeCandidate: GameState | null;
  private allocation: Allocation = {};
  private projectView: "network" | "list" = "list";
  private rulesFeedback = false;
  private allocationError = "";
  private limitReturnFocus: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    resumeCandidate: GameState | null,
    private readonly lms: LmsAdapter,
  ) {
    this.resumeCandidate = resumeCandidate;
    this.root.addEventListener("click", (event) => this.onClick(event));
    this.root.addEventListener("change", (event) => this.onChange(event));
    this.root.addEventListener("submit", (event) => this.onSubmit(event));
    this.root.addEventListener("cancel", (event) => {
      if (["deadline-dialog", "event-dialog"].includes((event.target as HTMLDialogElement).id)) event.preventDefault();
    }, true);
    window.addEventListener("beforeunload", () => this.lms.terminate());
    this.render();
    queueMicrotask(() => this.showPendingProjectUpdate());
  }

  private persist(commitLms = false): void {
    saveState(this.state);
    if (commitLms) this.lms.save(this.state);
  }

  private render(): void {
    this.root.innerHTML = `<header class="site-header">
      <div class="header-inner"><a class="brand" href="#main-content" aria-label="Rock'n Bands home"><span aria-hidden="true">R/B</span><span>Rock'n Bands</span></a>
      <button class="button button-quiet" type="button" data-action="help">Accessibility & help</button></div>
    </header>
    <main id="main-content" tabindex="-1">${this.view()}</main>
    <footer><p>Designed by Ken Klassen, Brock University, and Keith Willoughby, Bucknell University.</p>
      <p>This game was developed for educational purposes. It may be used, disseminated, and modified for educational purposes, but it may not be sold. All uses must acknowledge the original developers.</p></footer>
    ${this.helpDialog()}`;
  }

  private view(): string {
    switch (this.state.phase) {
      case "welcome": return this.welcomeView();
      case "briefing": return this.briefingView();
      case "playing": return this.gameView();
      case "complete": return this.completionGateView();
      case "debrief": return this.debriefView();
    }
  }

  private welcomeView(): string {
    return `<section class="hero" aria-labelledby="welcome-title">
      <p class="eyebrow">Project-management simulation</p>
      <h1 id="welcome-title">Put the festival on track.</h1>
      <p class="hero-lead">You manage Planners 'R Us, the company responsible for delivering a university music festival. Allocate scarce workers, absorb project changes, and finish all twelve activities as economically as you can.</p>
      <div class="hero-facts" aria-label="Activity facts"><span><strong>30–40</strong> minutes</span><span><strong>12</strong> connected tasks</span><span><strong>No</strong> time limit</span></div>
      <div class="button-row">
        <button class="button button-primary" type="button" data-action="begin">Begin new simulation</button>
        ${this.resumeCandidate ? `<button class="button button-secondary" type="button" data-action="resume">Resume saved simulation at ${escapeHtml(this.resumeCandidate.phase === "playing" ? `Week ${this.resumeCandidate.currentWeek}` : this.resumeCandidate.phase)}</button>` : ""}
      </div>
      <aside class="callout"><h2>Autosave and resume</h2><p>Your progress and every committed week are saved on this device. In Canvas SCORM mode, the same state is also saved to the LMS after each week and capacity recovery.</p></aside>
      <section class="objectives"><h2>What you will practice</h2><ul>
        <li>Analyze dependencies and schedule-sensitive paths.</li><li>Allocate constrained workers among eligible activities.</li><li>Evaluate crashing, labor, premium, and late costs.</li><li>Revise decisions as durations and the deadline change.</li><li>Explain why whole paths matter more than isolated activities.</li>
      </ul></section>
    </section>`;
  }

  private briefingView(): string {
    return `<section class="page-section" aria-labelledby="briefing-title">
      <p class="eyebrow">Project briefing</p><h1 id="briefing-title">Know the operating rules</h1>
      <div class="briefing-grid"><article><h2>Your objective</h2><p>Complete Tasks A–L as economically as possible. The initial contractual deadline is the end of Week 10. Project conditions may change; updates are revealed only after the affected week's decisions are committed.</p></article>
      <article><h2>Workers and cost</h2><ul><li>Use 0–5 workers per week; four are regular.</li><li>Assign no more than 2 workers to one task.</li><li>Each worker costs $200. The fifth adds a $100 premium.</li><li>Two workers on one task add $100 coordination cost for that task and week.</li><li>After the revised deadline, each late round costs $2,000.</li></ul></article></div>
      <aside class="callout"><h2>Weekly timing matters</h2><p>A task is eligible only when every immediate predecessor was complete by the end of the previous week. Committing applies all work simultaneously; a task completed this week never unlocks a successor until next week.</p></aside>
      ${this.viewToggle()}
      ${this.projectView === "network" ? networkDiagram(this.state) : dependencyTable(this.state)}
      ${this.projectView === "network" ? `<details><summary>Equivalent text-based dependency table</summary>${dependencyTable(this.state)}</details>` : ""}
      <section class="rules-check" aria-labelledby="check-title"><h2 id="check-title">Quick rules check</h2>
      ${this.rulesFeedback ? `<div class="feedback" tabindex="-1" id="rules-feedback"><h3>Review</h3><p><strong>Week 1:</strong> A, C, and D are available. <strong>Unlocking:</strong> successors wait until the next week. <strong>Limits:</strong> 2 workers per task and 5 total.</p><button class="button button-primary" type="button" data-action="start-week-one">Begin Week 1</button></div>` : `<form id="rules-form">
        <label>Which tasks are available in Week 1?<select name="eligible" required><option value="">Choose</option><option>A, C, and D</option><option>A, B, and C</option><option>All tasks</option></select></label>
        <label>If C is completed this week, when can B first receive workers?<select name="unlock" required><option value="">Choose</option><option>Immediately</option><option>Next week</option></select></label>
        <label>What are the assignment limits?<select name="limits" required><option value="">Choose</option><option>2 per task; 5 total</option><option>5 per task; no weekly limit</option></select></label>
        <button class="button button-secondary" type="submit">Check my understanding</button>
      </form>`}</section>
    </section>`;
  }

  private statusBar(): string {
    const assigned = TASK_IDS.reduce((sum, id) => sum + (this.allocation[id] ?? 0), 0);
    const costs = calculateCosts(this.allocation, this.state.currentWeek, this.state.deadline);
    const complete = TASK_IDS.filter((id) => isComplete(this.state, id)).length;
    const extraCharges = costs.fifthWorkerPremium + costs.crashing + costs.latePenalty;
    const revisedDeadline = this.state.deadline === 9;
    return `<section class="status-bar" aria-label="Project status">
      <div><span>Current week</span><strong>${this.state.currentWeek}</strong></div><div class="${revisedDeadline ? "deadline-alert" : ""}"><span>Deadline</span><strong>Week ${this.state.deadline}</strong>${revisedDeadline ? `<small><span aria-hidden="true">!</span> Revised deadline</small>` : ""}</div>
      <div><span>Workers</span><strong>${assigned} assigned · ${5 - assigned} remaining</strong></div><div class="${extraCharges > 0 ? "status-extra-charge" : ""}"><span>Projected week</span><strong>${money(costs.total)}</strong>${extraCharges > 0 ? `<small><span aria-hidden="true">!</span> Includes extra charges</small>` : ""}</div>
      <div><span>Cumulative</span><strong>${money(totalCosts(this.state).total)}</strong></div><div><span>Complete</span><strong>${complete} / 12</strong></div>
    </section>`;
  }

  private gameView(): string {
    const last = this.state.history.at(-1);
    const recentRecovery = last?.event ? this.state.recoveries.find((item) => item.eventAfterWeek === last.event?.afterWeek) : undefined;
    return `<section class="dashboard" aria-labelledby="dashboard-title">
      <div class="dashboard-heading"><div><p class="eyebrow">Festival operations</p><h1 id="dashboard-title" tabindex="-1">Week ${this.state.currentWeek} allocation</h1></div><button class="button button-quiet" type="button" data-action="restart">Restart</button></div>
      ${this.statusBar()}
      ${this.state.pendingRecoveries.length ? this.recoveryView() : `<div class="dashboard-layout"><section aria-labelledby="tasks-title"><div class="section-heading"><div><h2 id="tasks-title">Project activities</h2><p>Choose 0, 1, or 2 workers for each eligible task.</p></div>${this.viewToggle()}</div>
        ${this.projectView === "network" ? networkDiagram(this.state) : this.taskCards()}
        ${this.projectView === "network" ? `<details class="task-controls"><summary><span class="task-controls-kicker">Required action</span><strong>Open allocation controls</strong><span>Select workers for eligible tasks before reviewing the week.</span></summary>${this.taskCards()}</details>` : ""}
      </section><aside class="commit-panel" aria-labelledby="cost-title"><div id="cost-preview">${this.costPreview()}</div><button class="button button-primary button-block" type="button" data-action="review">Review week</button><p class="fine-print">Nothing is processed until you review and commit the entire week.</p></aside></div>`}
      ${this.logView()}
      <dialog id="review-dialog" aria-labelledby="review-title"><div class="dialog-inner"><h2 id="review-title">Review Week ${this.state.currentWeek}</h2><div id="review-content"></div><div class="button-row"><button class="button button-primary" type="button" data-action="commit">Commit Week</button><button class="button button-secondary" type="button" data-action="close-review">Return to allocations</button></div></div></dialog>
      <dialog id="limit-dialog" role="alertdialog" aria-labelledby="limit-dialog-title" aria-describedby="limit-dialog-message"><div class="dialog-inner warning-dialog"><p class="dialog-alert-label"><span aria-hidden="true">!</span> Action not allowed</p><h2 id="limit-dialog-title">Worker limit reached</h2><p id="limit-dialog-message"></p><button class="button button-primary" type="button" data-action="close-limit">Return to allocations</button></div></dialog>
      ${last?.event && !last.event.deadline ? `<dialog id="event-dialog" role="alertdialog" aria-labelledby="event-dialog-title" aria-describedby="event-dialog-message"><div class="dialog-inner project-event-dialog"><p class="dialog-alert-label"><span aria-hidden="true">!</span> Project conditions changed</p><h2 id="event-dialog-title">${escapeHtml(last.event.title)}</h2><p id="event-dialog-message">${escapeHtml(last.event.message)}</p>${recentRecovery ? `<p class="automatic-adjustment"><strong>Automatic cost correction:</strong> ${escapeHtml(recentRecovery.message)} The historical cost was recalculated because no valid reassignment target was available.</p>` : ""}<button class="button button-primary" type="button" data-action="acknowledge-event">Acknowledge project update</button></div></dialog>` : ""}
      <dialog id="deadline-dialog" role="alertdialog" aria-labelledby="deadline-dialog-title" aria-describedby="deadline-dialog-message"><div class="dialog-inner deadline-dialog-inner"><p class="dialog-alert-label"><span aria-hidden="true">!</span> Schedule warning</p><h2 id="deadline-dialog-title">Deadline moved forward to Week 9</h2><p id="deadline-dialog-message">The contractual deadline is now the end of Week 9. Any week committed after Week 9 incurs a $2,000 late penalty.</p><p>You must acknowledge this schedule change before continuing.</p><button class="button button-primary" type="button" data-action="acknowledge-deadline">I understand the new deadline</button></div></dialog>
    </section>`;
  }

  private taskCards(): string {
    const eligible = new Set(getEligibleTasks(this.state));
    return `<div class="task-grid">${TASK_IDS.map((id) => {
      const definition = TASK_BY_ID[id];
      const progress = this.state.tasks[id];
      const status = taskStatus(this.state, id);
      const remaining = Math.max(0, progress.required - progress.completed);
      const enabled = eligible.has(id);
      return `<article class="task-card status-${status}" aria-labelledby="task-${id}-title">
        <div class="task-card-top"><span class="status-icon" aria-hidden="true">${status === "complete" ? "✓" : status === "locked" ? "🔒" : status === "in-progress" ? "◐" : "●"}</span><span class="status-label">${status.replace("-", " ")}</span></div>
        <h3 id="task-${id}-title"><span>${id}</span>${escapeHtml(definition.description)}</h3>
        <dl><div><dt>Required</dt><dd>${progress.required}</dd></div><div><dt>Completed</dt><dd>${progress.completed}</dd></div><div><dt>Remaining</dt><dd>${remaining}</dd></div><div><dt>Predecessors</dt><dd>${definition.predecessors.length ? definition.predecessors.join(", ") : "None"}</dd></div></dl>
        ${enabled ? `<fieldset class="allocation-control" aria-describedby="task-${id}-help"><legend>Workers for Task ${id}</legend><div class="segmented">${[0, 1, 2].filter((workers) => workers <= remaining).map((workers) => `<label><input type="radio" name="task-${id}" value="${workers}" ${Number(this.allocation[id] ?? 0) === workers ? "checked" : ""}><span>${workers}</span></label>`).join("")}</div><p id="task-${id}-help">Assign up to ${Math.min(2, remaining)} this week.</p></fieldset>` : `<p class="locked-reason">${escapeHtml(lockedReason(this.state, id))}</p>`}
      </article>`;
    }).join("")}</div>`;
  }

  private costPreview(): string {
    const costs = calculateCosts(this.allocation, this.state.currentWeek, this.state.deadline);
    return `<h2 id="cost-title">Projected cost</h2><dl class="cost-list"><div><dt>Regular labor</dt><dd>${money(costs.regularLabor)}</dd></div>${this.chargeCostRow("Fifth-worker premium", costs.fifthWorkerPremium)}${this.chargeCostRow("Coordination/crashing", costs.crashing)}${this.chargeCostRow("Late penalty", costs.latePenalty)}<div class="cost-total"><dt>Total this week</dt><dd>${money(costs.total)}</dd></div></dl>`;
  }

  private chargeCostRow(label: string, value: number): string {
    return `<div class="${value > 0 ? "charge-active" : ""}"><dt>${value > 0 ? `<span class="charge-icon" aria-hidden="true">!</span>` : ""}${label}${value > 0 ? `<span class="charge-badge">Extra charge</span>` : ""}</dt><dd>${money(value)}</dd></div>`;
  }

  private recoveryView(): string {
    const recovery = this.state.pendingRecoveries[0]!;
    return `<section class="recovery" aria-labelledby="recovery-title"><p class="eyebrow">Controlled historical adjustment</p><h2 id="recovery-title" tabindex="-1">Capacity Recovery</h2>
      <p>A duration reduction made the first unnecessary worker-week visible on Task ${recovery.sourceTask} in historical Week ${recovery.historicalWeek}. Reassign that one unit only to a task that was eligible at the start of that week, or remove its cost by leaving it unused.</p>
      <form id="recovery-form"><fieldset><legend>Recovered worker-week decision</legend>
        ${recovery.eligibleTargets.map((id) => `<label class="radio-card"><input type="radio" name="target" value="${id}"><span><strong>Task ${id}</strong> — ${escapeHtml(TASK_BY_ID[id].description)}</span></label>`).join("")}
        <label class="radio-card"><input type="radio" name="target" value="unused" required><span><strong>Leave unused</strong> — remove labor and associated premium/crashing cost where applicable.</span></label>
      </fieldset><button class="button button-primary" type="submit">Apply capacity recovery</button></form></section>`;
  }

  private logView(): string {
    if (!this.state.history.length) return "";
    return `<details class="project-log"><summary>Project log (${this.state.history.length} week${this.state.history.length === 1 ? "" : "s"})</summary><ol>${this.state.history.map((record) => `<li><h3>Week ${record.week}</h3><p><strong>Allocations:</strong> ${this.allocationText(record.allocations)}</p><p><strong>Completed:</strong> ${record.completedTasks.join(", ") || "None"}</p>${record.event ? `<p><strong>Event:</strong> ${escapeHtml(record.event.message)}</p>` : ""}<p><strong>Cost:</strong> ${money(record.costs.total)}</p></li>`).join("")}${this.state.recoveries.map((item) => `<li><h3>Capacity recovery</h3><p>${escapeHtml(item.message)} Cost change: ${money(item.costDelta)}.</p></li>`).join("")}</ol></details>`;
  }

  private completionGateView(): string {
    const completionWeek = this.state.history.at(-1)?.week ?? 0;
    return `<section class="completion-gate narrow" aria-labelledby="complete-title"><p class="eyebrow">All activities complete</p><h1 id="complete-title" tabindex="-1">The festival project finished in Week ${completionWeek}.</h1><p>${completionWeek <= this.state.deadline ? "You met the revised deadline." : `You finished ${completionWeek - this.state.deadline} week${completionWeek - this.state.deadline === 1 ? "" : "s"} after the revised deadline.`} Open the debrief to review the path implications, full cost, and your decisions.</p><button class="button button-primary" type="button" data-action="debrief">Open results and debrief</button></section>`;
  }

  private debriefView(): string {
    const totals = totalCosts(this.state);
    const completionWeek = this.state.history.at(-1)?.week ?? 0;
    const referrer = document.referrer;
    return `<section class="results" aria-labelledby="results-title"><p class="eyebrow">Results and debrief</p><h1 id="results-title">Project complete</h1>
      <section class="result-cards" aria-label="Project results"><div><span>Completion</span><strong>Week ${completionWeek}</strong></div><div><span>Schedule</span><strong>${completionWeek <= this.state.deadline ? "On time" : "Late"}</strong></div><div><span>Total cost</span><strong>${money(totals.total)}</strong></div></section>
      <section class="results-grid"><article><h2>Cost breakdown</h2><dl class="cost-list"><div><dt>Regular labor</dt><dd>${money(totals.regularLabor)}</dd></div>${this.chargeCostRow("Fifth-worker premiums", totals.fifthWorkerPremium)}${this.chargeCostRow("Crashing costs", totals.crashing)}${this.chargeCostRow("Late penalties", totals.latePenalty)}</dl></article>
      <article><h2>Decision summary</h2><dl class="cost-list"><div><dt>Weeks committed</dt><dd>${this.state.history.length}</dd></div><div><dt>Capacity recoveries</dt><dd>${this.state.recoveries.length}</dd></div><div><dt>Tasks completed</dt><dd>12 of 12</dd></div><div><dt>Final deadline</dt><dd>Week ${this.state.deadline}</dd></div></dl></article></section>
      <section class="debrief"><h2>What the network reveals</h2><p>The initial critical path was <strong>D–F–I</strong> at 12 uncompressed weeks. The deterministic changes increased that same path to 16 uncompressed weeks: D grew to 4, F to 5, and I to 7 worker-weeks.</p><p>That path deserved attention, but it was not the only schedule risk. Work on A–E–G–K, C–B–J, D–H–J, and D–F–L still controlled when downstream tasks could start. Balancing expected completion times across connected paths can therefore outperform reacting to whichever isolated task looks longest.</p><p>Using extra workers early can buy schedule flexibility, but it also adds fifth-worker and coordination costs. Waiting may save those costs in the short run while increasing exposure to $2,000 late rounds. Uncertainty makes an initial plan useful as a hypothesis—not a promise.</p></section>
      <section aria-labelledby="history-title"><h2 id="history-title">Week-by-week history</h2>${this.historyTable()}</section>
      <div class="button-row print-actions"><button class="button button-secondary" type="button" data-action="download">Download readable summary</button><button class="button button-secondary" type="button" data-action="print">Print results</button><button class="button button-quiet" type="button" data-action="restart">Restart simulation</button>${referrer ? `<a class="button button-primary" href="${escapeHtml(referrer)}" target="_top">Return to Canvas</a>` : ""}</div>
      ${!referrer ? `<p class="fine-print">No Canvas return address is available in this standalone session. Close this tab or use your browser's Back control.</p>` : ""}
    </section>`;
  }

  private historyTable(): string {
    return `<div class="table-wrap"><table><thead><tr><th scope="col">Week</th><th scope="col">Allocations</th><th scope="col">Completed</th><th scope="col">Project update</th><th scope="col">Cost</th></tr></thead><tbody>${this.state.history.map((record) => `<tr><th scope="row">${record.week}</th><td>${this.allocationText(record.allocations)}</td><td>${record.completedTasks.join(", ") || "None"}</td><td>${record.event ? escapeHtml(record.event.message) : "No scheduled change"}</td><td>${money(record.costs.total)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  private viewToggle(): string {
    return `<div class="view-toggle" role="group" aria-label="Project view"><button type="button" data-action="view-network" aria-pressed="${this.projectView === "network"}">Network view</button><button type="button" data-action="view-list" aria-pressed="${this.projectView === "list"}">Task-list view</button></div>`;
  }

  private allocationText(allocation: Allocation): string {
    const entries = TASK_IDS.filter((id) => (allocation[id] ?? 0) > 0).map((id) => `${id}: ${allocation[id]}`);
    return entries.join("; ") || "No workers used";
  }

  private helpDialog(): string {
    return `<dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-inner"><h2 id="help-title">Accessibility and help</h2><p>All actions work with keyboard, mouse, or touch. Use Tab to move, Space or Enter to activate, and Escape to close dialogs. Allocation uses standard radio buttons; drag-and-drop is not required.</p><h3>Task states</h3><ul class="legend"><li>● Available</li><li>◐ In progress</li><li>🔒 Locked</li><li>✓ Complete</li></ul><h3>Need to resume?</h3><p>Committed weeks are autosaved. Return to the opening screen to use Resume, or reopen the Canvas activity.</p><button class="button button-primary" type="button" data-action="close-help">Close help</button></div></dialog>`;
  }

  private onClick(event: Event): void {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "help") (this.root.querySelector("#help-dialog") as HTMLDialogElement).showModal();
    if (action === "close-help") (this.root.querySelector("#help-dialog") as HTMLDialogElement).close();
    if (action === "begin") this.beginNew();
    if (action === "resume" && this.resumeCandidate) { this.state = this.resumeCandidate; this.allocation = {}; this.render(); queueMicrotask(() => this.showPendingProjectUpdate()); }
    if (action === "briefing") { this.state.phase = "briefing"; this.render(); }
    if (action === "start-week-one") { this.state = completeRulesCheck(this.state); this.persist(true); this.allocation = {}; this.render(); }
    if (action === "view-network") { this.projectView = "network"; this.render(); }
    if (action === "view-list") { this.projectView = "list"; this.render(); }
    if (action === "review") this.openReview();
    if (action === "close-review") (this.root.querySelector("#review-dialog") as HTMLDialogElement).close();
    if (action === "close-limit") this.closeLimitDialog();
    if (action === "acknowledge-deadline" || action === "acknowledge-event") this.acknowledgeEvent();
    if (action === "commit") this.processCommit();
    if (action === "debrief") { this.state = enterDebrief(this.state); this.persist(true); this.lms.complete(this.state); this.render(); }
    if (action === "restart") this.restart();
    if (action === "print") window.print();
    if (action === "download") this.downloadSummary();
  }

  private onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.name.startsWith("task-")) {
      const id = input.name.slice(5) as TaskId;
      const previous = Number(this.allocation[id] ?? 0);
      const candidate = { ...this.allocation, [id]: Number(input.value) };
      if (candidate[id] === 0) delete candidate[id];
      const total = TASK_IDS.reduce((sum, taskId) => sum + (candidate[taskId] ?? 0), 0);
      if (total > 5) {
        this.allocationError = `That choice would assign ${total} workers. Reduce another task first; the weekly maximum is 5.`;
        input.checked = false;
        const previousInput = this.root.querySelector<HTMLInputElement>(`input[name="task-${id}"][value="${previous}"]`);
        if (previousInput) previousInput.checked = true;
        this.limitReturnFocus = input;
      } else {
        this.allocation = candidate;
        this.allocationError = "";
      }
      this.refreshAllocationSummary();
      if (total > 5) this.showLimitDialog();
    }
  }

  private refreshAllocationSummary(): void {
    const status = this.root.querySelector<HTMLElement>(".status-bar");
    if (status) status.outerHTML = this.statusBar();
    const costPreview = this.root.querySelector<HTMLElement>("#cost-preview");
    if (costPreview) costPreview.innerHTML = this.costPreview();
  }

  private onSubmit(event: SubmitEvent): void {
    const form = event.target as HTMLFormElement;
    event.preventDefault();
    if (form.id === "rules-form") { this.rulesFeedback = true; this.render(); queueMicrotask(() => (this.root.querySelector("#rules-feedback") as HTMLElement)?.focus()); }
    if (form.id === "recovery-form") {
      const value = String(new FormData(form).get("target") ?? "");
      if (!value) return;
      this.state = resolveCapacityRecovery(this.state, value === "unused" ? undefined : value as TaskId);
      this.persist(true); this.render();
      queueMicrotask(() => this.focusCurrentWeekHeading());
    }
  }

  private beginNew(): void {
    if (this.resumeCandidate && !window.confirm("A saved simulation exists. Start over and replace it?")) return;
    clearState(); this.state = beginBriefing(createInitialState()); this.resumeCandidate = null; this.allocation = {}; this.persist(true); this.render();
  }

  private openReview(): void {
    const validation = validateAllocation(this.state, this.allocation);
    if (!validation.valid) {
      const main = this.root.querySelector("#main-content")!;
      main.insertAdjacentHTML("afterbegin", `<section class="error-summary" role="alert" tabindex="-1"><h2>Fix these allocation issues</h2><ul>${validation.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></section>`);
      (main.querySelector(".error-summary") as HTMLElement).focus(); return;
    }
    const costs = calculateCosts(this.allocation, this.state.currentWeek, this.state.deadline);
    const content = this.root.querySelector("#review-content")!;
    content.innerHTML = `<p><strong>Assignments:</strong> ${this.allocationText(this.allocation)}</p><p><strong>Total workers:</strong> ${TASK_IDS.reduce((sum, id) => sum + (this.allocation[id] ?? 0), 0)}</p><dl class="cost-list"><div><dt>Regular labor</dt><dd>${money(costs.regularLabor)}</dd></div>${this.chargeCostRow("Fifth-worker premium", costs.fifthWorkerPremium)}${this.chargeCostRow("Crashing", costs.crashing)}${this.chargeCostRow("Late penalty", costs.latePenalty)}<div class="cost-total"><dt>Total</dt><dd>${money(costs.total)}</dd></div></dl>`;
    (this.root.querySelector("#review-dialog") as HTMLDialogElement).showModal();
  }

  private processCommit(): void {
    this.state = commitWeek(this.state, this.allocation);
    this.allocation = {};
    this.allocationError = "";
    this.persist(true);
    this.render();
    queueMicrotask(() => {
      if (!this.showPendingProjectUpdate()) this.focusCurrentWeekHeading();
    });
  }

  private showLimitDialog(): void {
    const dialog = this.root.querySelector<HTMLDialogElement>("#limit-dialog");
    const message = this.root.querySelector<HTMLElement>("#limit-dialog-message");
    if (!dialog || !message) return;
    message.textContent = this.allocationError;
    if (!dialog.open) dialog.showModal();
  }

  private closeLimitDialog(): void {
    this.root.querySelector<HTMLDialogElement>("#limit-dialog")?.close();
    this.limitReturnFocus?.focus();
    this.limitReturnFocus = null;
  }

  private showPendingProjectUpdate(): boolean {
    if (this.state.phase !== "playing") return false;
    const event = this.state.history.at(-1)?.event;
    if (!event || this.state.acknowledgedEventWeeks.includes(event.afterWeek)) return false;
    const dialog = this.root.querySelector<HTMLDialogElement>(event.deadline ? "#deadline-dialog" : "#event-dialog");
    if (!dialog) return false;
    if (!dialog.open) dialog.showModal();
    return true;
  }

  private acknowledgeEvent(): void {
    const event = this.state.history.at(-1)?.event;
    if (!event) return;
    this.state = acknowledgeProjectEvent(this.state, event.afterWeek);
    this.persist(true);
    this.root.querySelector<HTMLDialogElement>(event.deadline ? "#deadline-dialog" : "#event-dialog")?.close();
    const recoveryTitle = this.root.querySelector<HTMLElement>("#recovery-title");
    if (recoveryTitle) {
      recoveryTitle.scrollIntoView({ block: "start", behavior: "auto" });
      recoveryTitle.focus({ preventScroll: true });
    } else this.focusCurrentWeekHeading();
  }

  private focusCurrentWeekHeading(): void {
    const heading = this.root.querySelector<HTMLElement>("#dashboard-title, #complete-title");
    heading?.scrollIntoView({ block: "start", behavior: "auto" });
    heading?.focus({ preventScroll: true });
  }

  private restart(): void {
    if (!window.confirm("Restart the simulation? This clears the saved project and allocation history.")) return;
    clearState(); this.state = createInitialState(); this.resumeCandidate = null; this.allocation = {}; this.rulesFeedback = false; this.render();
  }

  private downloadSummary(): void {
    const totals = totalCosts(this.state);
    const text = ["ROCK'N BANDS — PROJECT RESULTS", "", `Completion week: ${this.state.history.at(-1)?.week ?? 0}`, `Deadline: Week ${this.state.deadline}`, `Total cost: ${money(totals.total)}`, `Regular labor: ${money(totals.regularLabor)}`, `Fifth-worker premiums: ${money(totals.fifthWorkerPremium)}`, `Crashing costs: ${money(totals.crashing)}`, `Late penalties: ${money(totals.latePenalty)}`, "", "WEEK-BY-WEEK HISTORY", ...this.state.history.map((record) => `Week ${record.week}: ${this.allocationText(record.allocations)}; completed ${record.completedTasks.join(", ") || "none"}; cost ${money(record.costs.total)}${record.event ? `; update: ${record.event.message}` : ""}`), "", "Designed by Ken Klassen, Brock University, and Keith Willoughby, Bucknell University.", "Educational use permitted; may not be sold; original developers must be acknowledged."].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "rock-n-bands-results.txt"; anchor.click(); URL.revokeObjectURL(url);
  }
}
