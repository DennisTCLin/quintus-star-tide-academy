# Answer continuation regression — 2026-10-26

User recording: correct answer settled; footer explicitly says automatic advancement paused. Child repeatedly taps disabled answer. Recording proves this flow stall, not device frame rate degradation.

Change: always-visible large next button; pause becomes a secondary automatic-only control; manual and timer share a synchronous lock; one delayed retry after transient failure, followed by explicit retry. Existing server command, index guard, scoring and rewards unchanged.

Evidence:
- `browser-results.txt`: 14 WebKit assertions on actual BattleAdvance component in StrictMode, iPad 1024x768 and grade2 ruby at 320x568. Includes pause, rapid clicks, failed auto recovery, bounded failures, manual retry, offline/busy/visibility/unmount cleanup. Visibility uses synthetic visibility events; not physical backgrounding.
- `live-results.txt`: actual built app, synthetic grade1 account and isolated PostgreSQL, answer → pause → triple click next; exactly one answer and one advance command, index 1, one correct, +10 coins.
- `tests.txt`: 18 passing server-authority/remediation/presentation tests, including idempotent command replay and stale-index rejection.
- `build.txt`: production build including pronunciation and content integrity checks.
- `live-paused-ipad.png`, `live-next-ipad.png`, `paused-320.png`: inspected layouts.
- Fresh read-only verifier: all scoped criteria PASS; no reproducible defects. Live integration was added after its component review.

No real player records modified. Physical daughter's iPad performance is not measured by these desktop WebKit checks. No claim that every rendering/audio/network lag is eliminated.

To reproduce component checks: run Vite on port4326, open harness.html via Playwright CLI WebKit then pass browser-check.js to run-code. Harness has no production API access. Live check requires an isolated synthetic grade1 `medials` run with first answer ㄧ and the first question already opened; never execute it against a real player account.

Production: runtime `1ea8463`; Railway `68f5a512-12d9-4584-8a67-401f89482fd2` SUCCESS. Exact 7 entry assets match local build bytes; health200 and anonymous state401. See production-verification.json. Release QA commit changes no runtime.
