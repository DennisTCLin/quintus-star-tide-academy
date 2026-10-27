# Battle remediation verification — 2026-10-25

Base: fee6c7dd82873ac95cf34e3902d2854c880b790b. Source branch: codex/battle-defeat-practice.

- Build including pronunciation packing, TypeScript, Vite and server bundle: PASS.
- Isolated PostgreSQL regression: 85 files / 659 tests PASS. No production database modified.
- Core: original answer/timeouts preserved; partial or incorrect correction pays nothing; same-day eligible failed run is topped up to half of six-question resources (max 30 coins/30 XP), original rewards counted; XP capped; practice/legacy/old-day zero payout; skipped run cannot claim.
- Server: row-locked settlement and command receipt; concurrent final requests with same and different IDs settle once; winning request replay returns original result; stale revisions and already-corrected/new-ID claims rejected; correction progress survives state reload. New normal and hands-on math runs reject pending correction until explicit skip.
- 16 actual IAB component checks PASS: automatic single advance, no uncontrolled retries, manual retry, pause/resume, offline/reconnect, unmount, hidden/visible, original tone audio callback, wrong correction, final settlement, no repeat claim UI, atlas cropping, grade-two ruby.
- Responsive fixture at 390px: document scrollWidth 390px, four distinct crop positions, each image 120px wide. Desktop and mobile screenshots saved alongside this report.
- Independent read-only verifier found two P1 issues (recording stimulus and sprite crops); both fixed by original App audio handling and shared ChoiceView; final re-review PASS. Independent core rerun 7/7 PASS.

Limits: local component/API verification, not physical iPadOS 15.5 hardware testing. Final combined voice/battle app regression and production deployment belong to the single integrator (chat 50).

Reproduce UI: start Vite locally and open /qa/battle-remediation/index.html, press 執行互動測試. This fixture does not contact a cloud API and is not part of the production bundle.
