# Brownie child account

Brownie (林軒凱) was provisioned in production on 2026-10-25 as an independent household with the existing grade-four profile slot, following Alan’s account model. No Family/schema migration was needed. The operator helper is not exposed by an HTTP route; it uses the existing account provisioning lock and a transaction, rejects conflicting identities, and leaves matching retries unchanged. Credentials are not stored in this report or repository.

Verification: four focused test files / 17 tests passed against real PostgreSQL, production build passed, and an independent read-only verifier found no blocker. Local Chrome at 390 px completed synthetic onboarding and showed 林軒凱, grade 4, and the brand avatar without borrowing Quintus’s photo.

Production provisioning preserved all 24 prior account/state records and all six prior member records, comparing their complete in-memory hashes while holding read locks. A second identical provisioning call was a no-op. Production Chrome login succeeded, displayed the correct welcome name, and retained untouched onboarding at revision 0; no page errors or horizontal overflow. The verification session was logged out. The temporary Railway SSH key was revoked.

The account is usable on the current runtime. Brownie’s brand avatar and operator helper source are included in the coordinated integration release (afc860b); that UI deployment is owned by the tideglow integration chat. No automatic friend links were added at signup.

Evidence: `outputs/brownie-account/verification.json`.

## Explicit friendship activation

The user subsequently requested that Brownie join everyone’s friend list. On 2026-10-25 at 15:10 Asia/Taipei, the operator connected the explicit seven-member snapshot (Quintus, Olivia, Sunny, Feifei, Alan, Jimmy, Brownie). Exactly 12 directed edges were added, retaining the original 30. All seven players now have six other friends; a repeated operation added zero rows. All 25 game state records were byte-for-byte equivalent in their in-memory hash comparison under read locks. The production HTTPS friends endpoint, authenticated as Brownie, returned all six expected other children. The verification session was logged out and the temporary SSH key was revoked. No runtime deployment or gameplay mutation was required.

Evidence: `outputs/brownie-account/friend-verification.json`.
