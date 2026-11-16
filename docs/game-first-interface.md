# Compact game interface — 2026-11-16

This batch changes the existing Railway Star Tide Academy interface, based on the deployed DennisTCLin/quintus-star-tide-academy main commit `2e5afaef`. It does not integrate another website or change the deployment source.

## Behavior

- A single-row player/resource/social HUD and primary departure button lead directly to the island map. Resume, pending capture, pending rewards and guarded island switching retain their existing routing.
- Five illustrated subject stops remain visible on the first screen for new voyages at the tested phone and tablet sizes. Buttons retain short labels and accessible names.
- Four fixed navigation buttons: harbor, companions, battle, more. The remaining seven destinations are available in the More dialog. Safe-area spacing keeps controls above the system gesture area.
- Interface phonetic annotations are removed from island names, preparation actions and social text. Phonetic symbols that constitute a lesson or answer are retained unchanged.
- The preparation screen shows the target, three hearts, two timing choices and a fixed Start button. Rules remain available by speech or expansion. Timing, answer limits, media readiness and server authorization are unchanged.
- The homepage Chat tile opens the existing companion panel. Other pages retain the floating companion above navigation. Optional harbor scenes and panels mount only while their details panel is open; existing cinematic controls and previous results remain available there.
- Reuses the existing Higgsfield navigation art and island assets; no new media payloads or paid generations.

## Verification

- `npm run build`: content audit, dictionary coverage, TypeScript, frontend and server build pass.
- `npm test -- --maxWorkers=2`: 194 files / 1,692 tests pass; 39 database-gated files / 379 tests skipped in this command.
- All 41 database-dependent test files pass when each owns a separate fresh local PostgreSQL database. Shared-database execution produced fixture collisions. Three initially timed-out isolated suites also pass on fresh rerun under their original timeout settings. No timeout, performance threshold or assertion was relaxed.
- Production-build browser checks: Chrome and WebKit, grades 1/2/4, new and resumed voyages, 320×568, 375×667, 390×844, 768×1024, 820×1180, 1180×820 and 1440×900. 144 layout/flow checks pass, including hit testing, no horizontal overflow, first-screen Start, real local-server answers and exact profile equality through navigation/reload.
- Three additional WebKit checks cover phone and tablet portrait/landscape: Chat panel, unopened harbor panels unmounted, reduced motion, companion/navigation separation and offline blocking. The navigation-return case also verifies that a previously expanded harbor is closed and its scene is unmounted on return.
- This is browser-engine and viewport coverage, not hands-on testing of a physical iPad or microphone. Audio transport is unchanged.

## Data preservation boundary

Question banks, migrations, API command handlers and progression/reward rules are unchanged. Rebuilt adult engine is byte-identical to the production baseline. The child bundle differs in exactly one dictionary initializer line containing 16 new UI-only phrases; all prior dictionary entries and all other engine lines remain identical. Local PostgreSQL tests use synthetic accounts only, including exact save preservation, rewards and cross-device reload contracts.

Raw production data and credentials are not stored in this repository. A new production database snapshot was attempted read-only, but the service has neither a public database URL nor registered Railway SSH keys for this CLI. No network exposure or SSH identity was added. The release record must distinguish source/isolated-data proof from any separately obtained live snapshot.

## iPad acceptance

Refresh the existing URL. The first screen should show departure and islands. Tap a subject, choose timing and use the bottom Start button. Answer one question, return to the harbor and confirm Continue resumes the same voyage. Open More, and use Chat from the homepage. Verify the bottom navigation remains unobscured in both orientations.

## Unread report follow-up — 2026-11-16

The unread defense report banner previously appeared above departure and could dominate the page with 30 reports. It now appears below the homepage map and shortcuts as a closed, 46-pixel row: report icon, short label and unread count. Expanding reveals the existing outcome summary and link to the full reports. Returning home or reloading starts closed. Opening the disclosure or report page does not mark reports read. The course disclosure label is also shorter.

Build/content/pronunciation checks and 29 focused report/course/departure tests pass. Fourteen Chrome/WebKit viewport checks (320–1440 pixels wide, including tablet portrait and landscape) use a synthetic response with 30 unread reports. Departure and all five island buttons remain visible and hittable on the first screen. Touch, Enter and Space toggle the disclosure; full-report navigation, navigation back and reload preserve the synthetic profile and all unread reports, with no conquest writes. No production account was used. Evidence: `output/raid-notice/browser-results.json`.
