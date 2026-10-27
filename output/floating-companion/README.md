# Large transparent floating learning companions

User request (2026-10-27): move the companion to the lower-right, remove its background, and make the character larger.

## Appearance and behavior

The launcher is a genuine RGBA cutout, without the previous circular video or enclosing button panel. Default image box: desktop 200px, tablet 172px, phone 128px. The small caption remains a tappable label. Existing dog and Tideglow transparent source PNGs are reused unchanged. The bow companion uses a new versioned clean cutout.

The launcher stays on the right edge. It measures actual interactive control rectangles and chooses the lowest available vertical gap, leaving an 8px touch gap. If necessary it temporarily uses a 60px image; when no gap exists, or while editing a text field, it stays out of the way. While the page is scrolling it is hidden until settled geometry can be measured. Existing suppression for active questions, battle, preparation, parent screens and modal overlays remains in place.

Only the floating launcher changed. Tapping it opens the existing care/chat dialog, with the existing Higgsfield action movies, playback fallbacks, focus return, hide/reopen and reduced-motion controls.

## Image provenance

Built-in image_gen editing tool, background-extraction mode, transparent_background=true. Input: public/assets/feifei-bow/launcher-v2/poster.png. Output copied from the tool result at /Users/dennistclin/.codex/generated_images/01a16e50-8e57-7993-8419-9b101001409c/exec-b348e30b-d9e8-4bef-b7e8-3eee70ae7848.png and resized proportionally with FFmpeg to public/assets/companion-launcher-v3/bow.png (480×613 RGBA). No existing public asset overwritten.

Final prompt:

> Use case: background-extraction. Edit target: supplied children's brown hand-drawn mascot with pink bow and yellow paws. Remove EVERY pale cream/off-white background pixel around the silhouette, including beside the ears/bow, between arms and torso, under feet and all four corners. Return a clean true RGBA transparent PNG cutout of this exact same complete character, tight comfortable framing. Preserve the character identity, brown crayon/paper texture, pink bow, blue bow center, face, yellow cheek patches, pose, proportions and outline faithfully. Do not redraw in 3D, change expression, add objects, ground plane, glow, shadows, frame, circle, text or backdrop. Only the character is opaque; all surroundings fully transparent. Keep all bow/ear/feet edges intact.

## Verification

See alpha-verification.json for all three PNG alpha checks. Browser fixtures use real newFamily() output and intercepted synthetic account APIs; no real student state or rewards are modified. Modern WebKit and Chrome check visible navigation touch targets, the whole button rectangle (transparent pixels intercept taps too), settled whole-page scroll positions, all three mascots, phone/tablet orientations, dialog focus and reduced motion.

Physical iPadOS 15.4.1 is not available; the launcher uses a simple PNG with no video autoplay dependency. No backend/data/auth/reward changes.

## Release coordination

The voice/mobile audit chat owns the single combined release. This branch does not independently deploy Railway; hand off the commit and new asset path for integration and production verification.

Independent read-only review found an obsolete 48px launcher rule leaking into the care actor; removed and reverified. WebKit and Chromium independently passed all three identities with square care/chat actors, input focus hiding/restoration, and landscape/phone resizing. No remaining source blocker found. Full matrix and release results are recorded separately when completed.

## Final local acceptance

- PASS production build, TypeScript, pronunciation/content checks; 5,018 approved static questions retained.
- PASS 916 unit tests; 181 environment-dependent tests skipped. Includes five independent dock-gap cases.
- PASS 36 layouts (WebKit/Chrome × dog/bow/Tideglow × 320×568,390×844,820×1180,1024×768,1440×900,844×390), full-page scroll sweeps, all navigation targets, transparent PNG loading, square care artwork, no modal layout shift, keyboard focus.
- PASS 6 flow suites: both openers, temporary hide/reopen, reduced motion, enlarged caption text.
- PASS 6 WebKit touch cases: phone/iPad × pet/feed/play; original action footage decodes, chat tab opens, course picker suppresses the launcher and closing restores it.
- No game commands submitted and no JavaScript page errors in the accepted runs.
- Source commit 349e865; release owner will combine with voice changes and verify production.

Results: browser-results.json, touch-results.json, alpha-verification.json, unit-tests.txt, build.txt. Screenshots are synthetic student fixtures only.
