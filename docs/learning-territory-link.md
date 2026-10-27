# Learning, battle and territory connection

## Decision

Build the bounded Council proposal: show named stored materials globally, explain what each learning voyage contributed, connect companion growth to free castle expansion, and take a learner to an actionable building goal. Keep the answer surface focused and rest optional. Do not add material rewards to client-controlled arena combat or change the material economy.

Standard compact native Council used six independent member lenses and three anonymized rubric reviewers. Candidate B scored 9.0833 and D 9.05: a close result, synthesized rather than treated as a decisive vote. Initial scoring retained implementation/browser blockers. Child-choice dissent and stock-versus-pending clarity shaped the final design. Native role diversity is not multi-provider diversity; no performance gain is claimed.

## Behavior and authority

- The top ribbon reads the existing authoritative profile snapshot. Stored balances and queued learning materials remain distinct; offline mode labels the last synchronized stock. No new polling, production settlement, or countdown is introduced.
- New runs persist optional `materials: { credited, packs }` inside the existing answer transaction. Every five eligible correct answers still awards 20 wood, 12 stone and 6 star; carry-over remains. Attribution does not depend on capped companion XP. Legacy runs with no receipt remain unknown rather than displaying fabricated zero earnings.
- Client snapshot migration strips material receipts as well as existing learning rewards, including retained pending-reward runs. Replays, duplicate answers and cross-device reloads use server state.
- Home and arena preparation/results have a compact learning/home cue. Active questions keep only the small material progress line. Completion offers rest before construction details, preserves pending rewards, and shows exact per-run gains.
- Goal navigation selects a free plot and the chosen building, or focuses the actual unlock/expansion/storage/opening control. Stored building count and ID exhaustion block false readiness. Navigation itself does not spend materials, build, or reset a run.
- Castle growth uses the existing any-companion level threshold and free expansion. It does not add combat buffs.

## Verification

- Full real-PostgreSQL suite: `TEST_DATABASE_URL=postgresql://127.0.0.1:55432/star_tide_monsters_20261025 npm test` — 41 files, 380 tests passed.
- `npm run build` — pronunciation validation (3433 source runs), TypeScript, client build and server bundle passed. The existing bundle size warning remains; latency and throughput were not benchmarked.
- Fresh independent falsification found two release blockers: 48 stored/placed buildings incorrectly appeared buildable, and a retained legacy reward run could retain client-authored material attribution. Both were fixed; independent targeted rerun passed 31/31 tests.
- CUA browser checks used synthetic local profiles and real PostgreSQL: 320/390/1440 widths, grade-2 ruby, 50,000 stored values plus pending stock, reduced motion, reload, profile switching, keyboard entry, full land, locked goals, unopened territory, capacity, once-only queued deposit, actual answer progress, offline recovery and rest return. No economy commands were created by goal navigation. Detailed observations are in `outputs/learning-territory/browser-checks.json`.
- Final browser pass found a long grade-2 rest notification overflow; wrapping its message and preserving the close button fixed it (390px viewport and scroll width both 390). Final build passed after this UI-only fix.

## Integration and rollback

This change is based on the current five-question baseline. The six-question owner merges this branch and adjusts the old “訂正也能累積” copy to the new first-submission rule. Receipts are already bounded by `run.questions.length` and allow `ceil(length / 5)` packs, so a six-question run can complete two packs after four carried answers. Previously credited materials remain on a failed run. The separate HomeScene change can replace the homepage cue while retaining the ribbon and result receipt.

Push this feature for unified deployment with the six-question release; do not independently deploy the older battle baseline. Reverting the feature commit is sufficient for UI rollback; optional receipts are backward compatible and require no bulk reward recalculation.
