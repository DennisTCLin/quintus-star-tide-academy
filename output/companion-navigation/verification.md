# Companion navigation clearance

## Problem and change

On main `49bf714`, the fixed bottom-right companion covered navigation hit targets on all three tested 375 × 667 grade profiles (3 of 9 baseline viewport cases). Merely raising the corner offset would move the obstruction to other controls.

The companion launcher now has its own normal-flow row immediately after navigation and before page content. It retains the current animated character and care/chat entry. Phone and tablet rows fill the available width; desktop uses a compact right-aligned button. The harbor departure CTA remains above navigation. No new media, API, authentication, rewards, question-bank or database changes.

The row reserves its geometry while the companion dialog or another overlay is open. Temporarily hiding the character retains the same image box and label. Closing returns focus to the actual opening button, including the separate harbor entry. Existing quiet-page/combat suppression is preserved.

## Acceptance evidence

- Production build passed: content, zhuyin/pronunciation checks, TypeScript, Vite and server bundle. Existing large-chunk warning remains.
- Full tests: **133 files passed, 22 skipped; 905 tests passed, 180 skipped**. The skipped database tests were not counted as passing.
- Chromium and WebKit: **100 viewport/profile combinations and 10 interaction suites passed**. Widths 320–1440 cover phone, tablet portrait/landscape and desktop; profiles cover grades 1/2/4 and tideglow, bow and dog mascots.
- Every navigation target was hit-tested after scrolling; all eight destinations were opened. No horizontal overflow; launcher target at least 44px. Open/close, keyboard Enter/Escape, both opener focus paths, reduced motion, hide/reopen, course picker and enlarged launcher/zhuyin text were checked.
- WebKit touch-device emulation: iPhone 13 and iPad Pro 11, portrait and landscape, **4 passed**. Navigation taps, dialog closure/focus and actual cutout load checked; no captured ARIA warnings.
- All browser QA used a dedicated disposable localhost PostgreSQL database and synthetic accounts. Browser interaction suites observed zero game commands and unchanged learning profiles after reload. Live AI endpoints were blocked in interaction QA. No real child data was edited.
- Screenshots visually reviewed: `chromium-bow-grade2-375.png` and `webkit-dog-grade1-820.png`.

## Independent review

Route: Solo implementation → Relay read-only falsification; root was the only source writer. Reviewer found an 18px bow hide/reopen shift (2px dog), plus the overlay row-removal risk. Both were fixed before final tests. Fresh recheck passed **12 independent sequences** at 320 × 568: Chromium/WebKit × three mascots × 16px/32px text. Main document position and row height stayed exactly equal through hide/reopen and course-picker open/close; focus restored correctly. Final raw-diff review found no reproducible blocker.

## Performance and limits

Bundle comparison against a clean main `49bf714` Vite build: all emitted JavaScript gzip +68 bytes; CSS gzip −45 bytes (net +23 bytes). No new asset files or dependencies.

Five-minute visible-page API measurements (`idle-results.json`): baseline and changed each made 238 requests (108 state, 100 online-battle, 30 presence), with exactly 709,024 response-body bytes each. No increase observed. These are local synthetic sessions, not production latency or physical-device frame-rate measurements.

Physical iPad/iPhone hardware, OS-level text scaling, microphone capture, live AI responses and long-duration physical-device performance were not tested in this navigation-only change. Browser emulation is not a claim of real-device acceptance. No live-voice code changed.

## Reproduce and rollback

Use a dedicated localhost database named `companion_navigation_20261027`. Build first, then run `start-local.mjs` with its guarded TEST_DATABASE_URL. It writes generated synthetic credentials only to a mode-0600 private file outside the repository. `seed-mascots.mjs` adds local-only identity fixtures for bow/dog routing. Run `browser-qa.py` and `touch-qa.py` with Playwright Chromium and WebKit installed. `baseline.py` was executed before source edits; `idle-qa.py` compares a clean baseline server on 4387 against the changed build on 4386.

Release is coordinated with the sole Railway release owner, using the established asset-preserving stage. Do not deploy a Git-only archive that discards released media. Rollback requires reverting only the frontend source commit; no data migration is involved.
