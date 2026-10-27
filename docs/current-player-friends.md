# Current player friendships

Baseline: 471d8dc. The current six enrolled child accounts should be mutual friends across household boundaries. Membership is an explicit operator snapshot of player_logins UUIDs; future registrations are not automatically exposed.

player_friendships records directed edges, with both directions created together in a transaction. Repeating the same snapshot is idempotent. The API retains the existing family fallback for unenrolled accounts, uses each target account for presence, and returns only name/avatar/status metadata. Composite display identity prevents same-grade slots from being mistaken for the viewer. Game state and permissions are unchanged.

Checks: production build and diff check PASS; five focused test files / 31 tests PASS with real PostgreSQL; independent read-only verifier repeated all 31 in a separate database and passed. A 390 px browser fixture for Alan shows five distinct other children, including Quintus and Jimmy with their correct portraits, with no horizontal overflow.

Activation is pending the coordinated deployment. After the new module is deployed, an operator calls connectCurrentPlayers(pool, explicitMemberIds) for the six confirmed production members, verifies 30 edges and five others per member, and compares game_states before/after. The function is not exposed through any HTTP route. Removing those exact edges reverses only this friendship grant; do not roll back family7 runtime.
