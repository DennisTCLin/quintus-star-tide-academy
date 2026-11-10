# Child adaptive learning — candidate verification

Base: `a4d1e62a20286d62fa555d4d8b1a73a31f0d24e8`. Branch: `codex/adaptive-child-learning-20261110`. This evidence does **not** claim production deployment.

## Behavior and boundaries

- Add school exposure per current school / 115-1 / teaching topic. Exposure is explicitly learner/family reported, never inferred from dates or scores and never presented as teacher verification.
- Start with a small low-stakes learning group. Unknown scope asks once; not-yet-taught content may be skipped or deliberately previewed. Prerequisites and actual independent answers guide subsequent groups; dated due items and weaknesses receive priority.
- Teaching explains the actual item. Shown answers, hints and same-day correction never become independent mastery. A later unaided attempt can qualify. Preview alone never asserts school exposure.
- Paid/risk-bearing voyage, capture, assist/battle and practice endpoints select only school-taught, mapped, independently learned content. A concept needs two distinct independent examples. Missing capacity routes back to preparation, with no unknown-bank filler.
- Capture prefers different items from the preceding voyage. Small mastered banks can reuse previously answered items, but all three must remain independently mastered, school-taught, and from distinct source families. This prevents permanently unavailable captures in small courses.
- Math island tracks independent per-game readiness separately. Its non-penalizing practice teaches after errors; boss/mock require school exposure and readiness. Mock draws only ready units in the current first semester. Two-item concepts have attainable two-item readiness.
- Old unanswered voyages stop their timer when blocked. Explicit adaptation replaces only the unanswered tail. Old pending capture attempts/answers are retained. Old island work can become protected practice; already-submitted complete answer sets retain their earned settlement.
- Historical question IDs, answer data, rewards, inventories and records are retained. `mastered` bits alone do not certify ability. Untrusted offline imports retain history but cannot forge adaptive authority. Adult English paths remain separate.

## Catalog coverage limitation

`src/adaptive-catalog.ts` contains explicit foundational concept links for all currently supported grades/courses (1, 2, 4, 5, 6), plus 20 already-reviewed first-semester math paper intersections. It does **not** claim that every historical paper has been mapped to instructional concepts. Unmapped papers remain stored with their original IDs/history and are withheld from adaptive assessment. No new unreviewed paper catalog is included.

## Checks

- `npm run build`: PASS. Existing Vite bundle-size warning remains; `build.txt` includes content audit (6,764 static questions, 23,192 generated variants, zero findings), pronunciation checks, TypeScript and production bundling.
- Full no-database suite: 190 files / 1,663 tests PASS; 38 database-gated files / 372 tests skipped in that run, not claimed as passed. See `full-unit-tests.txt`.
- Focused unit + isolated PostgreSQL integration: 7 files, 74 tests PASS; see `targeted-tests.txt`. Covers scope, preview, actual-item exposure, same-day anti-memorization, old reward settlement, timers, capture capacity, island readiness, idempotency, stale clients, two sessions, imported evidence and 15 adult shared-game regressions.
- Independent read-only falsification: final critical gate PASS; additional bounded capacity delta PASS, 44 focused tests independently rerun. Earlier counterexamples became regression tests.
- Chromium 390×844 grade 1 / 375×812 grade 6 and WebKit 1024×768 grade 4: actual teaching → choices → next teaching → rest/reload/resume PASS, zero page errors or horizontal overflow; see `browser-results.json` and images. These are browser-engine tests, **not a new physical iPad test**.
- Existing pronunciation phrase readings: zero changes; see `preservation-check.json`.
- Runtime QA uses only `adaptive_child_20261110` on local port 5468. No production child accounts or ledgers were used for testing.

## Reproduction

Use an isolated PostgreSQL database. Run `npm run build`, then `TEST_DATABASE_URL=... npm test -- --maxWorkers=1` for selected database suites. The full unrelated database suite was not run. The 7 named suites in `targeted-tests.txt` are the executed integration selection. The no-database full unit run is recorded separately in `full-unit-tests.txt`.

The captured `browser-check.py` documents the exact UI run. It needs the synthetic grade 1/4/6 accounts and onboarding setup described by the corresponding cloud tests, served on local port 4398. It is stateful (the recorded run started at item 1); use a fresh isolated fixture for repetition. The initially saved grade 1 teaching image predates the capacity-only selector refinement; visual behavior is unchanged, while final selection behavior is covered by the final tests.

## Release and rollback

Coordinate with the existing integration owner, recheck main and Railway deployment, and use the official GitHub PR flow. Take the normal production preservation snapshot before promotion and compare the protected ledgers afterward. No database/schema switch or account migration is required.

This adds persisted `learn` study phases and island readiness. Once written, the old binary does not understand those new study phases. Roll back with a compatible forward fix; do not blindly run an old validator or delete child progress. A pre-release database backup is for verified recovery, never for overwriting subsequent child activity.

Production rollout and post-deployment verification remain pending at candidate creation.
