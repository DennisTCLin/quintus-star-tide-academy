# Grade-five general practice release

Adds 80 original questions (20 each Chinese, English, science and social), preserving the 60 existing math questions. All five grade-five subject islands are available. These are general warmups, not a claim of matching a school textbook, semester or exam.

Content review: independent language and science/social reviewers approved all80 at source SHA f5a864f85bc90bc77d82725b7d40bbe10bfca6639eb5632a2f0b738ea1ceb332. See docs/content-review/grade5-general.md.

Local verification: 813 unit tests passed (175 DB suites skipped in default run),47 focused tests passed,32 independent verifier tests passed;24 independent mixed-answer persistence round trips and320 cross-grade injection rejections. All4415 prior question approvals and42 template approvals preserved. Full build passed.

Real local PostgreSQL synthetic account: five subjects each completed6 questions, answer/explanation hidden before answering, wins survived state reload, and other profiles unchanged. WebKit rendered five islands at393px/834px and actual new questions. Production-browser verification uses live assets with mocked identity and makes no real account mutations. No physical device is claimed.

No account identity, persistence schema, database migration or existing question IDs changed. A forward patch should retain newly saved question IDs if any content correction becomes necessary; do not remove IDs used by active challenges.

Deployment: commit1e39713, Railway c4222730-62e9-4078-b493-631324d07135 SUCCESS. Health and7 public asset hashes verified; live public frontend with synthetic Jay state shows all5 accessible map entries at393px and834px. Verification targets the visible animated map rather than the subject cards inside the collapsed secondary list.
