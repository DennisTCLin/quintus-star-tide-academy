# Stable floating companion

Baseline: main `698b09a801c42e5f4d876ce1b9273c45605126dd` (PR10), retaining PR8 questions and PR9 voice recovery.

## Contract

Keep the companion visible at a stable viewport bottom-right anchor during scrolling. Do not obstruct navigation or actions on phone, tablet or desktop. Preserve care/chat, dialog focus, enlarged Zhuyin, reduced motion and suppression during preparation/answer/battle. Do not modify student data, question IDs, media or server contracts.

Hyper Relay: one read-only explorer, root sole writer, fresh read-only verifier.

## Change

Replaced per-control gap scanning, upward translation, automatic compacting and scroll hiding with a fixed dock and a reserved bottom region. The active page scrolls above that region. Character size is stable by viewport, with a horizontal label to keep the strip short. A ResizeObserver measures label growth; it no longer scans page controls or runs on scrolling. Quiet challenge pages retain document scrolling. Page resets now reset both the page shell and window.

An independent verifier reproduced a keyboard regression from the new scrollport: PageDown did not scroll while focus was on the fixed launcher. The launcher now forwards page-scroll keys to its page shell, preserving Enter/Space activation and modifier shortcuts. This was re-tested independently in Chromium and WebKit.

## Evidence

- `build.log`: production build, content audit, pronunciation checks and TypeScript PASS.
- `content-audit.json`: all 5,475 static records and 23,192 generated variants pass existing structural/oracle audit. This does not claim every item was manually reviewed again.
- `unit.log`: 924 passed, 192 environment-dependent skipped. Removed five tests that prescribed the obsolete jumping behavior; new browser checks assert actual stable positioning.
- `browser-results.json`: 36 Chromium/WebKit layouts, three mascots, six viewport sizes; entire-page scroll sweep, stable visible anchor, clipped visible-control clearance, nav touch targets, page resets and dialog/chat/focus PASS.
- `keyboard-results.json`: 10 browser/viewport combinations, grade-2 enlarged 32px label, PageUp/Down/arrows/Home/End, Enter/Space, temporary hide/reopen PASS.
- `touch-results.json`: six phone/iPad mascot care actions, actual action media decode, chat tab and course-picker suppression PASS.
- `voice-results.json`: four synthetic iPad voice flows in Chromium/WebKit, grades 2/4. Actual MediaRecorder codecs with synthetic microphone input and deterministic local provider; two-turn memory, reload, audio retry without duplicate chat writes, permission denial recovery and track cleanup PASS.
- `flow-results.json`: isolated local synthetic accounts only; grade 1/2 ready/win and three-mistake/loss in Chromium/WebKit. See recorded results for completion and status.
- Independent verifier: stable anchor and 11 nav transitions, enlarged labels, panel footer and keyboard repair PASS; no JS errors or game commands in mocked checks.

## Limits and rollback

Physical iPad microphone/speaker, Safari browser chrome and virtual keyboard are not certified by desktop WebKit. No claim of measured real-device FPS. Reserving a dock strip uses 72–136px at tested ordinary text sizes; it expands for enlarged labels. This trades some reading height for predictable, unobstructed access. Opening/closing panels keeps reserved space constant.

Rollback is a revert of these UI files on top of current main, not deployment of an older pre-PR8/PR10 snapshot. No schema migration or student progress mutation is involved.

### Viewport follow-up before release

A fresh browser check simulated an oversized mobile body (viewport height +100px). Wheel input in the dock could scroll the outer document and enlarge the gap by100px. While dock reservation is active, the document/body now use scoped overflow locking; cleanup restores ordinary scrolling on quiet pages. `viewport-results.json` records six cases; the independent verifier additionally checked ten WebKit/Chromium sizes with wheel, programmatic scrolling, chat open/close and leaderboard/parent transitions. All passed. This simulation does not certify real Safari chrome behavior.

## Integrated release candidate

Runtime `15a54da76c11c0701c0278e4ddbc04ae2a028367` includes PR11/13 (stable dock and viewport boundary), PR12 (Jasper authenticated school routing), and PR14 (wait for passive cloud refresh before accepting a write). Final build PASS and 935 unit tests PASS; 193 gated tests skipped in this run. Other chats supplied 21 isolated school-routing DB checks and full trial-flow checks; those are recorded separately in their evidence folders, not counted as this root's executions.

Root re-ran four actual isolated ready/answer flows (phone/iPad, grades1/2, both engines) against the integrated build: ready action visible, outer lock removed for challenge, and answer advances. Re-ran all four iPad voice/context/recovery suites against that same build: PASS. Existing pronunciation mappings are unchanged; the dictionary adds the school name only. No question catalog or existing question ID files changed in this integration.

## Production

Railway `1d4df211-730b-45df-af82-749f242f04a6` SUCCESS, runtime `15a54da76c11c0701c0278e4ddbc04ae2a028367`. Nine changed public files and six unchanged media samples re-downloaded with exact SHA/size matches; 1,978 packaged paths match the prior inventory. Health PASS; anonymous state remains401. Four production WebKit layouts PASS with intercepted synthetic API data: phone390, iPad820/1180 and desktop1440. No production player writes. Server/build source hashes are saved from the staged upload; direct remote SHA verification was unavailable because the CLI has no SSH key. No new key was registered.
