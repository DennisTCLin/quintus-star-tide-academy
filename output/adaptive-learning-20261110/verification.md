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

- `npm run build`: PASS. `expanded/final-build.txt` contains content audit (6,764 static / 23,192 generated, zero findings), pronunciation, TypeScript and production bundles. Existing bundle-size warnings remain.
- Full unit run: **193 files / 1,679 tests PASS**, 38 DB-gated files / 372 tests skipped in this run. Raw `expanded/final-unit.txt`; skipped cases are not claimed passed by this command.
- Full isolated PostgreSQL run: **40 suites / 377 tests**. Final result is recorded in `expanded/all-40-results.json`, each raw log and assertion result in `expanded/cloud-per-file/`. Each suite starts with a fresh zero-table DB on local port 5468 and drops it afterward. No production database was used.
- Six focused files: **60 tests PASS** (`expanded/refinement-unit.txt`), covering historical known-wrong review, import/assistance negatives, numerical transfer/carry boundaries, actual worked examples, readiness and capture.
- Final read-only falsification: bounded eligibility/transfer delta PASS, independently reran 57 tests; final worked-example delta PASS, independently reran 34 tests and reports checking 19,893 generated questions / 50,907 equations. `expanded/author-collected-review.md` is explicitly an author-collected transcript, not a raw independent artifact.
- Final Chromium 390×844 grade 1 / 375×812 grade 6 and WebKit 1024×768 grade 4: scope → teaching → answer → next lesson → rest/reload/resume PASS, zero page errors or horizontal overflow. Final screenshots and `expanded/browser/browser-results.json` cover the final worked-example build. These are engine tests, **not a new physical iPad test**.
- `preservation-check.json`: all 28,183 prior pronunciation phrases and existing character readings unchanged; question data files unchanged; zero SQL/schema migration. Exact old raw JSON/timestamps, historic question digests, reward ledgers and peers are also asserted in DB tests.

## Original failures and test contract changes

The initial nine-suite run failed 61 checks; raw evidence remains immutable at `expanded/initial-nine-suites.log`, SHA256 `e20f77756040fdabe2946ad82d2900d87133494f19f386c3d56d3ba9426df584`. `expanded/initial-failures.json` is the original inventory. `expanded/failure-dispositions.json` records each original assertion, classification, replacement contract and evidence.

Real reward regression in the first candidate was fixed in product code: original island completion rewards and new-session repeat rewards are retained. Other fixtures that previously assumed immediate access to unlearned exam questions now either explicitly prepare independent learning or assert protected learning first. Exact additive adaptive metadata is expected; old learning objects were not replaced with permissive partial matching. Twenty-one school API cases now test ten identities' cold start, exact preservation, actual school reporting and independent preparation, plus unauthorized routing; every-course transactions and pinned history remain in the all-child and four finals suites. These are intentional contract replacements, not a claim that unchanged old tests passed.

## Reproduction and release

`expanded/run-cloud-isolated.py <suite-name>...` executes fresh DB suites. `expanded/browser-check.py` requires the fresh synthetic fixtures in `expanded/seed-browser.mjs` on local port 4398; never reuse/reset a child account to repeat it. Existing fixture names must be changed for a new isolated run.

Release through the official GitHub PR/main workflow after the coordinator's fresh production BEFORE snapshot and release gate. `expanded/railway-before.json` records main `a4d1e62` / successful deployment `be1df3fa-78e2-421a-8b58-399fa66688ca`. Post-deployment success requires the expected deployed commit, health checks and protected-ledger AFTER comparison, accounting for genuine concurrent child activity.

Persisted learning phases are additive but older binaries do not understand every new phase. Roll back with a compatible forward fix, not an old validator or clearing child progress. A backup is for verified recovery, never overwriting later child activity. The pre-existing floating companion overlap is reserved for the separately requested next PR.

Production release and AFTER verification remain pending until recorded separately.
