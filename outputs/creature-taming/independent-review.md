# Independent implementation review

Reviewed 2026-10-25 in `/Users/dennistclin/.codex/worktrees/homepage-animations/星潮網站開發`, initial monster implementation later committed as `dd54a13`. Review overlapped the integration of the latest gacha/friends baseline. Findings below describe the initially reviewed code; parent agent is implementing repairs.

Scope: read-only review of reducer, cloud transaction, import boundary, shared stats, encounter presentation, recruits and skill mappings. Executed isolated, deterministic source bundles using esbuild `write:false`; no product files changed, no database suite run, no browser/visual verification claimed.

## Findings

### F1 — P2: final-answer replay loses the capture result after another run starts

Location: `/Users/dennistclin/.codex/worktrees/homepage-animations/星潮網站開發/server/cloud.mjs:135` (answer command), initially `src/adventure.ts:588` (boolean return). After baseline integration, receipt handling is at `server/cloud.mjs:737` and insertion at `server/cloud.mjs:838`.

The answer command returns the boolean from `answerRun`, so the command receipt persists only `true`. `run.capture` holds the actual outcome, and `startRun` replaces the run. A replay serves the current family plus the original boolean. Consequently, a delayed replay after another device starts a newer voyage cannot return the original capture outcome, despite the contract requiring a persisted capture result on request replay.

Reproduce: complete final answer A with a successful capture; save its request; claim its learning reward; start run B; replay request A. Expected: original capture result remains available in the response. Initial implementation: `result === true`, family contains B, and A's capture is absent. An isolated reducer check confirmed final answer returns `true` and starting the next run removes the only capture object. Actual HTTP replay must be covered by the parent's PostgreSQL suite.

Ownership and quota remain safe: inspected transaction locks state, checks receipts before revisions, and saves all mutations and the receipt together. This finding is result persistence, not a demonstrated reroll exploit.

Status: parent acknowledged; plans a versioned internal receipt envelope while preserving the public boolean result.

### F2 — P2: numeric legacy encounters have no explicit no-capture explanation

Locations: `/Users/dennistclin/.codex/worktrees/homepage-animations/星潮網站開發/src/adventure.ts:594` and `/Users/dennistclin/.codex/worktrees/homepage-animations/星潮網站開發/src/QuizEncounter.tsx:109`.

Legacy encounters produced by `legacyEncounter` have no `variant`. `settleCapture` returns before assigning the `legacy` reason when no species exists. The precompletion explanation requires `species`, while the result card requires both `capture` and `recruit`. Thus these legitimate old runs show no legacy/no-attempt explanation either before or after completion. The existing new legacy tests delete `combat` but keep `variant`, missing the older format.

Reproduce: start a valid run, replace its encounter with `legacyEncounter(run.id)` (the migration shape), validate, finish all five answers, and validate again. Initial output is `{status:"won",capture:null,quota:null}`. The five-hit flow and no-grant behavior are correctly preserved; the explicit reason required by the contract is missing.

Status: parent acknowledged; plans a numeric-legacy UI explanation without changing the old stored shape.

### F3 — P2: user instructions still assert fixed/equal arena HP

Locations: `/Users/dennistclin/.codex/worktrees/homepage-animations/星潮網站開發/src/ElementGuide.tsx:20` and `/Users/dennistclin/.codex/worktrees/homepage-animations/星潮網站開發/src/GachaMachine.tsx:129`.

The shared element guide still says generation healing has a cap of 100, and the gacha explanation says all arena HP are equal. Both are false under the newly implemented stat curve. They appear in ordinary game instructions and contradict the new HP displays and reducer behavior.

Reproduce: use a creature above E/Lv.1 (for example S/Lv.1, max HP 130) and open either guide; or heal a levelled creature whose HP is already above 100. The reducer now correctly caps healing at that fighter's max HP, while the guide says 100. Source search after the gacha merge still found both strings.

Status: reported to parent; use each creature's maximum HP and explain rarity/level effects.

### F4 — P3: recaptured historical monster is incorrectly described as starting at Lv.1

Location: `/Users/dennistclin/.codex/worktrees/homepage-animations/星潮網站開發/src/QuizEncounter.tsx:113`.

The capture outcome is `joined` whenever the monster currently has no owned copy. Existing trade behavior intentionally preserves growth after the last copy leaves. When that species is later captured again, its retained level is displayed in the badge but the joined copy says it starts from Lv.1. This is an actual reachable state, and retaining growth is the correct behavior.

Reproduce: train a monster to Lv.3, trade its last copy away, and capture the species again. A valid deterministic posttrade fixture with `firstAcquired['cloud-scout-metal']` and 125 XP but no owned copy produced `{outcome:"joined",copies:1}` with actual level 3. Make the text account for historical XP; do not reset growth to fit the copy.

Status: reported to parent.

## Other inspected behavior

- No P0/P1 security or atomicity defect found in the inspected changes.
- Server RNG is not accepted from command fields; final settlement shares the state transaction, and won runs reject fresh final-answer requests.
- Same-day three-attempt accounting consumes eligible successes/failures; practice, old-day, legacy and capped copies do not mint extra ownership.
- Monster imports are rejected for owned/first-acquisition/equipped/run-companion references before the archive and cloud state are persisted. Imported growth, capture quota, retained-run combat and capture are discarded.
- Draw pool still derives from the 55-entry base roster; acquisition rejects monster purchases. The merged roster supports equip, growth, arena lookup and territory selection.
- Frozen run stats are validated against the version-one formula; quiz HP is independent of ally damage; fifth completion clears remaining HP. Arena damage, healing, generation caps and CPU healing thresholds use the new stats/max HP. Missing fighter stats retain the legacy branch.
- Cloud/crab/golem map to focus/shield/spark, and detail text describes the corresponding executable effects.

## Deterministic probe output

Executed against source using an in-memory esbuild bundle, without shared build output or database access:

```json
{
  "legacy": { "status": "won", "capture": null, "quota": null },
  "reacquisition": {
    "capture": { "monster": "cloud-scout-metal", "chance": 30, "outcome": "joined", "copies": 1 },
    "level": 3
  },
  "receipt": { "storedResult": true, "captureAfterNextStart": null, "newRun": "next-probe" },
  "maxHp": [100, 130]
}
```

This report does not assert PostgreSQL concurrency/restart, browser layout, mobile sizes, keyboard interaction, reduced motion, pronunciation, or deployment validation. Those remain with the parent agent's verification.

## Follow-up: four findings closed; learning reward integration checked

Rechecked 2026-10-25 after `b421a10` and against the resolved working-tree integration of `cfec840` (learning/building rewards). Git still marked merge entries unmerged during inspection, but the reviewed source files had no conflict markers. No build was started by this reviewer.

All four original findings are closed in the inspected source:

- **F1 fixed.** `server/cloud.mjs:848` constructs `{runId, ...capture}` and stores it in an internal `answer-capture-v1` receipt envelope in the same transaction. The normal response retains `result: boolean` and exposes `captureReceipt`; the replay path at `server/cloud.mjs:748` unwraps the original stored envelope, independent of the current run. Old boolean and other command receipts retain their existing public result shape. `src/__tests__/capture-cloud.test.mjs:68` now claims the reward, starts a different run and verifies the original receipt/capture result on replay. This is a source/test inspection conclusion; this reviewer did not run the PostgreSQL test.
- **F2 fixed.** `src/QuizEncounter.tsx:109` renders the legacy/no-capture explanation whenever species is absent, before and after completion. Numeric legacy encounters retain their old saved shape and five-hit presentation; no grant or invented monster identity is added.
- **F3 fixed.** `src/ElementGuide.tsx:20` states that healing caps at that companion's maximum HP. `src/GachaMachine.tsx:129` explains rarity/level effects instead of equal HP. The App wording is also aligned. A source search no longer found the two obsolete assertions.
- **F4 fixed.** `src/QuizEncounter.tsx:114` distinguishes a rejoined creature with retained XP and says its existing level/XP are preserved. Only a creature without existing XP receives the Lv.1 introduction.

### Integration behavior

The learning merge removes only the XP ledger's daily 15-question gate: `src/adventure.ts:553` still requires a same-day, nonpractice, newly credited question, and invokes material rewards once for that credit. Its validator accepts the bounded grade-specific question capacity at `src/adventure.ts:232` instead of 15. The separate mastery/coin rule remains capped at 15 as before.

Capture is still settled only at final completion, using `DAILY_CAPTURE_ATTEMPTS = 3` and its separate `captureQuota`; it does not depend on XP ledger length or building-pack progress. Receipt handling, server-only RNG, monster import rejection and cleanup, stat snapshots, five-question finisher, roster acquisition rules, max-HP arena behavior and skill mappings remain intact in the reviewed integration diff. The newly imported material reward state is also cleared at the local-import boundary.

Executed a read-only deterministic probe using the **existing** `build/game.mjs`, after asserting that its `answerRun` contained `awardLearningMaterials` and did not contain the removed `DAILY_GROWTH_QUESTIONS` gate. This did not build, write shared artifacts, access PostgreSQL, or render UI. For each of all four profiles, the probe completed four same-day runs with server-roll input 0, checked the combat snapshot after every completion, claimed pending learning rewards, and called `validateFamily` after every run.

| Profile | Grade | Distinct completed questions | XP | Material packs | Capture attempts | Fourth-run capture |
| --- | --- | --- | --- | --- | --- | --- |
| quintus | 4 | 20 | 200 | 4 | 3 | daily-limit |
| feifei | 2 | 20 | 200 | 4 | 3 | daily-limit |
| qingqing | 1 | 20 | 200 | 4 | 3 | daily-limit |
| doudou | 1 | 20 | 200 | 4 | 3 | daily-limit |

Every run retained its frozen combat snapshot and passed family validation. The first three capture outcomes were joined, joined, duplicate; the fourth was unavailable/daily-limit. No new actionable correctness, security, or compatibility finding was identified in this follow-up scope. PostgreSQL concurrency/restart/replay, actual browser layouts and deployment verification remain outside this review.
