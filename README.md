# Rock'n Bands

Rock'n Bands is a self-contained, accessible project-management simulation for independent use inside Canvas LMS. The same codebase builds a static GitHub Pages site and a SCORM 2004 4th Edition package.

The application uses Vite and TypeScript without a UI framework. That keeps the SCORM payload small, avoids runtime dependencies and CDNs, and lets semantic HTML remain the primary interface.

## Local development

Requirements: Node.js 22+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. No server, analytics, account, or API key is required.

## Build and test

```bash
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm package:scorm
```

- `dist/` is the production static site.
- `artifacts/rock-n-bands-scorm-2004-4th-edition.zip` is the upload-ready SCORM package.
- The package validator confirms that `imsmanifest.xml` and `index.html` are at the ZIP root, the resource is a SCO, the edition is correct, and every listed file exists.

## GitHub Pages deployment

The workflow in `.github/workflows/quality-and-pages.yml` tests the project, runs Playwright and axe-core, builds the site, creates the SCORM artifact, and deploys `dist/` from the `main` branch. In repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**.

Vite uses relative asset URLs (`base: "./"`), so the same production files work in a repository subpath and inside a SCORM package.

## Canvas: External URL / GitHub Pages

1. Deploy the site to GitHub Pages.
2. In a Canvas module, add an **External URL** item using the published page URL.
3. Select the option to load the item in a new tab if the institution blocks iframe embedding. If embedding is permitted, Canvas can display it in its content frame.
4. Publish the module item and test with Student View.

GitHub Pages does not provide per-repository custom response headers. The application avoids any frame-breaking script and includes a restrictive in-document Content Security Policy, but an institution's Canvas or security policy may still require the ordinary external-link fallback.

The GitHub Pages version stores progress only in the learner's browser using `localStorage`. It collects no identifiers and sends no decisions to a server.

## Canvas: SCORM upload

Canvas SCORM availability depends on institutional configuration. When the SCORM tool is enabled:

1. Upload `artifacts/rock-n-bands-scorm-2004-4th-edition.zip` through the Canvas SCORM tool.
2. Choose the institution's preferred graded or ungraded import mode.
3. Launch the imported item as a student and confirm resume behavior after at least one committed week.
4. Complete all tasks, open the debrief, and verify that Canvas records completion and a score of 100 when a score is required.

The adapter initializes SCORM 2004 as incomplete, writes full state to `cmi.suspend_data`, commits after each completed week and capacity recovery, and reports completed/passed only after the learner opens the debrief. Without `API_1484_11`, the application remains fully usable with local storage.

## Architecture

- `src/domain/types.ts` — domain types
- `src/domain/config.ts` — authoritative tasks, costs, and deterministic events
- `src/domain/engine.ts` — pure/controlled simulation transitions
- `src/persistence/storage.ts` — local save/restore
- `src/lms/scorm.ts` — SCORM 2004 adapter and fallback boundary
- `src/ui/` — semantic views and inline SVG network
- `src/styles.css` — responsive, print, reduced-motion, and forced-colors styling
- `tests/` — rule, persistence, SCORM, fixture, accessibility, and browser tests
- `scripts/` and `scorm/` — packaging and manifest validation

## Privacy and security

No analytics, trackers, third-party fonts, external media, secrets, Canvas API tokens, or network requests are present. Saves remain in local storage or SCORM suspend data. The application never reads or manipulates the surrounding Canvas page.

## Attribution and educational-use terms

Designed by Ken Klassen, Brock University, and Keith Willoughby, Bucknell University.

This game was developed for educational purposes. It may be used, disseminated, and modified for educational purposes, but it may not be sold. All uses must acknowledge the original developers.
