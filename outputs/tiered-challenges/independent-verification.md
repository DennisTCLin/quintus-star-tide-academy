# Independent read-only falsification

Verifier: continuous_rewards_verifier. Root was sole writer. Recovered from completed agent report, not an additional Council dispatch.

Initial failures fixed: restored Math Island attempt ledger could be lost; completed capture result could disappear after reload; old island runs needed an explanation. Added ledger union, saved-result reconstruction/action, legacy-result copy and regression tests.

Second pass PASS: rejected falsy timing bypass values (false, 0, empty string); 192 six-answer patterns across all three tiers validated at every step; 1,080 exhausted/nearly exhausted grade/course/difficulty allocation batches produced distinct valid questions; preparation responses hide questions/IDs, reveal responses omit answers, repeated ready preserves the same clock. Focused three-file suite: 32 tests passed. No files or databases changed by verifier.

Root subsequently ran full PostgreSQL-backed suite: 71 files, 583 tests passed. Browser/HTTP evidence is recorded separately in verification.json. This does not prove arbitrary production environments or real-device behavior.
