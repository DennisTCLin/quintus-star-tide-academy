# Automatic Dark Tide raids

The production Node server starts a background worker at startup, then checks every 30 seconds after each completed cycle. No browser, session, presence heartbeat or HTTP request triggers settlement. `CONQUEST_NPC_RAIDS=off` disables the worker after restart; production otherwise enables it. Keep Railway application sleeping disabled. The process and PostgreSQL must be available for scheduled execution.

A player must be enrolled and own an island for at least 10 minutes. The first raid also waits 10 minutes after enrollment. Subsequent raids wait at least six hours after the previous settlement. Active shields and battle cooldowns defer attacks. Each eligible player receives at most one raid per cycle. Server downtime does not stack retroactive attacks: one overdue wave settles on recovery, and the next six-hour interval starts at that settlement. Players being offline does not pause the running server worker.

The worker takes the same PostgreSQL world transaction lock as PvP, healing and roster synchronization. It reads committed collection XP for each owner, preserves the current HP ratio and normal elapsed recovery, and atomically writes wounds, resources, ownership, cooldown, raid progress and the report. It never writes learning/collection XP or ownership. Multiple replicas/restarts see persisted wave progress after acquiring that lock. A failed transaction changes none of these records and the worker retries on its next cycle. Shutdown stops scheduling and awaits the in-flight transaction before closing the pool.

Loss is capped at five herbs and two spring; energy, territory, learning and collection progress remain. The latest 30 private reports contain scheduled/actual times, season, wave, island, outcome, supply losses and both armies before/after. They survive reconnect, restart and season rollover. Reading reports does not settle anything. The API rejects legacy `defend` commands. No HTTP endpoint exposes the worker tick.

## Verification

Use an isolated PostgreSQL database: tests truncate conquest tables. Do not run against production or concurrently with another suite sharing that database.

```sh
createdb star_tide_automatic_npc_test
npm run build:server
TEST_DATABASE_URL=postgresql://localhost/star_tide_automatic_npc_test npx vitest run src/__tests__/conquest-npc-automatic.test.mjs src/__tests__/conquest-npc-worker.test.mjs src/__tests__/conquest-enemy.test.ts src/__tests__/conquest-shared.test.mjs --maxWorkers=1
npm run build
```

The automatic DB suite seeds owners without sessions, starts real background workers without a listening HTTP server for those workers, then observes PostgreSQL directly before logging in. It covers owner-specific committed XP/HP, private immutable reports on login/read, competing replicas, restart/next wave, transaction-failure rollback/retry and protected islands. Timer unit tests cover no overlap, retry and graceful shutdown. Pure tests cover bounded report retention and season persistence.

## Operations and rollback

`conquest_npc_clock` is additive. Query `SELECT * FROM conquest_npc_clock WHERE id='global'` to verify `last_tick_at` advances without traffic; `last_raid_at` only changes on a committed raid. A healthy idle world still updates the tick clock. Inspect private report count and timestamps only for a designated QA account; do not expose all players' reports publicly.

To pause attacks, set `CONQUEST_NPC_RAIDS=off` and restart/redeploy the same application. Existing reports remain readable. Re-enable by removing the override and restarting. To roll back code, redeploy the previous integrated release; the additive table and JSON fields may remain. Do not restore an old database snapshot, delete reports, or reset injuries. The shared-world writer owns the single production integration/deployment; this feature branch must not deploy over it.

## Countdown and unread reports

The home conquest card and raid panel show the next wave's earliest eligible time, updating each second against the server clock offset. Per-island eligibility includes enrollment/capture grace, the previous settlement's six-hour interval, battle cooldown and shields evaluated at the future eligible time. The earliest owned-island time wins. With no territory there is no countdown; when due, the UI says it is waiting for server attack. The timer does not settle combat. Disconnection hides the stale countdown until synchronization resumes.

After login, an unread notice appears outside learning and conquest views with retained unread count, defended/raided waves and total supply loss. Its action opens and focuses the raid reports. Reports have individual unread badges and explicit individual/bulk mark-read controls. Simply loading a page or expanding the list does not mark reports read. All unread reports are described as unread, not necessarily offline-only events.

`POST /api/conquest/reports/read` takes authenticated `player` and 1–30 exact `reportIds`, with normal origin/CSRF checks. Session then world locks serialize metadata updates with NPC settlement. Only the owner's retained IDs are unioned into optional private `raidReadIds`; unknown/pruned IDs are ignored. The operation updates that JSON field only, does not load/roll over the world or alter combat/revision/XP, and needs no combat command receipt. Retries and two-device acknowledgments are idempotent. A report arriving during acknowledgment remains unread unless its exact ID was submitted. IDs are retained across seasons and pruned with the latest 30 reports.

The client uses a short request gate and scope/sequence checks, without creating an uncertain combat command for a lost acknowledgment. Read state updates after server confirmation and is refreshed on polling/reconnect. A failed acknowledgment retains the unread UI and can safely be retried; old account responses cannot expose reports to the next account.

Additional checks: `conquest-raid-notifications.test.ts` covers future shields, grace/battle boundaries, no territory, due formatting, exact-ID acknowledgment, retention and season persistence. `conquest-npc-automatic.test.mjs` also verifies owner/CSRF scope, concurrent arrivals, two-device union and no world/combat writes including at a historical season boundary. Actual-app browser QA at 390/1440 px covers countdown ticks, final report-heading focus, failed acknowledgment, no pending combat command, two-device polling, reload and other-account isolation.
