import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { commitWeek, createInitialState, enterDebrief } from "../../src/domain/engine";
import { playFixture } from "../fixtures/fullGames";

test("welcome and briefing have no automatically detectable WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Put the festival on track." })).toBeVisible();
  await page.screenshot({ path: "test-results/welcome-desktop.png", fullPage: true });
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("button", { name: "Begin new simulation" }).click();
  await expect(page.getByRole("heading", { name: "Know the operating rules" })).toBeVisible();
  await expect(page.getByText(/organizing a university music concert/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to navigate the simulation" })).toBeVisible();
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("keyboard flow reaches Week 1 and restart requires confirmation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin new simulation" }).click();
  await page.getByLabel("Which tasks are available in Week 1?").selectOption({ label: "A, C, and D" });
  await page.getByLabel("If C is completed this week, when can B first receive workers?").selectOption({ label: "Next week" });
  await page.getByLabel("What are the assignment limits?").selectOption({ label: "2 per task; 5 total" });
  await page.getByRole("button", { name: "Check my understanding" }).click();
  await expect(page.getByText("3 of 3 correct.")).toBeVisible();
  await expect(page.locator(".answer-correct")).toHaveCount(3);
  await page.getByRole("button", { name: "Acknowledge results and begin Week 1" }).click();
  const weekOneHeading = page.getByRole("heading", { name: "Week 1 allocation" });
  await expect(weekOneHeading).toBeFocused();
  expect(await weekOneHeading.evaluate((element) => element.getBoundingClientRect().top < 220)).toBe(true);
  await expect(page.getByRole("button", { name: "Task-list view" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: "test-results/week-1-desktop.png", fullPage: true });

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByRole("heading", { name: "Week 1 allocation" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByRole("heading", { name: "Put the festival on track." })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("rock-n-bands-state-v1"))).toBeNull();
});

test("all weekly actions and dialogs operate from the keyboard", async ({ page }) => {
  await page.goto("/");
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.action === "begin")) break;
  }
  expect(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.action)).toBe("begin");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Know the operating rules" })).toBeVisible();

  for (const select of [
    page.getByLabel("Which tasks are available in Week 1?"),
    page.getByLabel("If C is completed this week, when can B first receive workers?"),
    page.getByLabel("What are the assignment limits?"),
  ]) {
    await select.focus(); await page.keyboard.press("ArrowDown");
  }
  await page.getByRole("button", { name: "Check my understanding" }).focus(); await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Acknowledge results and begin Week 1" }).focus(); await page.keyboard.press("Enter");

  await page.getByRole("radio", { name: "2", exact: true }).first().focus(); await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Review week" }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Review Week 1" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Review Week 1" })).not.toBeVisible();
});

test("network allocation controls remain open and focused after worker selections", async ({ page }) => {
  const state = createInitialState(); state.phase = "playing";
  await page.goto("/");
  await page.evaluate((saved) => localStorage.setItem("rock-n-bands-state-v1", saved), JSON.stringify(state));
  await page.reload(); await page.getByRole("button", { name: /Resume saved simulation at Week 1/ }).click();
  await page.getByRole("button", { name: "Network view" }).click();
  const controls = page.locator("details.task-controls");
  await expect(controls).not.toHaveAttribute("open", "");
  await page.getByText("Open allocation controls", { exact: true }).click();
  await expect(controls).toHaveAttribute("open", "");
  const taskA = page.getByRole("radio", { name: "1", exact: true }).first();
  await taskA.click();
  await expect(controls).toHaveAttribute("open", "");
  await expect(taskA).toBeFocused();
  await expect(page.getByText("1 assigned · 4 remaining")).toBeVisible();
  await page.screenshot({ path: "test-results/network-allocation-controls.png", fullPage: true });
});

test("reflows at 320 CSS pixels and at 200 percent zoom without page-level horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.screenshot({ path: "test-results/welcome-320.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 640, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await expect(page.getByRole("button", { name: "Begin new simulation" })).toBeVisible();
});

test("completed fixture resumes into an accessible debrief with all twelve tasks", async ({ page }) => {
  const state = enterDebrief(playFixture(9));
  await page.goto("/");
  await page.evaluate((saved) => localStorage.setItem("rock-n-bands-state-v1", saved), JSON.stringify(state));
  await page.reload();
  await page.getByRole("button", { name: /Resume saved simulation at debrief/ }).click();
  await expect(page.getByRole("heading", { name: "Project complete" })).toBeVisible();
  await expect(page.getByText("D–F–I", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your completed network" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Correct/reference network" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Your completed project network/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Reference on-time project network/ })).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(0);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "test-results/debrief-desktop.png", fullPage: true });
});

test("knowledge check identifies incorrect answers and supplies every correct answer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Begin new simulation" }).click();
  await page.getByLabel("Which tasks are available in Week 1?").selectOption({ label: "All tasks" });
  await page.getByLabel("If C is completed this week, when can B first receive workers?").selectOption({ label: "Immediately" });
  await page.getByLabel("What are the assignment limits?").selectOption({ label: "5 per task; no weekly limit" });
  await page.getByRole("button", { name: "Check my understanding" }).click();
  await expect(page.getByText("0 of 3 correct.")).toBeVisible();
  await expect(page.locator(".answer-incorrect")).toHaveCount(3);
  await expect(page.getByText("Correct answer:")).toHaveCount(3);
  await expect(page.getByText("A, C, and D", { exact: true })).toBeVisible();
  await expect(page.getByText("Next week", { exact: true })).toBeVisible();
  await expect(page.getByText("2 per task; 5 total", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Acknowledge results and begin Week 1" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "test-results/knowledge-check-feedback.png", fullPage: true });
});

test("a sixth worker is rejected immediately with specific correction guidance", async ({ page }) => {
  const state = createInitialState(); state.phase = "playing";
  await page.goto("/");
  await page.evaluate((saved) => localStorage.setItem("rock-n-bands-state-v1", saved), JSON.stringify(state));
  await page.reload(); await page.getByRole("button", { name: /Resume saved simulation at Week 1/ }).click();
  await page.getByRole("button", { name: "Task-list view" }).click();
  for (let index = 0; index < 3; index += 1) await page.getByRole("radio", { name: "2", exact: true }).nth(index).click();
  const limitDialog = page.getByRole("alertdialog", { name: "Worker limit reached" });
  await expect(limitDialog).toBeVisible();
  await expect(limitDialog).toContainText("weekly maximum is 5");
  await limitDialog.getByRole("button", { name: "Return to allocations" }).click();
  await expect(page.getByText("Allocation not changed")).toHaveCount(0);
  await expect(page.getByText("4 assigned · 1 remaining")).toBeVisible();
});

test("extra charges are identified with text and high-emphasis styling", async ({ page }) => {
  const state = createInitialState(); state.phase = "playing";
  await page.goto("/");
  await page.evaluate((saved) => localStorage.setItem("rock-n-bands-state-v1", saved), JSON.stringify(state));
  await page.reload(); await page.getByRole("button", { name: /Resume saved simulation at Week 1/ }).click();
  await page.getByRole("radio", { name: "2", exact: true }).nth(0).click();
  await page.getByRole("radio", { name: "2", exact: true }).nth(1).click();
  await page.getByRole("radio", { name: "1", exact: true }).nth(2).click();
  const preview = page.locator("#cost-preview");
  await expect(preview.locator(".charge-active")).toHaveCount(2);
  await expect(preview.getByText("Extra charge")).toHaveCount(2);
  await expect(page.locator(".status-extra-charge")).toContainText("Includes extra charges");
});

test("each project change requires acknowledgment before focus returns to the new week", async ({ page }) => {
  const state = createInitialState(); state.phase = "playing";
  await page.goto("/");
  await page.evaluate((saved) => localStorage.setItem("rock-n-bands-state-v1", saved), JSON.stringify(state));
  await page.reload(); await page.getByRole("button", { name: /Resume saved simulation at Week 1/ }).click();
  await page.getByRole("button", { name: "Review week" }).click();
  await page.getByRole("button", { name: "Commit Week" }).click();
  const updateDialog = page.getByRole("alertdialog", { name: "Security screening expands" });
  await expect(updateDialog).toBeVisible();
  await expect(updateDialog).toContainText("Task D now requires 4 worker-weeks instead of 3");
  await page.keyboard.press("Escape");
  await expect(updateDialog).toBeVisible();
  await updateDialog.getByRole("button", { name: "Acknowledge project update" }).click();
  const heading = page.getByRole("heading", { name: "Week 2 allocation" });
  await expect(heading).toBeFocused();
  expect(await heading.evaluate((element) => element.getBoundingClientRect().top < 220)).toBe(true);
  await expect(page.getByRole("heading", { name: "Project update" })).toHaveCount(0);
});

test("the revised Week 9 deadline requires acknowledgment and remains prominent", async ({ page }) => {
  let state = createInitialState(); state.phase = "playing";
  for (let week = 0; week < 5; week += 1) state = commitWeek(state, {});
  await page.goto("/");
  await page.evaluate((saved) => localStorage.setItem("rock-n-bands-state-v1", saved), JSON.stringify(state));
  await page.reload(); await page.getByRole("button", { name: /Resume saved simulation at Week 6/ }).click();
  const deadlineDialog = page.getByRole("alertdialog", { name: "Deadline moved forward to Week 9" });
  await expect(deadlineDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(deadlineDialog).toBeVisible();
  await deadlineDialog.getByRole("button", { name: "I understand the new deadline" }).click();
  await expect(page.getByRole("heading", { name: "Week 6 allocation" })).toBeFocused();
  await expect(page.locator(".deadline-alert")).toContainText("Week 9");
  await expect(page.locator(".deadline-alert")).toContainText("Revised deadline");
  await expect(page.getByRole("heading", { name: "Project update" })).toHaveCount(0);
});
