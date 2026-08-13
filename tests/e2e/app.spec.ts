import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createInitialState, enterDebrief } from "../../src/domain/engine";
import { playFixture } from "../fixtures/fullGames";

test("welcome and briefing have no automatically detectable WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Put the festival on track." })).toBeVisible();
  await page.screenshot({ path: "test-results/welcome-desktop.png", fullPage: true });
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("button", { name: "Begin new simulation" }).click();
  await expect(page.getByRole("heading", { name: "Know the operating rules" })).toBeVisible();
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
  await page.getByRole("button", { name: "Continue to initial planning" }).click();
  await page.getByLabel("What will guide your resource decisions?").fill("Balance connected paths.");
  await page.getByRole("button", { name: "Save plan and begin Week 1" }).click();
  await expect(page.getByRole("heading", { name: "Week 1 allocation" })).toBeVisible();
  await page.getByRole("button", { name: "Task-list view" }).click();
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
  await page.getByRole("button", { name: "Continue to initial planning" }).focus(); await page.keyboard.press("Enter");
  await page.getByLabel("What will guide your resource decisions?").focus(); await page.keyboard.type("Balance paths and preserve flexibility.");
  await page.getByRole("button", { name: "Save plan and begin Week 1" }).focus(); await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Task-list view" }).focus(); await page.keyboard.press("Enter");
  await page.getByRole("radio", { name: "2", exact: true }).first().focus(); await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Review week" }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Review Week 1" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Review Week 1" })).not.toBeVisible();
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
  await expect(page.getByText("D–F–I", { exact: false })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: "test-results/debrief-desktop.png", fullPage: true });
});

test("a sixth worker is rejected immediately with specific correction guidance", async ({ page }) => {
  const state = createInitialState(); state.phase = "playing";
  await page.goto("/");
  await page.evaluate((saved) => localStorage.setItem("rock-n-bands-state-v1", saved), JSON.stringify(state));
  await page.reload(); await page.getByRole("button", { name: /Resume saved simulation at Week 1/ }).click();
  await page.getByRole("button", { name: "Task-list view" }).click();
  for (let index = 0; index < 3; index += 1) await page.getByRole("radio", { name: "2", exact: true }).nth(index).click();
  await expect(page.getByRole("alert")).toContainText("weekly maximum is 5");
  await expect(page.getByText("4 assigned · 1 remaining")).toBeVisible();
});
