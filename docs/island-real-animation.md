# Island articulated motion

This release replaces the outdoor island's whole-portrait bob/rotate animation
with genuine Higgsfield video-derived transparent frames for **Tideglow and
Cometcrane**, the two companions in the reported screenshot. Each has idle,
walk and playful greeting footage. The other 133 catalog entries still appear
when owned, but rest in place until their own reviewed motion exists. This is
not a claim of 135 animated species. The indoor RoomEditor is a separate scene.

## Sources and packaging

`outputs/island-animation/generation-record.json` contains exact prompts,
reference IDs, job IDs and quotes. The Seedance 1.5 walk prototype spun around
and was rejected. Six Seedance 2.0 Mini clips were accepted after visual review.
Quotes total 28.8 credits including the rejected prototype; billing was not
independently verified. No generation runs in the player's browser.

`scripts/pack-island-sprites.cjs` uses FFmpeg and Sharp to key the video,
remove magenta shadow contamination, reject clipping, and pack 160 px cells.
One union crop across each creature's footage preserves scale and grounding.
The walk clips use matching observed foot poses (Tideglow frames 11–28,
Cometcrane 7–29) to remove start/stop frames and improve the loop seam.
Idle returns along the filmed frames; greetings play once and hold their
last pose. These are actual changing frames, not a deforming still picture.

The six sheets contain 233 unique frames, approximately 1.82 MB compressed
and 22.85 MiB decoded total. Only the current resident batch loads sheets.
The asset registry contains explicit hashes, dimensions, timing, ground
anchors and source facing. Adding a species requires its own reviewed clips;
an idle clip alone never authorizes sliding it across the ground.

## Runtime and regressions

The existing single habitat RAF advances both navigation and canvas playback.
Walk phase is derived from actual ground distance, so changing movement speed
does not leave the feet running at an unrelated fixed cadence. Fixed ground
anchors also keep mirroring from shifting the body sideways. The crane's
greeting includes a small leg-folding flutter above the fixed world anchor.

Pause, editing, hidden/offscreen state and reduced motion stop both clocks.
Reduced motion uses still portraits and requests no motion sheets. Missing,
malformed or failed walk/idle sheets keep a resident stationary. An unavailable
greeting uses idle; a failed portrait falls back to the existing star symbol.
Unmount clears image callbacks, image references, observers and the RAF.
The habitat never writes ownership, progression or cloud commands.

The integrated home's three territory view buttons now wrap on narrow screens;
without wrapping, grade-two ruby labels made a 390 px page 524 px wide.

## Verification

- `npm run build`
- Real PostgreSQL full suite: 45 files / 407 tests passed after home/six-question integration.
- `scripts/verify-island-animation.py`: Chromium with isolated player fixtures,
  actual canvas pixels, movement, greeting, pause, hidden/offscreen, runtime
  reduced motion, 404 and malformed sheet fallbacks, plot access and zero writes.
- `outputs/island-animation/atlas-checks.json`: all six sheets have distinct
  frames, no opaque cell-boundary pixels and no visible magenta background.
- Fresh read-only verifier: corrupt/all-missing assets, 200 plot hit samples,
  fixed ground root, and no canvas drawing after unmount.

The existing Vite large-entry-chunk warning remains. Rollback is the previous
published home runtime; this feature adds no database migration or saved state.

## Published release

Railway deployment `63792901-1096-4f97-94ba-07ca00aad81d` succeeded from
source `167e7bbabcb150d293400c0e7038f53816a88376`. Production health returned 200;
all five JS/CSS bundles and six motion sheets matched the reviewed local bytes.
A second Chromium pass against production with isolated API fixtures passed
36 desktop/mobile checks with no page errors or real player writes. See
`production-release.json` and `production-browser-checks.json` in
`outputs/island-animation/`.
