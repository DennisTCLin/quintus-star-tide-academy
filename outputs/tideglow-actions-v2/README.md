# Tideglow care actions

The high-five button previously replayed the greeting clip and bubbles replayed the ball clip. Rest briefly closed the eyes while seated and reused a standing poster when paused. The companion now uses separate Higgsfield high-five, bubble-wand and lying-asleep performances, with action-specific stills for all six care buttons. Existing pet, snack and ball clips were visually inspected and retained.

The shared Tideglow mapping covers every non-Olivia account. The authenticated Olivia dog selection, dog assets, actor lifecycle, interaction targets, voice, authentication and stored progress are unchanged.

## Media

Three five-second Kling 3.0 standard, silent generations, 22.5 credits total. See `generation.json` for prompts, returned jobs, URLs and processed asset hashes. `prepare-media.py` creates H264 640×640/24fps clips. Rest uses the closed-eye segment from two seconds onward, forward then reverse, for continuous sleep without waking at the loop seam.

## Validation

- Full unit suite: 758 passed, 171 database-dependent tests skipped.
- Production build, content audit and pronunciation checks passed.
- Browser QA uses synthetic intercepted API responses, never changes real child accounts. It checks six actions, full ball/high-five/bubble interactions, real video playback/completion, prolonged rest loop, interruption, pause/resume, reduced-motion sleeping pose, all five profile slots, personal dog regression and failure recovery.
- Original pet/feed/play and generated high-five/bubbles/rest contact sheets were visually reviewed.

No migration required. Roll back to the preceding Railway deployment if needed. Physical tablet hardware and live microphone/AI speech were not tested in this media-only change.
