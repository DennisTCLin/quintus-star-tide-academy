# Subject islands release — 2026-10-25

Runtime source: `416c82535568db37cecbee1084fb2694ae0fc656` on `codex/subject-islands-release`.
Baseline: `84223db` (runtime identical to `3d4b5e9`).

Five Higgsfield illustrated islands replace subject cards. Grades 1, 2 and 4 retain their existing courses. Ordinary new voyages freeze a server-derived elemental route and select a matching monster. Historical route-less voyages remain playable. Grade-one mathematics offers ordinary questions and the existing hands-on Math Island; the latter explicitly retains encounters across all elements.

Preserved contracts: family7 saves, continuous capture rewards, monster-based timed challenge tiers, existing accounts and progress. No production database edits or new image generation were needed for this release.

Validation:
- Production build passed.
- Full PostgreSQL-enabled suite: 73 files, 598 tests passed, zero skips.
- Independent read-only review passed; reviewer independently ran 49 targeted tests.
- Actual local app checked at desktop and narrow mobile widths; fire/tones starts a fire encounter and returning to harbor preserves the voyage.
- Island section had no clipping in the checked widths. Existing page-wide overflow at 320 px remains outside this change. Physical iPadOS 15.5 was not tested.

Deployment uses a clean git archive of the runtime source. Formal production verification is recorded in `outputs/subject-islands-release/deployment.json` after Railway reports success. If rollback is necessary, use the family7-compatible `3d4b5e9` baseline; do not restore a pre-family7 deployment.
