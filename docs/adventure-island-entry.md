# Adventure island entry and progress

Home now renders the five subject destinations immediately after the adventure hero. The hero scrolls to this chooser. Clicking an idle destination starts its grade-appropriate subject; clicking the active destination resumes it. Grade-one hands-on maths remains a separate button in the same maths destination.

Progress is the server's submitted-answer count divided by actual question count, including incorrect answers. Historical ordinary runs without an answer ledger use index plus settled. Failed runs retain their actual partial count rather than showing 100%. Completed hands-on maths has a separate previous-result bar. Collection previews from the parallel island-preview task sit outside entry buttons, use the current profile, and remain browsable during active runs.

Switching an unfinished journey requires explicit confirmation of ending it. Earned points/XP stay; unfinished completion rewards are not granted. Pending ordinary rewards and unfinalized maths outcomes route to settlement instead. The existing quit/start commands are sequential, each using the current cloud revision: a rejected quit cannot start a new run. If start fails after a successful quit, the abandoned run stays ended and a visible error requests recovery; this is not an atomic rollback. Same-ID completion/failure received from another device invalidates an open switch dialog. Switching players is blocked during the two-command operation.

## Verification (2026-10-25)

- Build, TypeScript, packed pronunciation and source checks: PASS. New generated text manually inspected for context (進行/同行, 數學/題數, 目的地, 獲得/的, 還有/還要).
- Focused PostgreSQL and unit suites: 8 files / 60 tests PASS, including route snapshots, rewards, math API/result recovery, progress/switch policy and collection previews. Isolated DB `islands_entry_qa_1025`; no real player changes.
- Fresh read-only verifier found syntax, completed-math history, and stale-dialog issues; all repaired and rechecked PASS.
- Real local App + isolated PostgreSQL browser: hero immediately precedes islands; idle 國語 click emits one chinese start; active English shows 2/6, submitted state 3/6. Cancel does not mutate. Explicit maths switch emits quit then math start. Injected start HTTP503 leaves run null, displays error, and does not repeat quit.
- Pending reward click produces settlement dialog and zero game commands. Fully answered, unfinalized maths shows 6/6 and settlement dialog with zero game commands. Same-ID cross-device failure closes an open switch dialog without commands.
- Grade-two browser widths 320/375/390/768/1440: document width equals viewport, section scrollWidth equals clientWidth. At 320, Enter expands collection details without overflow. Narrowest layouts use one island per row, others use 2/3/5 columns. Screenshots retained locally at `output/playwright/island-entry-final-*.png`.
- Production deployment is owned by the coordinated publisher, who must integrate the AI companion branch and verify final assets before reporting live.

No schema, reward formula, capture probability or player migration changed. Rollback is a UI commit revert on the current version-7-compatible integration baseline.
