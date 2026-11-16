# Automatic learning pilot — 2026-11-16

Baseline: `37e91d634305c1475abfa032d4929eac16ad12e5` in DennisTCLin/quintus-star-tide-academy. User authorized implementation, preservation checks, coordination and release.

## Outcome and boundaries

Children enter a reviewed probe directly instead of confirming every topic as school-taught. Dated independent answers, errors, help and examples select a bounded group (at most six questions). After at least three probes, sufficient safe capacity can end the group early. Real battles still require six questions and fail on three cumulative errors. Demonstrated prior ability can start a battle directly without daily onboarding. After each three rewarded rounds, an unconsumed earned checkpoint offers one probe group only when reviewed assessment gaps remain; it survives midnight and does not repeat on retry. Scheduled probes exclude already-certified equivalents and preserve unfinished sessions. Requested battle difficulty is used only to order the already-safe pool, never to introduce unlearned filler.

The planner keeps current grade, subject, school/source compatibility and explicit concept prerequisites. Two different independent source families establish concept readiness. Numeric transfer remains restricted to the existing frozen template signatures. Facts, vocabulary, exam items and reading never gain unseen-item authority from an unrelated example. A later slip does not revoke other independently learned exact items; it does revoke the failed item and does not certify unseen transfer.

Incorrect probes lead to a reviewed example and assisted practice; subsequent different questions are independent probes. Numeric examples use a different item of the same reviewed signature when available. Vocabulary/factual teaching explains the actual item. Same-day hint/example/retry contamination, imported-history exclusions and dated spaced-review rules remain in force. Insufficient verified content stays out of challenges; a six-question battle is never padded with unreviewed content.

School-exposure reports and old scope APIs are retained as historical, explicit claims. They no longer gate demonstrated ability and are never inferred or rewritten as “school taught this.” Existing question bank, answers, school/source mappings and reward formulas are unchanged. No account migrations, resets, database schema changes or production data writes were performed.

## UI and persistence

The child screen contains progress dots, the current question/visual, listen, choices, teach-me and pause/next. The manual topic list is removed. Header dashboards, raid summaries and floating companion are suppressed during this focused activity; navigation remains available. Interface annotations remain hidden; phonetic learning content remains intact.

New sessions add `pilot: 1` (and `advance: true` for earned next-step groups) and can contain different reviewed concepts within the same grade/subject. Each server response hides all non-current question IDs and unearned answers/explanations/targets. Existing scope/lesson/answer sessions retain IDs, answered prefixes and history; resuming a legacy scope opens its existing question without another questionnaire. Separate device sessions use existing command receipts, revisions and account locks. A corrected legacy cross-day example path marks the actually displayed item as exposed, rather than its stale first-example pointer.

## Verification

- `npm run build`: passed (content hashes/oracles, pronunciation coverage, TypeScript, browser and server builds). Existing pronunciation entries unchanged; 28 additional short UI phrases reviewed and added.
- Final ordinary Vitest: **1,738 passed**, 195 files; database-gated cases exercised separately.
- **41 isolated PostgreSQL suite files, 384 passed assertions/tests**. See `output/automatic-learning-pilot/database-acceptance.json`. Adult/shared-game fixtures were updated to exercise the new automatic flow; security/data-preservation assertions retained. The final 41-file rerun had one unchanged 5-second case timeout in `finals-round6-cloud`; a fresh isolated rerun passed all six cases in 4.55 seconds total. Initial-release local lock/statement timeouts were also rerun in isolation. No timeout or performance standard was relaxed.
- **64 Chrome/WebKit checks**: grades 1/2/4/6, widths 320/375/390/768/820/1180/1440, no horizontal overflow, primary listening control above fold, all short math choices/help above fold at 375+ widths, navigation hit tests, no manual scope UI/annotation, independent authenticated contexts, assisted answer, error→lesson→different practice, bounded completion, exact economy comparison.
- **4 earned-checkpoint browser flows**: Chrome/WebKit at 375×667 and 820×1180; independently learned foundations → new-concept probe → three answers → six-question battle preparation. Currency and tickets unchanged throughout.
- **2 recorded-audio browser flows**: genuine media playback/time advancement, HTTP 200 assets, choices locked until recording completion, lesson audio button. No audio mocks.
- Independent read-only verifier: no unresolved blockers; 89 focused tests, 50 multi-day grade/course simulations reaching battle capacity, 25 mixed-result simulations; independently reproduced and confirmed the cross-day legacy exposure fix. Follow-up review ran 96 focused tests, the original twelve-voyage stagnation reproducer (including midnight), and the retry-blocked gap case with no unresolved blocker. Durable twelve-voyage regressions cover both standard/timed and relaxed modes: earned probes only before voyages 4, 7 and 10, reviewed new concepts, six safe battle questions and normal rewards.
- Content audit retained 6,764 approved static question hashes and 42 approved templates (23,192 generated variants). No question content edits.

Limitations: viewport/touch emulation is not physical iPad hardware testing. Browser TTS depends on installed Taiwan Mandarin/English voices; real microphone/audibility was not part of this change. No live production per-child database snapshot was available, so preservation evidence is code/schema non-mutation plus isolated authenticated database tests, not a claim of comparing every real account before/after.

## Release and rollback

The existing exam/roster chat confirmed no competing edits or deployment and reserved this release window. Use latest Dennis main; preserve existing Railway service, domain, database and main auto-deploy settings. Verify deployed commit, SUCCESS state, `/healthz`, anonymous-state isolation and matching browser assets after merge.

Do **not** blindly roll back to the old StudySession validator after any pilot session has been saved: it rejects mixed-topic sessions. A rollback candidate must retain the new `pilot`/`advance` validation, example exposure and active-session continuation support while disabling new pilot entry/restoring prior presentation as needed. Test old and new saved sessions before release. Do not delete or rewrite children’s saved learning or reward ledgers to make rollback pass.
