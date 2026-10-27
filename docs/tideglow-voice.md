# 潮光獸語音對話

## Mission contract — 2026-10-25

Outcome: children can speak their own short sentences to Tideglow, receive contextual spoken replies, and continue their recent conversation after reopening.
Done when: authenticated audio → transcript → contextual reply → playable speech works; per-child memory/reset, cancellation and microphone cleanup pass tests; phone/tablet/desktop layouts and desktop Safari verified; coordinated Railway release matches tested commit.
Scope: explicit tap-to-record / tap-to-send (25 second maximum), visible recording state, cancel/retry/replay, secure account-scoped last 12 turns retained up to 7 days, age-appropriate guidance and existing grade-two ruby, UI animation states, API-key server boundary.
Out of scope: always-listening microphone, voice cloning, game rewards or real child state changes, unbounded permanent memory.
Constraints: single writer in feifei-photo worktree / codex/tideglow-voice-conversation; preserve fee6c7d integrated release and existing work. Root owns voice pipeline and release; chat27 can supply separate voice assets after human selection.
Baseline: fee6c7dd82873ac95cf34e3902d2854c880b790b (runtime16c7f02). Guided choice history exists; no microphone or free-form conversation yet. Physical iPad unavailable; simulator viewport and desktop Safari are not hardware verification.
Risk/rollback: additive database tables only, no family mutations. Runtime rollback to16c7f02; retain isolated speech tables for forward compatibility. Raw audio only in request memory, never saved to disk/database/logs. Transcripts minimized and expire; no provider secrets in client. Provider retention is governed by its account settings, not claimed zero-retention.
Verification: API fixtures + PostgreSQL isolation/idempotency/race/reset tests; MediaRecorder cancellation/format/permission tests; provider contract tests; Safari and responsive browser checks; real provider synthetic recording smoke test; fresh read-only verifier. Report physical-device limits.
Route: Hyper Relay (one read-only architecture explorer, root writer, fresh verifier).

## Sources
- OpenAI file transcription: https://developers.openai.com/api/docs/guides/speech-to-text (accessed2026-10-25; multipart audio transcription, MP4/WebM supported).
- OpenAI speech generation: https://developers.openai.com/api/docs/guides/text-to-speech (accessed2026-10-25; gpt-4o-mini-tts, voice/instructions, MP3 output; AI voice disclosure required).
- WebKit MediaRecorder: https://webkit.org/blog/11353/mediarecorder-api/ (feature detection, AAC/MP4 support, explicit getUserMedia permission and track cleanup).

## Product behavior
- One tap starts listening. One tap sends; cancel discards the recording. No microphone opens automatically.
- Music and previous speech stop during recording. Closing, changing player, switching tab or backgrounding stops capture and playback.
- Reply can be replayed or interrupted. If autoplay is blocked, a large explicit play button remains available.
- Cloud memory is isolated by authenticated family and child; recent voice conversation survives reload. Reset invalidates in-flight old turns.
- Voice and text are sent to OpenAI for this conversation. The site does not save raw recordings. Parents can clear recent transcripts; unavailable service keeps picture choices usable.
- First graders can use microphone/speaker/icons without typing; second graders use existing Taiwan ruby annotations. Arbitrary generated text is not represented as a complete human pronunciation audit.

## Voice choice and final checks
The human selected OpenAI dynamic speech for this release and Kiki for fixed phrases. Seven exact reviewed lines map to static MP3 recordings; free-form replies are not labelled Kiki. A visible speaker explains the microphone interaction for early readers. The parent disclosure distinguishes both voices.

A late guided reply originally could interrupt a newer microphone session. The final implementation requires the same global voice generation plus the current care tab before auto-narrating. Independent in-memory actual-hook checks covered active microphone, finished microphone, care-to-talk transition, and ordinary uninterrupted care. All passed without losing the textual response.

Verification record: `outputs/tideglow-voice/verification.json`. Final full suite passed 87 files / 675 tests after the arbitration fix; its focused regression also passed 3 files / 22 tests. All seven Kiki recordings passed full MP3 decode and served SHA-256 matching; Safari microphone-help button requested the correct Kiki file without playback errors. Production build passed. macOS Safari native MediaRecorder with a synthetic source produced a 63,953-byte AAC/MP4 recording, which the real OpenAI transcription endpoint recognized. Live provider synthetic two-turn test retained the turtle preference and generated MP3. These tests did not access real children's accounts or recordings. Phone width 320/390, tablet 768/1024 and desktop 1440 layouts were checked; corrected grade-two ruby no longer overflows the narrow panel. Physical iPad permission/microphone/speaker remains unverified.

## Unified release coordination
Chat50 owns the single unified voice + battle integration release; this branch supplies a tested commit. Chat27 owns battle practice changes and Kiki asset generation. Preserve both pronunciation additions and regenerate packed data when merging; cloud voice initialization/routes and battle command handling are separate sections. No independent old-baseline deployment from this branch.

Local QA: create a disposable PostgreSQL database; run `npm run build`, then `TEST_DATABASE_URL=postgresql://127.0.0.1:55432/<qa_database> QA_PORT=4293 QA_ACCESS_FILE=/tmp/tideglow-integrated-qa.json node outputs/tideglow-voice/qa-server.mjs`. Open its printed `/qa-login` URL. This fixture creates a synthetic family, replaces only the microphone source with synthetic sound and uses a fixture AI provider. Raw synthetic captures stay in the QA output folder, which `.dockerignore` excludes. The production server contains no capture-writing logic. Delete the temporary QA access file and stop the fixture after testing. Real provider smoke scripts use synthetic text/audio and no database, and require an injected service key without printing it.
