# Friend activity and online sparring

Friends now open in a native modal dialog bounded to the viewport. A friend row opens their current allowlisted activity and invitation action. Presence retains the existing 10-second heartbeat, 35-second server lease and 25-second client freshness rule; hidden/offline/stale sessions never advertise a current activity. It shares no question, score, free text, location or private profile content.

Online sparring is separate from existing same-device duo battles. Each participant selects one owned companion; saved native level/stats are read on acceptance. The server chooses the first turn, runs the existing combat engine, and commits each move with a revision and command receipt. Requests never carry trusted battle state or stats. Friend targeting uses member UUIDs rather than reused player slots. Explicit friendship, authenticated ownership, CSRF and origin checks apply. One active invitation/match per participant, 30-second invitation cooldown, 90-second invitation expiry, and 120-second turn deadlines bound abandoned sessions. Cancel, decline, concede, expiry and acknowledgement are distinct states. A lost response can be retried with the same command ID without another move. Reloads resume the persisted room; no learning progress, currency, tickets or experience is modified.

State polling runs every three seconds while visible. Incoming invitations appear in a sticky notification; they do not forcibly open a dialog. Accepting opens a server-owned one-on-one battle with the existing animation and reduced-motion renderer. Native dialog focus containment/Escape and scroll limits prevent the old left-anchored popup from widening mobile pages.

Database changes are additive: `presence_leases.activity`, `online_battles`, and `online_battle_commands`. Terminal rooms/receipts retain seven days; unfinished turns/invites are settled by the next service read/write after their deadline. No game-state migration is needed. Prefer forward fixes. Before rolling back this feature, drain active matches or inform participants; an older server will not expose these rooms even though learning saves remain compatible. Preserve the monster catalog/versioned capture changes from main 9fbaba2 in any release.

Verification:
- Build, TypeScript and Taiwan pronunciation checks PASS.
- 93 suites / 706 tests PASS, plus isolated dragon-cloud suite / 6 PASS: 712 total. Final focused tests rerun after activity/banner adjustments.
- Integration coverage: unauthorized sessions, CSRF, same-slot cross-account identities, friendship scope, stale presence, unowned pets/client stats, simultaneous invites/moves, replay, cooldown, cancellation, decline, expiry, timeout, re-login and unchanged learning state.
- WebKit with two independent synthetic accounts and a local PostgreSQL API: live activity transition; invitation/acceptance; alternating attacks and identical rounds; deliberately dropped response after server commit and retry without duplicate damage; offline/reconnect; reload recovery.
- 320/390/768/1024px viewport checks: no document/dialog horizontal overflow; visible, non-collapsed battle stage. Screenshots are under local `output/playwright/`. Physical phone/iPad hardware was not directly tested.
- Independent read-only reviewer rechecked arena container and ownership-selection fixes; no remaining blocker.
