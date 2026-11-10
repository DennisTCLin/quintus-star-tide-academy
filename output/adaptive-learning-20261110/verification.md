# Child adaptive learning — release candidate verification

Base: `a4d1e62a20286d62fa555d4d8b1a73a31f0d24e8`. Branch: `codex/adaptive-child-learning-20261110`. PR 29. This document records candidate verification, **not production deployment**. Root is the only implementation writer; bounded read-only reviewers supplied falsification checks.

## Observable behavior

- The first small learning group asks whether the current concept has been taught. School exposure is learner/family reported, keyed by school, semester and topic; no calendar, score or AI inference is presented as teacher confirmation. Untaught concepts may be skipped or explicitly previewed.
- Teaching explains the actual current item before practice. Numeric examples include counting, borrowing, decomposed multiplication/division, area and perimeter steps. The lesson uses a presentation clone; stored question IDs, answers and explanations are unchanged. Worked examples are absent from scope/answer payloads.
- Subsequent groups use prerequisites, independent answers, weaknesses and due review. Hints, shown answers, assisted correction and same-day retry do not prove mastery. A later unaided answer may qualify. Preview does not assert school exposure.
- Voyages, capture, battles and other risk-bearing challenge endpoints require both school-taught scope and independent ability evidence. Two distinct reviewed example families establish a concept. Capacity shortages lead back to learning, with no unreviewed filler.
- New equivalent numerical questions transfer only within reviewed generation signatures: exact pool/level, operation, operand/result digit shape, carry/borrow pattern, multiplication table and fraction denominator/numerator carry. Facts, vocabulary, geometry, papers, rephrases and division receive no such transfer. Known-wrong or assisted targets cannot bypass remediation.
- Captures prefer different items from the preceding voyage. Small banks may reuse independently mastered exact items from distinct families, rather than making captures impossible forever.
- Math island readiness remains per game. Its gentle practice teaches after errors, permits finishing all six questions, and retains the original four-correct completion/reward threshold. Zero-correct does not give free rewards. Genuine repeated completed sessions keep their original reward contract; replay of the same receipt remains idempotent. Boss/mock use only ready current-grade first-semester units.
- Old unanswered voyages stop their timer when protected. Explicit adaptation changes only the unanswered tail. Pending captures, answers, completed settlement rights, earned rewards and other account activity remain retained. Adults are excluded from the new child adaptive overlay.

## Three distinct preservation/eligibility contracts

1. **History retained:** existing question IDs/content, raw saves, seen/mastered records, answers, coins, tickets, stars, XP, inventory and receipts are preserved. Earned bits alone are not ability evidence. Offline import preserves history but cannot forge new adaptive authority.
2. **Voluntary low-risk review:** a trusted historical independent success, server-recorded exact-item review provenance or mapped learned/previewed topic can qualify. Publisher and actual subject book/English series evidence must still match. A historically correct item remains reviewable after a later wrong answer, including resumed old review sessions. Unmapped review never unlocks siblings or challenge readiness.
3. **Risk-bearing challenges:** only explicitly reviewed concept links, taught school scope and current independent evidence qualify; voluntary review alone is insufficient.

## Coverage and limitations

`src/adaptive-catalog.ts` maps foundational concepts for supported grades 1, 2, 4, 5 and 6, plus **20 reviewed grade 1/2 math paper intersections**. This does not claim every historical paper is instructionally mapped. Unmapped papers retain their history and may qualify for exact-item low-risk review when the independent and source evidence exists.

`coverage.json` contains each confirmed child's course-level baseline and candidate **synthetic upper bound**, assuming all exact items were independently solved and mapped school topics reported taught. It is not production child readiness. It separates paper counts, missing book/series evidence, unmapped challenge exclusions and cold-start capacity. Brownie English is excluded.

Many older four-grade paper records lack explicit source-book metadata. Those remain held instead of inventing a book claim; foundations remain available. Alan's 86 and Jay's 93 matching English paper items can potentially enter trusted exact-item review, but are not newly mapped for challenges. Non-English book numbering is subject-specific; English uses the actual Here We Go series/book or previously approved compatible-unit evidence. Unverified Yongchun/Hess series remain held.

## Executed checks

- `npm run build`: PASS. `capture-preservation/build.txt` contains content audit (6,764 static / 23,192 generated, zero findings), pronunciation, TypeScript and production bundles. Existing bundle-size warnings remain.
- Full unit run: **193 files / 1,683 tests PASS**, 39 DB-gated files / 375 tests skipped in this run. Raw `capture-preservation/full-unit.txt`; skipped cases are not claimed passed by this command.
- Full isolated PostgreSQL run: **41 suites / 380 tests PASS**. Final result is recorded in `capture-preservation/all-41-results.json`, each raw log and assertion result in `capture-preservation/cloud-per-file/`. The earlier 40-suite run remains in `expanded/` as ed248 candidate evidence. Each suite starts with a fresh zero-table DB on local port 5468 and drops it afterward. No production database was used.
- Six focused files: **60 tests PASS** (`expanded/refinement-unit.txt`), covering historical known-wrong review, import/assistance negatives, numerical transfer/carry boundaries, actual worked examples, readiness and capture.
- Final read-only falsification: bounded eligibility/transfer delta PASS, independently reran 57 tests; final worked-example delta PASS, independently reran 34 tests and reports checking 19,893 generated questions / 50,907 equations. `expanded/author-collected-review.md` is explicitly an author-collected transcript, not a raw independent artifact.
- Final Chromium 390×844 grade 1 / 375×812 grade 6 and WebKit 1024×768 grade 4: scope → teaching → answer → next lesson → rest/reload/resume PASS, zero page errors or horizontal overflow. Final screenshots and `expanded/browser/browser-results.json` cover the final worked-example build. These are engine tests, **not a new physical iPad test**.
- `preservation-check.json`: all 28,183 prior pronunciation phrases and existing character readings unchanged; question data files unchanged; zero SQL/schema migration. Exact old raw JSON/timestamps, historic question digests, reward ledgers and peers are also asserted in DB tests.

## Final earned-capture preservation correction

The independent ed248 probe found that an earned old island capture was permanently changed to unavailable/learning when preparation was insufficient. The original failed probe is preserved in `capture-preservation/ed248-independent-probe-results.json`. This is a real preservation defect, now corrected.

A pending same-monster entitlement and its original once-only attempt reservation now survive with `trial.deferred: true`, empty questions and empty answers. No unlearned internal question is assigned. Server projection provides a blocked/preparation state, direct old-client answer requests fail atomically, and new runs cannot overwrite the reservation. Empty catalogs still retain the entitlement. Once ready, `capture-adapt` fills exactly three eligible questions, clears deferred, and does not reroll the monster or issue rewards. Repeating adaptation of an already eligible trial is a no-op; existing answered prefixes remain intact. Explicit skip remains the only voluntary discard.

Final added checks cover legacy five-answer and six-answer unsettled islands, next-day completion, valid/invalid deferred schemas, empty catalogs, exact ledger/quota preservation, cross-device reload, direct answer/replacement denial, receipt concurrency and one card only. Focused root and read-only verifier runs each passed 36 tests; the verifier additionally checked partially answered legacy capture adaptation and cross-day completion in memory. The message transcript in `capture-preservation/author-collected-review.md` is not a raw independent artifact.

Final WebKit 1024×768 and Chromium 390×844 runs verified a visible preserved capture, no unlearned question/options, and the preparation action opening learning with no page errors (`capture-preservation/browser-results.json`). The prior three-viewport general learning workflow evidence remains applicable; the last code delta is limited to capture reservation/reader behavior.

The first new API fixture used a password outside the existing four-digit child contract and was corrected; its original failure is retained. Two repeat-island unit fixtures assumed no pending capture would survive. They now explicitly use the existing skip action before a genuine new round; original 4/6, 6/6 and no-duplicate-reward assertions remain. These initial failures are retained alongside the final PASS logs. `expanded/artifact-sha256.json` binds the historical ed248 snapshot; `capture-preservation/artifact-sha256.json` binds the latest evidence.

## Original failures and test contract changes

The initial nine-suite run failed 61 checks; raw evidence remains immutable at `expanded/initial-nine-suites.log`, SHA256 `e20f77756040fdabe2946ad82d2900d87133494f19f386c3d56d3ba9426df584`. `expanded/initial-failures.json` is the original inventory. `expanded/failure-dispositions.json` records each original assertion, classification, replacement contract and evidence.

Real reward regression in the first candidate was fixed in product code: original island completion rewards and new-session repeat rewards are retained. Other fixtures that previously assumed immediate access to unlearned exam questions now either explicitly prepare independent learning or assert protected learning first. Exact additive adaptive metadata is expected; old learning objects were not replaced with permissive partial matching. Twenty-one school API cases now test ten identities' cold start, exact preservation, actual school reporting and independent preparation, plus unauthorized routing; every-course transactions and pinned history remain in the all-child and four finals suites. These are intentional contract replacements, not a claim that unchanged old tests passed.

## Reproduction and release

`capture-preservation/run-cloud-isolated.py <suite-name>...` executes fresh DB suites. `expanded/browser-check.py` requires the fresh synthetic fixtures in `expanded/seed-browser.mjs` on local port 4398; never reuse/reset a child account to repeat it. Existing fixture names must be changed for a new isolated run.

Release through the official GitHub PR/main workflow after the coordinator's fresh production BEFORE snapshot and release gate. `expanded/railway-before.json` records main `a4d1e62` / successful deployment `be1df3fa-78e2-421a-8b58-399fa66688ca`. Post-deployment success requires the expected deployed commit, health checks and protected-ledger AFTER comparison, accounting for genuine concurrent child activity.

Persisted learning phases and the optional `CaptureTrial.deferred: true` representation with empty questions/answers extend the saved JSON schema. Deferred captures remain pending until prepared or explicitly skipped. Older binaries, including ed248ea, reject this representation; this is a persistence compatibility change even though there is no SQL migration. Roll back with a compatible forward fix, not an old validator or clearing child progress. A backup is for verified recovery, never overwriting later child activity. The pre-existing floating companion overlap is reserved for the separately requested next PR.

Production release and AFTER verification remain pending until recorded separately.


## Final progression correction after 66d92

The final reviewer found that completing gentle practice at 0/6 or 3/6 also set the existing `unit.play` pass flag. That flag drives the island's next-stage recommendation and unlock, so practice completion now uses `run.completed` alone; the original minimum 4/6 is still required to newly mark play passed. Existing `play:true` is never cleared. The only product delta after 66d92 is the ordering and guard in `src/island/server.ts`; rewards and preserved capture logic are unchanged.

`progression-final/` binds this last source version. Full unit run: 193 files / 1688 tests PASS (39 DB-gated files / 379 tests skipped in that run). Four affected fresh PostgreSQL suites: 40 tests PASS, including 0/3 scores, existing pass retention, command receipts and second-device login. The earlier 41-suite / 380-test run remains evidence for 66d92, not a claim that those 41 suites were rerun after this flag correction. Two browser engines verify the actual island recommendation remains 玩一玩 after 3/6 and the boss button is disabled.

Initial harness failures are retained: sandbox prohibited a local listen socket; a fourth PG suite name was mistyped; a UI selector failed because rendered low-grade text includes pronunciation. Final runs corrected those harness conditions without relaxing product assertions. Recovery hold patch and explicit runbook are prepared but not activated; 32 local HTTP cases reject all API traffic and preserve health, with zero cloud-service invocations. The compatible source and saved JSON readers stay in place, no database is restored.

This candidate remains undeployed until final independent gate and production BEFORE/AFTER binding by the integration owner. Historical manifests bind their original candidate snapshots; use `progression-final/artifact-sha256.json` for this final evidence set.
