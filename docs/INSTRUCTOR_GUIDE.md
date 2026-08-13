# Instructor Guide

## Purpose and learner experience

Rock'n Bands is a mastery-oriented simulation for an asynchronous project-management course. A first attempt is designed for about 30–40 minutes without a timer. Learners independently allocate workers, respond to deterministic changes, and review their results. Written reflection is intentionally left to a separate Canvas assignment.

## Corrected rules used by the application

All twelve tasks A–L are required. Initial durations total 38 worker-weeks. The Week 1 eligible set is exactly A, C, and D. Eligibility is evaluated once at the start of a week, so same-week completion never unlocks a successor.

Learners may use 0–5 workers weekly, assign no more than two to a task, and generate one worker-week of progress per assigned worker. Labor is $200 per worker. A fifth worker adds a $100 premium. Each task receiving two workers adds a separate $100 coordination/crashing charge.

Attempting to exceed five workers opens an immediate modal warning and leaves the prior valid allocation unchanged. Active premium, crashing, and late-penalty rows use warning text and an icon in addition to color, so the meaning does not depend on color perception.

The initial deadline is Week 10. After Week 5 it becomes Week 9. Learners must acknowledge a modal schedule warning before continuing, and the revised deadline remains highlighted in the status summary. Each round after Week 9 adds a $2,000 penalty. Play continues beyond Week 12 when required. After each committed week, focus and scroll position return to the new week heading; for the deadline-change week, this happens after acknowledgment.

The application applies these changes after the named week:

| After week | Change |
|---:|---|
| 1 | D: 3 → 4 |
| 2 | B: 5 → 3; E: 1 → 2 |
| 3 | F: 4 → 5 |
| 4 | H: 3 → 2 |
| 5 | Deadline: Week 10 → Week 9 |
| 6 | J: 4 → 5 |
| 7 | K: 5 → 4; I: 5 → 7 |

Final configured work totals 40 worker-weeks. When a reduction creates already-performed excess work, Capacity Recovery identifies the first unnecessary historical worker-week. The learner may move one unit only to a task eligible at that historical week's start, or remove the unit and associated cost. If no valid reassignment target exists, the application automatically leaves the unit unused and explains the cost correction instead of presenting a one-option decision. The audit log preserves every change.

## Debrief guidance

Do not reveal the critical path before or during play. The debrief identifies D–F–I as the initial 12-week critical path and shows how deterministic changes expand it to 16 uncompressed weeks. Emphasize that other paths remain schedule-sensitive and that balancing expected path completion can be more effective than managing isolated activities.

Project cost is feedback, not a punitive grade. Finishing late does not fail the learner. SCORM completion reports 100 only for completing the simulation and reaching the debrief.

## Canvas checks before release

- Launch the GitHub Pages item inside the normal Canvas content frame and as an external-link fallback.
- For SCORM, verify suspend/resume after a committed week and after Capacity Recovery.
- Confirm Canvas records incomplete during play and completed/passed only after the debrief opens.
- Test Student View, keyboard navigation, 200% zoom, and the institution's supported browser set.

## Source discrepancies intentionally corrected

The legacy handout says “A–K” in one paragraph even though Task L is listed; the simulation requires A–L. The legacy lyric is omitted. The workbook's Team 1 sample allocation is not imported. The corrected task, event, cost, timing, and deadline rules supersede conflicting source details.
