# Manual Accessibility QA Checklist

Record tester, browser/assistive technology, date, result, and notes for each release.

## Keyboard and focus

- [ ] Use only Tab, Shift+Tab, Enter, Space, arrow keys, and Escape from Welcome through debrief.
- [ ] Verify the skip link moves focus to the main content.
- [ ] Confirm every focus indicator is clearly visible and never obscured.
- [ ] Open/close Help and Review dialogs; confirm focus enters the dialog, stays inside, returns to the trigger, and Escape closes it.
- [ ] Trigger an invalid allocation and confirm the modal warning appears immediately, then returns focus to the rejected control.
- [ ] Commit a week with a scheduled change and confirm its modal warning cannot be dismissed without acknowledgment; after acknowledgment, confirm focus moves to the new-week heading or a genuine Capacity Recovery choice.

## Screen reader

- [ ] Confirm landmarks, page title, heading hierarchy, tables, and form labels are announced coherently.
- [ ] Confirm task state and progress are understandable without color.
- [ ] Confirm locked-task reasons and allocation instructions are announced.
- [ ] Confirm project-change dialogs are announced once with their title and changed duration or deadline.
- [ ] Submit both correct and incorrect knowledge-check responses; confirm status text, symbols, answer text, and focus are understandable without color.
- [ ] Confirm both debrief network diagrams have distinct accessible names and that completion weeks and the reference critical path are conveyed in text.
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
