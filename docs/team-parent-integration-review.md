# Team picker and parent report integration — 2026-10-25

## Release scope

Baseline main `7f6625a`. Integrated candidate `c9d25e3` combines the picture-first team picker (`e4905ba`, integrated as `c9d25e3`) and child-account report identity repair (`2a1fc2b`). Final runtime `1c7d0c792fba1756a1a9b4ea6bf99f8956ba6510` additionally suppresses the floating companion on the battle page after visual review found it covering the mobile Start button and tablet card footer.

The picker retains readable names, rarity, level, element and selected status, removes phonetic annotations in the preparation controls, and uses two columns on phones. Selection, equal-size local two-player teams and the existing three-member limit are preserved. Parent progress and adaptive reports use the logged-in child's display name and account-specific avatar instead of interpreting grade-profile slots as distinct children. No server, database schema, learning, rewards or battle rules changed.

## Verification

- Publisher's full integrated suite: **98 files / 739 tests PASS**, plus build and pronunciation checks. Raw results: `output/playwright/player-identity-review/tests.txt` and `build.txt`.
- Independent root WebKit run on `c9d25e3`: **53 checks PASS** against the complete App and actual local QA API. Three synthetic child accounts (Alan, Quintus and grade-two Feifei) on both iPhone 13 and iPad gen7 contexts cover report identity/photo/profile values, one-child report scope, 320/390/768/1024 widths, loaded images, readable labels, no picker ruby, add/remove/max-three, two-player matching sizes, actual local battle entry and unchanged complete family payloads. See `outputs/team-parent-integration/baseline-verification.json` and `browser-tests.txt`.
- Visual review found the pre-existing floating companion covered preparation controls. The final patch changes only the battle-page suppression condition. Other page behavior and the tested report rendering are unchanged.
- Final focused WebKit run on `1c7d0c7`: **22 checks PASS**, including exact local-server entry asset hashes, both device contexts and all four widths, touch selection, Space/Enter activation, absence of the overlay, team-size rules, battle entry and unchanged learning/resources. Zero application JavaScript exceptions. See `verification.json` and `setup-checks.txt` in the same evidence directory.
- Root final production build: **PASS**. Independent read-only verifier examined the exact source diff, both raw browser results and screenshots, and returned **PASS with no release blocker**.

The temporary credential manifest is outside the repository. Tests use only the isolated local synthetic-account fixture and do not modify production accounts. QA screenshots are retained locally; this evidence commit contains scripts and structured/text results only.

## Limits and publication

Device checks use WebKit emulation with reduced motion; physical iPhone/iPad hardware was unavailable. The legacy family-account branch was source-reviewed but not exercised through a family-account login; the changed child-account flows were exercised through real local sessions. Existing family-account rows remain intact except the corrected Quintus label.

Published successfully to GitHub `main` and production. Deployed source: `aaadaeafc07892f91b074353064e57c7aa96758f` (runtime unchanged from `1c7d0c7`; intervening commits add verification evidence only). Railway deployment: `e5eea48c-d2a6-4694-9190-9bac16812b89`, status **SUCCESS**, independently confirmed by the picker author through read-only Railway status.

Root production acceptance: **14 checks PASS**. `/healthz` reports healthy, all four HTML entry asset references match the tested build, and every built JavaScript/CSS file has the same SHA-256 hash as the local verified build. Production entry is `/assets/index.v-CfKRzeW7.js`. See `outputs/team-parent-integration/production-verification.json`. Production acceptance made no account access or data changes. The picker author independently verified the four public entry assets byte-for-byte as well.

The final follow-up commit records only these production results; no redeployment is needed for documentation/evidence. The preceding runtime can be redeployed if rollback is needed; no data migration is involved.
