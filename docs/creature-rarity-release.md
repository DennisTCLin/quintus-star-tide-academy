# Native rarity strength and 50 exterior proposals

## Behavior

Base levels: E 1, D 5, C 10, B 15, A 20, S 30, SS 40, SSS 50.
Effective level is base level + earned training level − 1. Existing XP is never rewritten. Native HP/ATK/DEF is 100+12r / 22+3r / 8+2r (r=0..7), plus 8/2/1 per earned level. Zero-XP SSS is Lv.50, HP184, ATK43, DEF22; 50 earned XP raises it to Lv.51.

Castle, monster forms, and training skills still use earned practice. New CPU battles match nearby native strength and equivalent training. PvP retains actual stats. Existing six-question completion and three-mistake defeat rules are unchanged.

## Persistence and rollout

V1 combat formulas and snapshots remain immutable. New voyages use V2 and compute each side's own rarity level independently. `encounter.level` remains the frozen training level, not a display level. The client and `build/game.mjs` must deploy together. **After V2 saves exist, rollback must preserve the V2 reader; never deploy the prior V1-only server or restore an older family save.** A repair should be a forward patch with V1/V2 readers retained.

No production data edits or XP migration are required. Capture probabilities, draw roster, prices, reward caps, and player ownership are unchanged. The earlier unaccepted companion-animation pilot is excluded.

## Art review

`/creature-design-review/index.html`: 50 Higgsfield proposals, 25 companions +25 monsters. They are not live roster entries. 12 thumbnails per page; full image loads only on demand. Filter, pagination, dialog arrow keys, Escape, and focus restoration supported. 100 WebP assets decode successfully; package about12 MB, thumbs about1.7 MB across all50 (not fetched all at once).

55 successful generation submissions × quoted1.5 credits =82.5 credits; approved ceiling90. Five outputs rejected (three anatomy/reference problems, two background problems). Confirmed429 submissions without job IDs were retried; they are not counted as completed paid jobs. Actual billing not exposed by API. Raw provenance and quotes remain in local `outputs/creature-redesign/`; compact provenance accompanies this release.

## Verification

- `npm run build`: PASS, including pronunciation dictionary checks, TypeScript, client and server bundle.
- `TEST_DATABASE_URL=postgresql://127.0.0.1:55432/star_tide_rarity_verify_20261025 npx vitest run --no-file-parallelism`:65 files /538 tests PASS,0 skipped.
- Initial parallel suite hit PostgreSQL concurrent schema initialization conflicts; serial mode is required for these suites sharing one test DB. No production DB involved.
- Native tests cover all64 rarity pairings across6 training levels, XP boundaries, tampered snapshots, V1/V2 round trips, castle gates, CPU matching, draw pool preservation, and six-question/three-error rules.
- Fresh read-only verifier independently completed rare SSS V1/V2 voyages with serialization after each answer; snapshots remained fixed, XP125→185.
- Browser: SSS cards#050/#135 Lv.50; detail184/43/22; E retained earnedLv.2; grade2 ruby correct for new origin text. 390px detail and320px gallery have no document horizontal overflow. Gallery all50,25/25 filters, page boundaries, full image, keyboard next/Escape/focus return checked.
- Existing detail-card vertical auto margins moved the image below the first screen when the adjacent text was long; changed to `margin:0 auto` and verified aligned card/stat tops.
- Actual iPadOS15.5 device performance and child comprehension: not measured. Local browser testing is not a physical-iPad certification.

## Publication

Prepared on `codex/creature-rarity-redesign`, base824f6c2. Hand off to coordinated publisher, preserving newer Math Island replay fixes. Do not deploy a competing older source snapshot.
