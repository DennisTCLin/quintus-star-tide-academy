# Contextual dragon welcome and shared starter gacha

User authorized implementation, testing, coordination and Railway publication on 2026-10-25. Root remains sole integration/deploy writer, worktree `feifei-photo`, branch `codex/dragon-onboarding`, baseline `471d8dc` (runtime `19999495`). Codex Hyper Relay: bounded read-only explorer and fresh verifier; animation assets provided by the authorized voice chat in its own output directory.

The new welcome scene names the signed-in player locally, offers large picture responses and playback buttons, and continues after the actual starter receipt. The current illustrated starwish machine is shared with ordinary gacha. Starter still uses its original E80% / D20% server rules and single free grant; no draw/economy contracts changed.

AI uses OpenAI Responses (`gpt-4.1-mini` default, optional `OPENAI_MODEL`) with structured outputs and `store:false`. Provider gets only anonymous picture choices, bounded prior generated responses, phase, preference and public companion element/rarity. It gets no name, age/grade, account/session identifiers, photograph, microphone recording, free-form child message, IP or full family state. `store:false` is not a claim of Zero Data Retention. This release uses picture choices and spoken output, not microphone transcription/free-text chat.

Actual generated short response is combined with one reviewed question and fixed navigation choices. The service refuses unknown output fields, noncandidate reply IDs, unsafe requests/pressure/reward claims, words outside a 96-word reviewed positive vocabulary or mismatched readings. A 6.5-second provider deadline, refusal, bad payload, missing key or failed guard returns reviewed guidance, honestly labeled `小龍引導`. This is bounded interaction; word filtering is not a proof that every future generated utterance is correct. Unknown/ambiguous speech should continue to fall back, not be represented as reviewed content.

Conversation lives separately from `Family`, keyed by authenticated account/player, capped at eight turns, with revision checks, idempotent receipt IDs, child-slot authorization and CSRF. External requests occur outside database transactions. A real draw/equipment change invalidates stale model facts. UI uses independent requests (does not put AI failures into economy replay or cloud offline status), account/session keys and stale-response guards.

Grade 1: images and explicit hearing buttons; no typing required. Grade 2: nested component performs its own ruby annotation; bubble text and ruby use dark ink on light mint. Spoken output uses existing Taiwan Chinese device voice; unavailable voice leaves the picture choices usable and asks for device setup. Reduced motion uses still brand art; offscreen/background dragon video pauses. Speaking motion indicates voice activity, not exact phoneme lip-sync.

New pronunciation corrections checked against MOE:
- 記得: ㄐㄧˋ ˙ㄉㄜ — https://dict.concised.moe.edu.tw/dictView.jsp?ID=21600&la=0&powerMode=0
- 著 as continuing-state particle: ˙ㄓㄜ (急著) — https://dict.concised.moe.edu.tw/dictView.jsp?ID=29560&q=1
- 休息: ㄒㄧㄡ ㄒㄧˊ retained — https://dict.concised.moe.edu.tw/dictView.jsp?ID=27163&la=0&powerMode=0

API references: https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses and https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance

Initial verification: build/TS/pronunciation passed. 76 files / 612 tests passed with isolated real PostgreSQL; added pronunciation regression subsequently passes. Auth, CSRF, cross-account/member isolation, duplicate request replay, competing turns, unchanged family, bounded history and a draw completing during model generation covered. Anonymous live provider call succeeded after user configured Railway key. Local browser confirms sea preference retained across reload and generated response to nervous choice referring to sea waves. Synthetic-only local database `dragon_onboarding_ui_20261025`; no real child progress edited.

Final verification before publication (2026-10-25):
- Build, TypeScript and pronunciation checks PASS; 80 files / 632 tests PASS on isolated PostgreSQL.
- Eight independent pools concurrently create a new table/index successfully; failed DDL rolls back and releases its connection/lock. Both new guide and friend table bootstrap paths use this serialization helper.
- AI now returns an enum-constrained word-token array composed into a fresh sentence. The earlier free-line attempt accepted only 1/6 live cases and was replaced; final six live cases all generated valid responses in 0.76–1.09 seconds. Browser/API/DB flow also produced a real response to help. Nine prior harmful/incorrect-reading counterexamples rejected.
- All 9,216 adjacent vocabulary pairs checked against actual frontend longest-phrase readings. This found and fixed 你好奇 being consumed as 你好; now 好 renders ㄏㄠˋ.
- Five actual brand animations (welcome/listening/thinking/speaking/cheering): 480×480 H.264/yuv420p, 24 fps, no audio, 4.04 seconds each. Total videos/posters 535,471 bytes. Offscreen pause, header pause, static fallback, and real TTS speaking-state verified. Independent browser TTS in simultaneous tabs can cancel another tab; exclusive checks succeeded.
- Independent checks: 320/390 phone, 1024 tablet and 1440 desktop without horizontal overflow. Grade-one image/hearing controls without ruby; grade-two ruby visible with no empty readings. Speech hover is white with dark text. Browser console has no observed errors in final local run.
- Double-click starter draw and reload retained exactly one companion in isolated test profiles (pebblefin/pearlbadger), each zero coins/tickets. No real child progress changed.
- Integrated authorized friends commit ba7396b and math commits 973664e/0514bbf. Root sole publisher; friend author activates previously authorized explicit member snapshot only after healthy release.

Evidence lives in outputs/dragon-onboarding. Screenshots and local QA use a synthetic test account. Pronunciation validation covers this vocabulary and checked copy; this does not claim all device speech engines or future generated sentence meanings are perfect. No real iPad hardware was available for this batch. Rollback is the previous Railway deployment; additive conversation/friend tables need not be dropped. Deployment identity and production checks are appended after release.


Production release: Railway deployment `6abed637-05be-4dd7-9764-44fef7777030` SUCCESS; runtime `c56c70a4b04ad3affc005c2c96b0ba813b02bd05`. `/health` returned ok. Served index, four entry JS/CSS files, and all ten dragon video/poster files match local SHA-256 byte-for-byte. Running container anonymous provider smoke returned `source:ai`, retaining the sea context when replying to nervous intent: 「不用急，我們慢慢看看海浪，聽聽聲音。」 No child/game state accessed by this smoke. Initial SSH command quoting was corrected before the successful check; not an application failure. Existing 2020a3c6 deployment is the rollback target.

Returning players can open 港口 → 和小龍說說話; new players receive the full welcome → illustrated free starter draw → companion introduction journey. Generated response audio uses device Taiwan speech; picture choice responses are available without microphone access.

Authorized friend activation completed by its owning chat after this deployment: explicit six-member snapshot added 30 directed edges, each player has five other friends. Author verified related game_states unchanged under read lock, and HTTPS checks for Alan/Jimmy showed five friends with their explicit avatar keys. Temporary SSH key removed by owner; no further runtime deployment pending. This report records delegated verification, not a second root mutation.
