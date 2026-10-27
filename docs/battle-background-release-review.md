# Battle background and reconnect verification — 2026-10-25

## Scope and ownership

Continue phone/tablet battle lifecycle verification, coordinate with the collection/learning release, and publish after verification. Baseline main was `0e0b753`; its application runtime was `1218de8`. The lifecycle writer owns `src/online-battle.ts` and its regression tests, the collection/learning chat owns its separate changes and final publication, and this worktree independently verifies the integrated candidate.

## Reproduced defects

- With a GET held across background/foreground events, the previous controller remained connected, skipped a fresh read while the old read was pending, and accepted the old round after the server advanced. `outputs/background-device-audit/baseline.json` records server round 2 versus displayed round 1.
- A late successful POST could arrive after the other participant had already moved. Its response cannot certify the current resumed state.
- An independent actual React 18/WebKit probe dispatched hidden → visible → click in one JavaScript task. Before React committed the disconnected render, the old action closure sent a new move while the refresh was pending. The same stale-closure risk existed immediately after an uncertain network failure.

## Repair

Lifecycle invalidation retires old reads, releases their poll slot, and disconnects immediately. Foreground restoration and persisted `pageshow` require an accepted fresh snapshot. A separate lifecycle generation rejects outdated successful POST snapshots and schedules a new read after an in-flight action settles. Synchronous readiness and unresolved-command refs enforce the barrier before React renders. Confirmation retries retain the exact original command ID and payload. Existing server revision checks, idempotent receipts, reward rules and the 120-second turn deadline remain in force.

## Browser method

`outputs/background-device-audit/qa-server.mjs` uses an isolated local PostgreSQL database and creates two synthetic accounts. `browser-qa.py` opens independent WebKit iPhone 13 and iPad gen7 contexts, invites and accepts through the UI, and calls the actual application API. Held or lost replies are fetched from the real server first; no gameplay response is fabricated. Network loss uses Playwright's offline network setting. A fixture-only endpoint expires only the two synthetic participants' active room for the deadline test.

Playwright WebKit tabs continued to report visible when another tab was brought forward. Therefore the harness explicitly injects Page Visibility and persisted PageTransition events. This tests application event handling, not physical iOS process suspension, actual BFCache admission, hardware memory pressure or native app switching.

The 24 browser checks cover both clients' old GET replies, actions blocked while every fresh reply is held, a late successful POST, each client's committed-but-lost reply followed by an opponent move, exact retry identity with unchanged battle/health, persisted restoration, timeout settlement, unchanged full learning-state digests, unique command receipts and application exceptions. Later reads share the held fresh-response barrier, so a valid extra poll cannot make the paused-state assertion ambiguous.

## Verification and publication

- Frozen runtime candidate: `54329aa701c73874666858233b92af0d0ef2bcea`, including lifecycle commits `ab33588` and `7267c6e`, collection accessibility and level projection fixes, and the coordinated learning changes.
- Full integrated suite: **98 files / 739 tests PASS**, including real local PostgreSQL tests. The publisher's raw result is in `output/playwright/collections-release/tests.txt`.
- Root production build: **PASS**, including TypeScript and pronunciation checks. See `outputs/background-device-audit/build.txt`.
- Final real-API WebKit run: **24/24 PASS**, source `54329aa`, zero JavaScript diagnostics. See `verification.json` and `browser-tests.txt` in the same evidence directory.
- Independent read-only verification: **PASS** for the exact hook/test blobs in `7267c6e`; lifecycle regressions **10/10 PASS**, actual React 18/WebKit same-task regression and uncertain-retry probes PASS. See `independent-review.json`.
- Harness setup now waits for both UIs to observe acceptance before holding reads. The server can already be active while the inviter still correctly displays its last pending snapshot; that state does not have an attack button. A previous locator timeout exposed this fixture precondition, not a controller failure.
- Publication and anonymous production acceptance: **PASS**; details below.

## Limits

Physical iPhone/iPad hardware and operating-system suspension were not available. A battle that exceeds the existing turn deadline correctly returns to a settled result; it does not resume an expired turn. Production acceptance must independently match the tested build and GitHub main before this release is reported complete.


## Published version

- GitHub main: `8fb0e094a76efbb6321a29b90bbdb09bfb9c8b33`, independently confirmed with `git ls-remote`. Its application files are identical to the tested runtime `54329aa`; intervening changes contain QA scripts, reports and evidence only.
- Railway deployment: `e39f219c-4e70-417e-8486-ffd4f6ad7985`, reported SUCCESS by the sole publisher. The clean archive omitted only `output`, `outputs`, `tests` and `artwork`, which are already excluded by `.dockerignore`; application source and public assets were retained.
- Independent anonymous production verification: **14/14 PASS** for health, entry references and every built JS/CSS byte hash. Entry: `/assets/index.v-BRQQNG5y.js`. The raw result is `outputs/background-device-audit/production-verification.json`; no account access or production mutations were used.
- Local synthetic QA server was stopped and its temporary credential manifest removed. Follow-on evidence-only commits do not alter the deployed runtime.
