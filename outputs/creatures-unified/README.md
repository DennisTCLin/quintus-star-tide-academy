# Unified heroic creature portraits

This refresh replaces the static full-size portraits and thumbnails of 275 existing identities. Together with the previously approved 100, the collectible roster remains 375 (185 companions and 190 monsters). All identity, ordering, rarity, skill, combat, acquisition and save data are preserved. Existing animation/video and GLB assets are intentionally retained and are not restyled by this release.

Generation: Higgsfield GPT Image 2.5, approved heroic reference, 55 five-character sheets plus 19 review replacements. Quoted cost: 74 credits total, not a billing statement. `jobs.json` and `all-results.json` retain submitted jobs; `rework-map.json` selects reviewed replacements. `results.json` contains exactly 55 selected sheets. Sources are reproducibly downloadable but ignored in Git.

Reproduction from the repository root:

1. `python3 scripts/select-creatures-unified.py`
2. `python3 scripts/download-creatures-unified.py`
3. `NODE_PATH=<sharp-package-parent> node scripts/pack-creatures-unified.cjs`
4. `python3 scripts/catalog-creatures-unified.py`
5. `python3 scripts/gallery-creatures-unified.py`
6. `NODE_PATH=<sharp-package-parent> node scripts/verify-creatures-unified.cjs`

`assets.json` records source jobs, crop bounds and SHA-256 of every 640px / 320px transparent WebP. Image URLs include a content hash. `index.html` previews the full roster. Baseline catalog data was exported from aeb667c; later conquest enrollment/navigation changes from 192e1af are preserved.

Validation evidence is recorded in asset-verification.json and output/playwright/creatures-unified/. The full Vitest suite and production build are run before publication. Database-backed suites require a dedicated test database and are not run against student data. Production verification is read-only: health, anonymous authorization boundary, deployed HTML/bundles and all 550 new assets.

Rollback: revert the art lookup/catalog hooks to restore the previous static paths; all previous assets and game data are retained.

Final local checks (2026-11-03):

- PASS: full Vitest suite, 1,036 tests; 213 database-dependent tests skipped.
- PASS: after the final crop correction, 9 targeted catalog/save/art tests rerun.
- PASS: production build (TypeScript, content audit, pronunciation checks, Vite, server bundle).
- PASS: 550 distinct 640px/320px files decoded; manifest hashes, transparency and cache keys verified.
- PASS: read-only independent review of catalog identity/order and static-art consumers. Crop findings fixed for beluga, nautilus and drumlizard; mistumbrella's full tendrils retained, then all eight affected output files rechecked against original source sheets.

The last crop fixes use source-specific transparent gaps rather than the nominal grid. IDs, stats, skills and save structures do not change. The browser harness uses synthetic state and reduced-motion mode to verify static portraits without changing real player progress.

- PASS: final WebKit browser pass, 757 checks: 190 monster detail dialogs, 185 companion skills, mobile/iPad containment and all 750 full/thumbnail image decodes. A concurrent-build HMR reload interrupted an earlier run; this final run passed after the build completed.

Production PASS: PR #26 merged; runtime `192e1af1bd9e7f6e8d29228e663b92ffbfb667ee`, Railway deployment `0ebb9856-b524-4ef1-bac7-0a805a239d0e` SUCCESS. Public HTML matches the validated build; 564 files (all 550 new portraits/thumbnails plus compiled JS/CSS) match local SHA-256. Health is OK; anonymous state returns 401. Existing 1,516 assets were restored and hash-verified during the build. See `production.json` and `stage.json`.
