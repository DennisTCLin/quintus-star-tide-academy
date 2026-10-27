# Animated islands and readable tone marks

## Result

The subject selector now contains a fixed-camera animated archipelago with five clickable island markers. The numbered subject cards below retain challenge progress, resume/reward actions, grade mappings, math activities, and collection previews. Both entry points share the existing guarded callback.

Zhuyin annotations have a 14px minimum, stronger contrast, and enlarged in-flow tone marks. Standalone tone answers use 72px vector symbols with tone names. The exact pronunciation strings, neutral-tone positions, answer values, scoring, and cloud data contracts remain unchanged. New interface phrases were added to the generated dictionary; obsolete panorama captions were removed.

## Motion and fallback

- The local H.264 loop is attached only while its map is visible and motion is permitted. It is removed on pause, background/offscreen transitions, reduced motion, safe mode, or data saving.
- The hero and map coordinate playback. The separate existing companion guide remains independent; this is not a claim of one decoder for the entire page.
- Playback errors retain the poster, all course controls, and a retry action. Media never gates learning or changes progress.
- Generated using Higgsfield cinematic_studio_video_v2, job ab3235df-0b04-48d6-85d0-ab2888fed78a, quoted 6 credits. Fixed start/end island layout; no audio. Shipped file: 367,795 bytes, 1280×720, H.264 Main, yuv420p, 24fps, 6.04s. Six sampled frames inspected for fixed island positions and actual water/cloud motion.

## Verification

- Production build and pronunciation checks pass.
- 76 tests pass across readability, course selection, hero carousel, stage visibility, adventure, and island suites.
- WebKit synthetic grade-two account: map entry opens the correct tone course; all four tone choices render at 72px, annotations at least 14px. Existing course tests cover grades 1/2/4, resume, pending rewards, math activities, and offline/busy guards.
- Home and tone question layouts at 320/390/768/1024px have no document horizontal overflow. Five map targets are at least 48px and do not overlap; keyboard focus is visible.
- Cold home load requests no offscreen panorama video. Visible playback reaches readyState 4. Pause, reduced motion, safe mode, source failure/poster, and retry verified. Hero absent while map plays; companion guide may still play.
- Independent verifier reproduced and closed StrictMode source cleanup and mobile footer sizing regressions. Footer tone marks compute to 19.6px above 14px annotations.

## Council decision and limits

Six native-role proposals and three independent reviews favored Candidate B, incorporating C's shared routing, E's failure handling, and D's source deferral. Accessibility and loading concerns were mandatory release gates, not optional refinements. Browser and code gates above are closed. The aggregate proposal score retained conditional blockers; the final release decision is based on the subsequent evidence.

Physical iPad 7, device memory/frame-rate behavior, and VoiceOver are not verified. This release does not establish that the earlier iPad startup hang is resolved. No schema migration. Revert this commit to restore the previous selector and typography.
