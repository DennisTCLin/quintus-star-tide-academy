# Element lessons with companion demonstrations

The battle team picker, in-battle rule disclosure, and companion detail now
share an interactive five-element lesson. Children choose generation or
advantage, pick an element, and watch prepare/action/result frames. Playback
runs once, with pause, resume, replay, and direct step controls.

Generation demonstrates the outgoing/incoming direction, healing the incoming
companion by at most 8, and the health cap. Hurt, nearly full, and full examples
show the difference. Advantage demonstrates an unguarded attack and separates
ordinary damage from the +8 elemental addition. Full rules retain the caveats
about turn cost, automatic replacement, guarding, and shields.

`element-demo.ts` creates an isolated battle using the existing `newBattle`,
`battleMove`, and `fighterMaxHp` functions. It never receives a profile or sends
a cloud command. Combat rules, ownership, learning rewards, and saves are
unchanged. Existing companion art is reused, with an element-symbol fallback.

The lesson is initially paused. Reduced motion uses manual steps and disables
transitions. A hidden document or collapsed battle disclosure pauses playback;
unmount clears the timer. Grade-two ruby and explicit accessible control names
are included. Phone layouts retain the stage within the viewport when playback
starts; buttons and controls remain available by scrolling.

## Verification

- Integrated published room dragging at `944af9a` (no close-up prototype).
- `npm run build`: PASS, including pronunciation and TypeScript checks.
- Real PostgreSQL `npm test`: 46 files / 419 tests PASS.
- Twelve added tests cover every directed pairing, health caps, actual rarity
  stats, invalid-index fallback, reduced-motion markup, and ruby.
- Chrome UI checks: all five generation/advantage pairs, near/full HP, pause,
  replay, cancellation when changing element, reduced-motion manual steps,
  keyboard activation, battle disclosure collapse, and dialog unmount.
- Grade-two 320px and 390px team-picker layouts have no horizontal overflow;
  the 320px companion dialog has equal client/scroll widths. All stages fit
  their visible viewport after starting playback. Ruby on selected controls
  inherits their dark text color. No browser warning/error logs were observed.
- Final visual inspection exposed intrinsic grid image overflow on desktop.
  Portrait images are now positioned inside their fixed-height container.
  Browser measurements confirm positive gaps between image and name for all
  five pairings on desktop, and an 8px gap on the 320px grade-two layout.
- Fresh read-only verifier reviewed rule isolation, lifecycle, accessibility,
  and final mobile changes. `outputs/element-animation/browser-checks.json`
  records the browser observations; screenshots remain local QA artifacts.

The existing Vite large-entry-chunk warning remains. No physical iPad test was
performed. Revert the element feature commits for rollback; no migration or
saved-state repair is required.

## Published release

Runtime `19fd981153d9420a119f2606fd1d4956b59f659f` was published successfully as
Railway deployment `738ef7eb-66c2-4d41-b494-cbe2a23406c4`. The health endpoint
passed and every production JS/CSS bundle matched the reviewed local build.
Production browser checks confirmed automatic generation ending at 68/100 HP,
advantage ending at 87/112 HP (17 + 8 = 25), bounded portrait images, and a
320px replay returning to the result without horizontal overflow. Console
warning/error logs were empty. See `production-release.json` and
`production-browser-checks.json` in `outputs/element-animation/`.
