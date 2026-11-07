# Corrected-parent rebind verification

This candidate merges corrected PR22 `386bd57046ba8e12828afbeb6b0310774af680e0` (tree `aa2c492d522ba39c844e3da2a57d52d4753dcf87`) into the original PR23 `3213154d7a325781c7aafde6d1fc5e3e3c12d301`. Both original PR23 and PR22 `036cf381` are historical candidates, not release approvals. The new candidate has not been deployed.

The upstream correction keeps the same question ID/options/answer for `phase2-g2h-20003307-i-5` and restores the animal/long-nose context. `baseline-transition.json` records the sole changed question between old and corrected PR22. Preservation assertions therefore pin the corrected parent, without restoring the ambiguous prompt.

| Gate | Current evidence |
|---|---|
| Content binding | Original PR23 108 new objects and approvals are unchanged; 149 original semantic/source artifacts are byte-identical. The original 115-candidate disposition remains 108 new, six duplicates and one held. This is a rebind of unchanged reviewed content, not approval of every question in all 131 papers. |
| Corrected-parent preservation | All 6,521 complete existing static question objects and approvals, and all 23,192 generated objects remain unchanged relative to exact Git `386bd570`. All 108 new IDs are indexed; static total 6,629. No save/account/reward/adult/server runtime diff. |
| Independent baseline | `fixtures/base-provenance.json`, archived Git source and independently reproduced bundles establish the corrected-parent fixture source. All eight fixtures reproduce from that source; both array and prefix representations restore complete families unchanged. |
| Dictionary | Structured union retains all readings from corrected PR22 and original PR23. Packed/readable equality passes. Both long-nose contexts read 長 as ㄔㄤˊ; 441 reviewed pronunciation contexts pass. |
| Build | Audit, pronunciation, TypeScript, Vite and both server bundles pass; 6,629 static / 23,192 generated / 42 pools. `evidence/build.log.gz`, `content-audit.json`. |
| Targeted | Two files, 31 tests pass. `evidence/targeted.log.gz`. |
| Ordinary suite | 1,577 pass, 296 conditional database tests skipped, zero failure. `evidence/general.json` and log. |
| PostgreSQL | All 31 conditional test files run against distinct freshly created local synthetic databases, each with zero public tables before execution: 300 pass. `evidence/cloud-per-file/results.json` and all per-file raw reports/logs. No formal database was accessed. |
| Exact skip coverage | Every ordinary skip matches a PostgreSQL pass by repository-relative file, exact full name and occurrence ordinal. 296 covered, four already-passing overlaps, zero uncovered; 1,873 unique tests pass. `evidence/skip-pg-coverage.json`. |
| Synthetic UI | CUA IAB Chromium, 375×812, eight lanes across grades 1/2/5/6. Every lane reaches question 2 after the first correct answer and resumes at index 1 after reload through the harbor. Raw API commands alone do not distinguish automatic from manually requested advancement; the browser action transcript records the performed interactions. API evidence shows exactly one answer and one advance, +10 coins once (1,234→1,244). All eight have no horizontal overflow, missing images or captured warning/error. `evidence/browser/` stores snapshots, ten screenshots (eight before, two reload), metrics and raw API commands. The synthetic harness injects the reviewed first question and removes challenge state; fresh-PG API tests separately cover normal allocation and persistence. |
| Harness correction | The first grade-two-pairs wait assumed six questions, but this fixture has four. The UI had correctly reached question 2/4. The wait was corrected and reload verified; no application code changed. The failed assumption is retained in the evidence. |
| Formal release | Pending actual-main integration, coordinated new formal BEFORE/AFTER preservation check and deployment verification. Neither the synthetic fixtures nor earlier release snapshots substitute for that gate. |

No English or grade-three questions are introduced. Brownie English remains excluded. No real child profile, progress, rewards, answer history or production data was reset or edited. No physical iPad Safari or actual audio playback claim is made by this verification.

`evidence/artifact-index.json` lists exact hashes and sizes. Logs are losslessly gzip-compressed. To reproduce, build first, then run the ordinary suite without a database URL; execute `run-cloud-isolated.py` with a dedicated local PostgreSQL role/port and then `make-coverage.py`. Recreate UI using `qa-server.mjs` at `output/finals131-phase3/` from the repository root; its relative imports assume that location and it provides only synthetic memory fixtures at ports 44001–44008.
