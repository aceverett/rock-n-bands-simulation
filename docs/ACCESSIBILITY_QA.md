# Manual Accessibility QA Checklist

Record tester, browser/assistive technology, date, result, and notes for each release.

## Keyboard and focus

- [ ] Use only Tab, Shift+Tab, Enter, Space, arrow keys, and Escape from Welcome through debrief.
- [ ] Verify the skip link moves focus to the main content.
- [ ] Confirm every focus indicator is clearly visible and never obscured.
- [ ] Open/close Help and Review dialogs; confirm focus enters the dialog, stays inside, returns to the trigger, and Escape closes it.
- [ ] Trigger an invalid allocation and confirm focus moves to the error summary.
- [ ] Commit a week and confirm focus moves to the project-update heading.

## Screen reader

- [ ] Confirm landmarks, page title, heading hierarchy, tables, and form labels are announced coherently.
- [ ] Confirm task state and progress are understandable without color.
- [ ] Confirm locked-task reasons and allocation instructions are announced.
- [ ] Confirm project updates are announced once without excessive interruption.
- [ ] Confirm the SVG has a useful title/description and the adjacent table provides equivalent content.

## Zoom, reflow, and display preferences

- [ ] At 200% browser zoom, complete every interaction without lost or overlapping content.
- [ ] At 320 CSS pixels, verify no page-level horizontal scrolling; the network figure may scroll internally.
- [ ] Verify portrait and landscape orientation.
- [ ] Enable reduced motion and confirm no essential change.
- [ ] Enable Windows High Contrast/forced colors and confirm states, controls, focus, and SVG nodes remain distinguishable.

## Content and operation

- [ ] Confirm no automatic audio, flashing, countdown, or time limit.
- [ ] Confirm all pointer actions have keyboard and single-click/tap equivalents.
- [ ] Print and download results; verify headings, allocations, cost labels, and attribution remain understandable without color.
- [ ] Test Canvas iframe and new-tab fallback at the institution.

## Automated companion checks

- [ ] Run `pnpm test:e2e` and review axe-core WCAG A/AA output.
- [ ] Run unit/integration tests and production build.
- [ ] Treat a zero-violation automated scan as necessary but not sufficient.
