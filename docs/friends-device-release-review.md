# Friend battle device and release verification — 2026-10-25

## Scope

Audit GitHub main and production, exercise friend invitations, complete battles and reconnect on phone/tablet layouts, repair observed defects, and publish the tested revision. Main baseline was `a39f199` (runtime `1ac3992`, Railway deployment `e49b9481-bb87-4f02-ad81-3c9f599b1547`). The integration branch also incorporates the coordinated mobile/ruby/companion fixes as `8cbb534`; see `mobile-tablet-experience-review.md` for their evidence.

## Reproductions and repairs

- Browser offline initially left attack enabled until a failed poll. The battle controller now immediately disables commands, invalidates outstanding reads, skips offline polling, and prevents a late successful response from marking an offline browser connected.
- A committed move followed by a proxy 502 discarded the uncertain command. All 5xx failures now retain the original command ID and payload for confirmation; retries cannot apply a second move. Explicit 4xx errors keep their existing handling.
- Both participants acknowledging a result from the same room revision produced 200/409. This reproduced independently in local WebKit, server tests and production UI. Terminal acknowledgement now tolerates an older revision while retaining participant authorization, terminal-state validation, future-revision rejection and exact receipt matching. Other actions still require the current revision.
- A long grade-two player name widened a 320px document to 332px. The shared header constraints repair that overflow. The battle caption now wraps as a text span rather than separate ruby flex items.
- Enlarged ruby HUD text covered the combatants in narrow social battle dialogs. The social dialog now reserves the HUD's natural height above a separate space for the characters, retaining readable annotations and scrollable controls.
- Two existing phonetic tests incorrectly assumed tones remained contiguous in raw HTML. They now assert the rendered text, retaining the reading checks while permitting the existing tone span.

## Verification method

`outputs/friends-device-audit/qa-server.mjs` creates only isolated local PostgreSQL QA accounts. `browser-qa.py` runs independent WebKit iPhone 13 and iPad gen7 contexts against the actual API and database. No gameplay API is replaced. Client-only response loss occurs after `route.fetch()` has committed the real operation. The test checks original command IDs, room/revision/health equality, immediate offline state, stale reads, reload, natural match completion in both directions, dismissal, and an unchanged full learning-state digest. UI checks include 320×640, 390×844, 768×1024 and 1024×768, 44px minimum targets, no horizontal overflow, no HUD/character overlap, and scrolling to characters and caption.

The independent production reviewer used two already authenticated, human-authorized browser sessions through the normal UI. Both invitation directions completed naturally; attack, guard, burst, heal, narrow phone layouts and in-battle reload succeeded. Resource and learning values were unchanged after refresh. The same acknowledgement race was independently observed. No new production accounts, database changes, purchases, answers or reward claims were used for this verification.

## Checks

- Production build: PASS, including TypeScript and pronunciation audit.
- Full isolated-database suite: 94 files, 713 tests PASS. The new terminal-acknowledgement test was first run against the old server and failed with 200/409, then passed after repair.
- Final WebKit run: PASS, both matches naturally completed, both participants dismissed, reconnect/reload/response-loss checks passed, full learning digest unchanged, no application JavaScript exception. Raw checks and screenshots are in `outputs/friends-device-audit/`.
- Independent source and screenshot review: offline/idempotency, terminal acknowledgement, and scrollable HUD/characters/caption PASS. Physical device and post-deployment acceptance remain separately identified.
- Production deployment and acceptance: PASS; details below.

## Limits and rollback

Device coverage uses browser emulation and responsive viewports. Physical iPhone/iPad hardware, hardware audio/microphone, background OS suspension and long-duration memory pressure were not verified. Database schema and reward rules are unchanged. A rollback can redeploy the preceding runtime `1ac3992` from a clean archive; this restores the documented acknowledgement/reconnect defects as well.

## Published version

- GitHub main received runtime `1218de8f6792e17daf0c37401da19aac1eb2f00f`. Railway deployment `55e752cc-2463-46da-ba0e-d89bb307412e` reached SUCCESS. The clean Git archive omitted only `outputs`, `output` and `tests`, already excluded from the Docker build context, after the first upload exceeded the platform upload limit. All application source and game assets were retained.
- Anonymous verification: 14/14 health, entry references and JS/CSS byte checks PASS. Entry: `/assets/index.v-dbIJ5XGq.js`. Independent mobile/companion audit: 11/11 health and key image/video/audio/bundle hashes PASS.
- Both production sessions refreshed into this entry. A new natural battle completed, then near-simultaneous UI clicks on “完成” closed both dialogs once: no conflict, active room or residual result banner. 320/390px UI and scrolling PASS; refreshed coins, tickets, materials, growth count and selected companion XP stayed unchanged. Committed evidence omits account names, balances and identifiable screenshots.
- A follow-on test review identified an in-place `.sort()` on the saved acknowledgement snapshot, making the test itself dependent on UUID order. The assertion now sorts a copy; runtime is unchanged. The 10-test real-database online-battle suite passed after that test-only correction.
- Final follow-on commits contain verification evidence and the test-only snapshot correction; their application source is identical to the deployed runtime. Local QA server and temporary credentials were cleaned up. Physical hardware remains unverified as noted above.
