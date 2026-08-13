# Rules Traceability

| Requirement | Implementation | Verification |
|---|---|---|
| Correct Tasks A–L, dependencies, initial 38 worker-weeks | `src/domain/config.ts` | `engine.test.ts`: initial eligibility and 38/40 totals |
| Atomic weekly processing and no same-week unlock | `commitWeek` in `src/domain/engine.ts` | successor-unlock unit test |
| 0–5 workers, max 2 per task | allocation validation, native radio controls, and immediate modal limit warning | worker-limit unit tests; browser flow |
| Labor, fifth-worker, crashing, and late costs | `calculateCosts`; text-and-icon extra-charge warnings | transparent-cost, warning-state, and late-penalty tests |
| Correct deterministic events after Weeks 1–7 | `EVENTS`, `applyEvent`, and required acknowledgment dialogs | event-order, final-configuration, and browser-interaction tests |
| Week 5 deadline becomes Week 9 | deadline event, required acknowledgment dialog, and persistent revised-deadline status | deadline and browser-interaction tests |
| Capacity Recovery restricted by historical eligibility | pending recovery and `resolveCapacityRecovery`; automatic unused correction when no target exists | prohibited-target, no-choice auto-resolution, and audit-record tests |
| Continue beyond Week 12 | unbounded `currentWeek` transition | engine has no week cap; late fixture coverage |
| Welcome, interface briefing, and answer-specific rules-check feedback | semantic views in `src/ui/app.ts` | correct/incorrect Playwright browser flows |
| Network and equivalent task-list views | `src/ui/network.ts` | axe scan; manual screen-reader checklist |
| Locked/available/in-progress/complete states with text and icon | task cards and SVG labels | axe scan; forced-colors checklist |
| Review before commit and immutable history | review dialog and atomic engine call | browser flow; engine tests |
| Autosave/resume | `src/persistence/storage.ts` | round-trip persistence test |
| SCORM 2004 suspend/resume and completion at debrief | `src/lms/scorm.ts` | SCORM adapter tests |
| Local fallback without SCORM | adapter local mode plus localStorage | fallback test |
| Week 9, Week 10, Week 11+ deterministic fixtures | `tests/fixtures/fullGames.ts` | fixture test |
| Results, learner/reference network comparison, path debrief, print/download | debrief view and `completedNetworkComparison` | axe scan, diagram assertions, and browser coverage |
| WCAG 2.2 AA target | semantic UI, CSS preferences, dialogs, validation | axe Playwright test plus manual QA checklist |
| GitHub Pages and Canvas iframe behavior | relative Vite build, Pages workflow, no frame-breaking script | production build and documented Canvas check |
| SCORM 2004 4th Edition ZIP | manifest and packaging scripts | `validate-scorm.mjs` |
| Privacy/security | no external services; CSP; local/SCORM-only state | production asset inspection and README |
| Attribution and educational-use notice; excluded lyric | application footer and docs | content scan before delivery |
| No sample Team 1 allocation | initial state has zero progress and no history | initial-state and source-content scans |
