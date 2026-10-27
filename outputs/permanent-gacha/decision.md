# Permanent capsule machine — Council decision and verification

Decision: build the existing ticket draw into a visible, reusable capsule machine. Native Codex role diversity; Standard/compact, six opinions, three reviewers and a separate browser evidence runner. No external-provider claim.

## Player rules
- One earned star ticket gives one companion card, duplicates possible. Existing pool remains uniform across the54 companions other than the player's own starter. Show actual per-tier counts/odds for this profile.
- First-time starter remains separate: E80%, D20%, once per player, free.
- Earn tickets through existing five-question completion rewards: save two stars for one ticket or the existing50% chance choice. Three completion rewards daily. No new currency, pity or changed rarity weights.
- New results can immediately equip a companion for practice; an active voyage retains its original companion and XP recipient.
- Duplicates remain owned cards. Exchange requires mutual approval; unavailable cards cannot be equipped.

## Decision, dissent and gates
Anonymous aggregate placed F narrowly ahead of E (8.95 vs8.9333); ranking alone was marked blocked pending recovery/isolation evidence. All proposals shared the same architecture, so the near tie did not create a conflicting product decision.
Preserved dissent: do not prohibit next-voyage equip during an active voyage; do not promise automatic exchanges or use urgency/near misses. Do not tie charging to animation.
Independent code review found a P2: a newer device's lastDraw could hide the original delayed result. Fixed by displaying the server response receipt for the current action; a fresh page/reload displays the latest cloud receipt with a distinct label. Bob verified X response/Y latest-state interleaving in both motion modes.
Historical receipts are optional, validated, server issued and stripped on import. Existing request IDs/revision locks prevent duplicate charges. Reload recovers the most recent draw, not an unlimited per-draw history; all cards remain in collection.

## Evidence
- 273 tests across27 files after merging monster-bestiary c2a8d23, including real PostgreSQL authority tests.
- Cloud test earns a ticket by completing two voyages, drops the first draw response, retries the same request ID, verifies one charge/card, cross-device sync, reload, profile isolation, next-voyage equip, original XP and logout.
- Bob15 base browser scenarios:320/390/1440px, grade2 ruby, empty/capped/pending rewards, keyboard confirm/cancel/Escape and focus return, duplicate/traded cards, reduced motion and failed artwork fallback.
- Two additional interleaved response scenarios verify current result focus and visibility, polling stability, latest-on-reload behavior and one command.
- No page errors. Only intentional failed-image fixtures produced expected network errors.
- Lightweight CSS machine; no new rendering library or full roster portrait preload. Before monster integration, client JS grew roughly11KB raw and CSS4.2KB raw. No device FPS/CPU/CLS benchmark was performed; do not claim measured frame-rate improvements.

Conditional release blockers are resolved by the linked evidence. Deployment33e74091-1eb5-4943-8b9a-fa4086f690b3 succeeded for runtime1073138. Production JS/CSS match local bytes;30 monster assets accessible. Independent disposable-account production flow passed, also with AbortSignal.timeout removed. This emulates missing API support; it is not a physical Safari15.5 device test. See production-cloud-verification.json and production-release.json.
