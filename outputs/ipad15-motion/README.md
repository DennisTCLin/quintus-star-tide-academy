# Actual care animation on older iPads

## Scope and reason

The prior repair kept a still visible, but a rejected/stalled video completed the care action immediately. That does not satisfy actual animation. This change uses the existing Higgsfield footage as bounded JPEG frame atlases for all six care actions of both mascots. iOS 15 and earlier (including desktop-mode iPad Safari) select frame playback directly; other engines keep MP4 and switch to frames after a video failure. No account, learning, reward, schema, permission, or API changes.

## Playback contract

- Original footage at 12 fps, 256-square frames. Each action has one or two sheets, each at most 2048x2048 (~16 MiB decoded); only the current actor retains those sheets.
- All required sheets load before the clock starts. Poster stays visible until the first successful canvas draw. Sheet failure or an 8-second load deadline releases the action safely.
- Completion follows the clip duration. Repeating an action remounts its renderer and starts from frame zero. Rest loops across its two sheets.
- Pause, reduced motion, background/offscreen state and unmount remove the canvas, cancel animation callbacks and release sheet references. Stale loads cannot affect a new action.
- Parent timing allows the existing video watchdog to enter animated fallback rather than prematurely ending the action.

`prepare-atlases.py` reproducibly converts existing MP4 sources with ffmpeg. The JSON manifest records frame counts/durations and unique paths. No new media model generation or altered character designs.

## Verification

- Build PASS, focused 25 tests PASS; full isolated PostgreSQL suite: 132 files / 953 tests PASS after integrating the concurrent battle release.
- `browser-qa.py` checks actual changing canvas pixels, completed actions, modern MP4 playback, rejected/hung video recovery, rest loops, pause/resume, foreground return, repeat touches, reduced motion and all other child profile mappings. Two modern browser engines, synthetic API fixtures only.
- `fault-qa.py` checks silent post-start video freeze, broken atlas retry, and all three ball-game hits.
- The first harness run used a five-second assertion for an intentional eight-second video timeout. It was corrected to wait up to fifteen seconds; this was a harness timing failure, not product behavior.
- Local browser suite: 81 checks PASS, fault suite: 13 checks PASS. Final integrated build: 24 asset comparisons and 9 actual animation UI checks PASS. Fresh read-only verifier PASS, including independently reproduced silent freeze, broken-sheet recovery and stale-completion interruption.
- Production verification must compare emitted assets and run the same meaningful touch actions against the live frontend with mocked APIs (no actual student writes).

**Physical iPadOS 15.4.1 has not been tested.** User-agent routing tests on current WebKit/Chromium do not reproduce its decoder/GPU. The actual device must be refreshed and retested; no claim of physical-device success is made.

[WebKit autoplay policy](https://webkit.org/blog/6784/new-video-policies-for-ios/) and [low-power autoplay restriction](https://bugs.webkit.org/show_bug.cgi?id=168985) motivate avoiding video autoplay for the compatible path. The photographed device's exact failure cause is unproven.

Rollback: revert these frontend/media commits on current main, preserving newer schema and question-bank changes.
