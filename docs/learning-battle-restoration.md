# Restore the learning battle experience — 2026-11-25

The automatic learning route sent children to `StudyReview`, which had no battle
stage and suppressed the floating companion. Keeping `QuizEncounter` in the
formal challenge route did not preserve the experience of children sent to probes
or lessons. The learning route now keeps its own companion stage throughout
selection, probes, lessons, practice, review, loading, pause and completion.

## Behavior and preservation boundary

- Reuses the existing sea arena, companion artwork, monster artwork and reviewed
  attack footage. Phone portrait stacks the stage and answers; tablet landscape
  places them side by side. Formal challenge silhouettes use the preparation
  screen's existing readability scale, including small companions.
- A newly acknowledged correct answer plays a strike. An incorrect answer plays
  a protective shield. The stage has no invented HP, damage, XP or rewards.
- Only the same session/question's unsettled-to-settled answer transition starts
  an action. Initial mount, reload, repeated synchronization, hints and lessons do
  not replay answers. Next waits for the short presentation; Skip and Rest remain
  available. Reduced motion preserves the characters and static feedback.
- Missing or late movies retain the character stage and spell presentation.
- No changes to game commands, question banks, adaptive selection, study rules,
  six-question combat rules, capture, economy, migrations or server code. Eleven
  interface dictionary entries were added; all existing entries are unchanged.

## Verification

- Full build: content audit, pronunciation, TypeScript, Vite and server builds.
- Full non-database run: 1,744 passing tests. Subsequently added eight rendering
  regressions cover every study branch; the focused rendering/presentation run
  passes all 14 tests, including six already counted in the full run.
- Three fresh PostgreSQL databases: study review, adaptive learning and tiered
  challenge suites, 12 tests passing. Browser fixtures use a separate loopback
  database with synthetic accounts only.
- 52 Chrome/WebKit layout and interaction checks: grades 1/2/4/6; 320–1180px;
  server acknowledgement, real movie playback, impact frames, shield, lesson,
  reload without replay, missing movie and reduced motion. Short low-grade math
  controls including Teach Me fit on the first screen at phone/tablet sizes.
- Complete journeys: probes into six-question victory on phone Chrome and tablet
  WebKit; probes into three-error defeat in reduced-motion landscape. Checks
  inspect live movies, visible character sizes, HP and saved outcomes.
- Independent read-only code and visual review, plus `git diff --check`.

Compact evidence is in `output/learning-battle-restoration/`. Raw browser scripts,
logs, screenshots and recordings are retained in the implementing workspace.
The initial dictionary-reading failure was corrected and rechecked. A later
browser rerun reached the disposable fixture's login limit; resetting that local
fixture resolved it without changing application rate limits.

## Release and rollback

Publish through the existing repository's main branch and existing Railway
service. Verify the deployed commit, successful deployment, health, matching
candidate JS/CSS, and anonymous state isolation. Post-release browser checks use
the real deployed frontend with every API request intercepted to the synthetic
local server; no real child's account is used.

This is browser-engine/viewport verification, not physical iPad certification.
There is no live per-child database comparison. Rollback is a source revert of
these presentation changes and normal redeployment; no data rollback is needed.
Future interface simplification must retain the stage in the learning route and
keep conquest as a primary home/navigation destination.
