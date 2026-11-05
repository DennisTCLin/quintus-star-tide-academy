# Shared five-element conquest

The production conquest entry uses one server-owned seasonal world shared by all authenticated players. Unoccupied islands have wild guards; player-held islands can be captured when adjacency, energy, deployment and shield checks permit. Offline players are defended by their garrison.

## Launch and seasons

The shared world starts separately from the old browser-only PvE saves. Each participant starts with 50 energy and no territory, selects one alliance/hero, and can deploy collection companions plus eligible alliance loans. Existing collection/XP and localStorage archives are not imported or overwritten. Each Taipei calendar month creates the same 91 islands for every player. Monthly reset clears territory/energy/shields while keeping enrollment, injuries, supplies and materials.

The five island elements are balanced 18/19 each using a separate deterministic stream. Legacy geography, facilities, wild identities and shrine elements are preserved. Matching individual defenders deal +5% damage; matching shrine defenders deal a total +10%. This includes wild defenders and drills. Attacker majority counters, raw claim costs and ranking calculations remain separate.

The current light/night alliance roster, fourteen heroes and Dark Tide NPC raids remain available. A background worker automatically settles raids, including while everyone is offline. The same shared world lock and durable wave progress prevent repeated damage or supply loss; legacy manual defend commands are rejected. See automatic-npc-raids.md for timing, private reports and operations. NPC raids do not replace player-versus-player conquest.

Captures are vulnerable for one hour, then shielded for 24 hours. A committed battle marks the island as in combat for 20 seconds; duplicate attacks and garrison changes on that island are blocked during this period. The server settles the actual result atomically before the client plays the animation.

## Authority and identity

`conquest_players` has a unique `(account_id, player_id)` pair and an unrelated public UUID. Reused family profile slots and same-species companions cannot collide across owners. Only the viewer's private energy, inventory and unit ledger are returned; other players expose public names/avatars, alliance/hero, deployed guards and ranking totals.

The server reads each owner's collection/XP from their own `game_states` profile. Collection level changes preserve current HP ratio, including KO, and apply to offline garrisons. Ineligible traded-away guards are withdrawn. Normal elapsed recovery remains separate. Learning answer rewards and collection/trade synchronization commit in the same transaction as the authenticated learning command. Neither battle payloads nor local saves can supply levels, HP, XP, energy or results.

All mutations use the order account/session locks → own learning row when applicable → global conquest advisory lock. World holders read other learning rows without locking them. World time is sampled after locking and clamped to the stored timestamp. Optimistic revision checks reject stale commands. UUID command receipts make lost-response retries idempotent and preserve the original outcome. Receipts are retained for 30 days; expired commands still cannot replay because season/revision checks are monotonic.

The client polls every five seconds and on focus/reconnect. Offline and uncertain commands block new mutations; retry reuses the original command identity. Browser archives are downloadable separately and cannot overwrite the shared world.

## Verification and rollback

Run `npm run build:server`, then the shared integration suite against an isolated PostgreSQL database:

```
TEST_DATABASE_URL=postgresql://localhost/<isolated_database> npx vitest run src/__tests__/conquest-shared.test.mjs --maxWorkers=1
```

That suite truncates conquest tables in the selected test database. Never point it at development or production data. It covers distinct identities, authorization, concurrent capture, retry receipts, defender wounds, shields, offline recovery, owner-specific consecutive growth, real learning XP synchronization, trading versus PvP, and monotonic season clocks. Browser validation uses two isolated real accounts with no mocked conquest API.

A runtime rollback must leave the new PostgreSQL tables intact. Do not restore old browser saves into shared territory. The older runtime can read its existing browser archives; returning to the shared runtime resumes the database world.
