# Fifty monsters and tier-based rarity selection

Adds monsters031–080: lantern moths, newts, pangolins, mushroom sprites and seahorse drakes. Each family has five elements and two earned-training stages. Existing030 monster records remain identical; new companion catalog numbers136–185 avoid the existing wave-two range086–135. New species participate in elemental voyages, Math Island, capture, collection, equipment, skills, training, arena and territory through the shared catalog. Monsters remain adventure recruits, separate from ticket draws and coin purchases.

Permanent ticket draws now select rarity, then uniformly select a species in that tier, excluding the player's starter. Rates: E50%, D28%, C12%, B6%, A2.6%, S1%, SS0.3%, SSS0.1%. Previously all104 eligible species were equally likely, making S7.6923% and S-or-higher15.3846%. New S-or-higher total1.4%. Onboarding remains E80/D20; shop prices and existing ownership are unchanged. There is no pity guarantee. Server crypto RNG supplies both independent rolls; the public table and draw engine use shared basis-point constants. Adding species does not inflate a tier's chance.

Wild encounters select an eligible tier before its species: scout E60/D30/C10 and warden B75/A24/S1. The selected element and previous-family exclusion are applied first. In the current80-species catalog, S is at most1% for every eligible route and preceding-family combination (zero when exclusion removes the only S species). Conditional on a qualifying completed voyage, S capture is2%, down from6%; other current monster tiers keep their original capture rates. Future SS/SSS capture defaults are1%/0.5%; no such wild species are added here.

New capture receipts have version2. Both family and Math Island readers retain the immutable unversioned historical rate table, so settled S6% receipts still load and never reroll. Active unfinished runs use current rates when settled. Existing XP, cards, combat snapshots and legacy numeric encounters remain intact. No production data migration is performed.

## Art and loading

Ten GPT Image2.5 / Higgsfield sheets provide50 independent generated designs, with true alpha and inspected crop boundaries. Full sprites640px; new320px thumbnails serve card and island previews. Bestiary paginates12 species; each island keeps three representative portraits and an expandable16-species list. Full artwork loads on detail opening. New animations/videos are not part of this asset batch; existing animation and safe-mode behavior remain in place.

`monster-expansion-generations.json` records prompts and job IDs; `monster-expansion-provenance.json` records file hashes and byte budgets. Local original sheets live under `outputs/monster-expansion/sources/`; use `scripts/pack-monster-expansion.cjs` with Sharp to repack. Ten successful submissions at quoted1 credit each; two429 submissions produced no job and were retried successfully. Actual billing was not exposed by the API.

## Verification

- TypeScript/client/server build and Taiwan pronunciation checks: PASS.
- Unit and PostgreSQL suite: initial sharedDB run695PASS; dragon-cloud setup hit shared auth-IP limiter429 before its six tests. Isolated cleanDB rerun6PASS. Final cleanDB run excluding that isolated suite:91files/695testsPASS; isolated dragon suite:1file/6testsPASS (701total, no remaining skipped tests). A stale three-family regex in cloud.test.mjs was updated to assert catalog membership, family, scout form and metal route, then the complete91-suite group reran successfully. No production data used.
- New tests cover all50 full voyage/capture/reload paths, duplicate settlement, every skill, distinct IDs/numbers, tier boundary counts, displayed odds, legacy/current S receipts in both save readers, malformed versions and asset hashes.
- Independent read-only verification: original30 records identical, every eligible species reachable, S≤1% across108 stage/element/previous-family combinations, no previous-family repeats or wrong biome; focused57 testsPASS.
- WebKit browser fixtures:1024×768 safe mode,390px mobile and320px grade-two ruby,12-card pages,7-page boundaries, family/S filters, new art decoding, native stats/skills,2% S capture disclosure and1%/0.3%/0.1% ticket table. No horizontal overflow. This is browser-engine/viewport coverage, not a physical iPad certification.

Rollback must preserve catalog IDs and version2 capture readers after players acquire new monsters. Prefer a forward fix or disable new encounters while retaining the catalog/readers; do not deploy an older server that rejects new-owned cards or capture receipts.
