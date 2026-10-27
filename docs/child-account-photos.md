# Child account photos — 2026-10-25

Published runtime `19999495c441bb4c7f2195b8a94929d7e262ae52`; Railway deployment `af83e502-1d35-44ef-93c7-83d2871fa618` succeeded. Includes the subject-islands release `780c0bf`.

Alan uses the supplied white-shirt portrait; Jimmy uses the supplied red-shirt/glasses portrait. Original files are preserved, with CSS cropping for circular avatars. A session-scoped avatar provider binds each override to both the authenticated username and its player slot. Existing Quintus and Feifei photos remain unchanged. No account data or game progress was modified.

Validation: production build passed; browser previews confirmed both account photos and the unchanged template photos at 40/64 px. Local app fixtures showed each account's correct photo in the player chip and voyage header, including a 390 px Jimmy check. These fixtures did not change real children's onboarding. Production homepage, all nine compiled JS/CSS files and both portraits returned 200 with SHA256 hashes matching the local build (12 files total). Deployment evidence is in `outputs/child-account-photos/deployment.json`.
