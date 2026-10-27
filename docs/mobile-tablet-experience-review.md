# Mobile and tablet experience review — 2026-10-25

## Scope and ownership

Reviewed latest fetched main `1ac3992` (including animated islands, enlarged Zhuyin tones and Brownie portrait) on `codex/mobile-tablet-experience`, in the feifei-photo worktree. Root is the single implementation writer. An independent read-only explorer and verifier inspected animation lifecycle and typography. Chat 50 owns the online battle fixes, integration and the next Railway release; chat 35 owns question deduplication. No real child account or learning progress was changed.

## Reproduced and repaired

- At 320×740, the grade-two Tideglow dialog was 302px wide but its content measured 373px; the close button extended to x382. The heading can now shrink, annotated tab/action labels wrap, and all dialog prose wraps between ruby units. After repair: 302/302px, close button x251–295, 44×44px.
- Grade-two challenge explanations also exceeded a 320px viewport (body scroll width390px). The grade-two reading container now permits wrapping between annotated characters, preserving each complete ruby syllable. Retest: 320/320px.
- Opening Tideglow over the map left both panorama and actor videos playing; panorama time advanced from0.56s to3.60s behind the modal. A companion-open callback now suspends/unmounts the map video and suspends the hero. Closing restores the appropriate visible background; manual map pause remains respected.
- Broad span rules in quiz HUD, growth meter and skill labels overrode the enlarged tone with small fonts/block layout. They now target the intended direct children. Rendered skill/HUD tones:19.6px, inline (previous skill tone13px).
- Chat50 supplied a separate 320px long-name header reproduction: player chip right331.7px. The chip is now width-constrained and its name flex child may shrink/wrap. Chat50’s integrated WebKit run confirmed the long-name document is320px at a320px viewport, and the battle dialog is294/294px with readable caption and44px-or-larger controls.

## Browser evidence

Browser UI actions used the in-app browser on localhost4306 with an isolated local PostgreSQL fixture. QA replaced the microphone source with synthetic audio while keeping actual browser MediaRecorder and audio/mp4 encoding; reply/STT/TTS providers were deterministic test doubles. There was no production-account access.

- Dock dialog dimensions checked at320×740,390×844,651×900,768×1024,1024×768,1440×900: scroll width equals client width; close button reachable.
- Enlarged voice dialog checked at320,390,768,1024,1440 widths: no horizontal overflow. Ruby remains14px; tone19.6px.
- Grade-two map at651px: all five stop rectangles inside the611px-wide map; suspected label clipping not reproduced.
- All six care actions exercised: pet/feed select their matching motion; high-five reaches1/1; ball and bubbles reach3/3 with cheering; rest cancels activity.
- Fixed Kiki high-five recording requested successfully. Two actual browser audio/mp4 captures (24,530 and31,061bytes) passed through the fixture; second reply remembered the first sea-turtle sentence. Two speech responses requested.
- Recording submit, cancel and dialog close each return synthetic active microphone tracks to0. Permission denial displays the parent-help prompt and remains operable.
- Manually paused map stays paused across companion open/close. Normal map resumes on close. Companion pause gives a static poster while care still responds. Safe mode has0 video elements and a usable static map.
- Standalone tone choice glyphs remain72×72px. Grade-two question at320px has no page overflow after wrapping repair.

Screenshots and measurements are in `outputs/mobile-tablet-review/`. Measurements are browser observations, not real-device frame-rate benchmarks. Physical iPad microphone, hardware decode/memory pressure, long-duration smoothness and live OpenAI response quality were not measured by this fixture.

## Validation at handoff

- Production build PASS (including pronunciation audit and TypeScript).
- Focused tests49/49 PASS; independently rerun by verifier.
- Initial isolated-database suite:710/712 passed; the two pre-existing raw-HTML phonetic assertions were repaired by chat50. Final integrated main1218de8:94 files /713 tests PASS, including a new battle-result acknowledgement regression. Separate WebKit iPhone13 /iPad gen7 emulation passed27 checks; see `friends-device-release-review.md`.
- Read-only lifecycle falsification: close, hide/suppress, page change, player unmount, resize, manual pause and reduced motion PASS. No server/API/schema/economy changes in this batch.

## Release

Unified runtime `1218de8` was published by chat50. Railway deployment `55e752cc-2463-46da-ba0e-d89bb307412e` reached SUCCESS. The local branch was rebased onto that exact main and rebuilt successfully. Anonymous production verification passed11/11 checks: health, HTML entry reference, entry JS, CSS, island panorama, Tideglow idle/listening/speaking videos, care artwork and Kiki high-five recording match local SHA-256. Entry: `/assets/index.v-dbIJ5XGq.js`. See `outputs/mobile-tablet-review/production-verification.json` and its rerunnable verifier. No account cookies were sent. Local QA server and tabs were closed, viewport reset, microphone tracks ended, and temporary QA credentials removed. Physical-device limitations above remain applicable.
