# Math Island integration

Source: https://claude.ai/artifact/8GvDqzBBgETCYTh6cX38Mr, matching `origin/jeremy/exam-g1-trial@9911e59` island module. The artifact exposes the island from its grade-one player route. The older five-question family app and its client-side reward logic were not merged.

## Product behavior

- Grade-one home, course selection and shared subject picker offer Math Island; existing standard courses remain available. The current course picker, dirty-room confirmation and fixed quiz actions from `c46a752` are retained.
- Three open units: counting to ten, decomposition/composition, addition within ten. Nine interactive games; guided demonstration, practice, guardian challenge, mixed king challenge. Unimplemented source units remain clearly closed.
- Guided learning permits corrections without credit for a wrong first answer. Practice/guardian/king stop after three wrong first answers; failed practice does not unlock a guardian. All scored modes use the shared six-question / three-mistake contract. Completion requires all six submissions and at most two wrong first answers; king requires three defeated guardians. Guided learning does not consume or award battle-completion stars/bonuses.
- Server owns generated questions, first submissions, progress, review stars, frozen companion, help, finish and quit. Unsubmitted solution fields are redacted from state/start/finish and receipt replay.
- Progress lives per player in authenticated family JSON. Reload/relogin resumes the question, concept-boundary/remedial demo and used help effect. Leaving a round keeps it; explicit end releases the active round but retains progress/attempt history.
- Coins/mastery share the existing 15/day cap. Distinct correct first answers earn companion XP and learning-material progress beyond that cap. Eligible six-question challenge completion automatically saves one star within the shared 3/day allowance; two saved stars exchange for one ticket. No client-authored reward totals are accepted.
- A spark bonus earned by six rewarded correct answers on the run day can be collected once when opening the result the next day. This matches ordinary voyages: it adds no next-day completion star/allowance or question credit; repeated finish adds nothing. Answers submitted after the run day earn no coins/XP, and a delayed finish earns no completion star.
- Ordinary active/pending-reward voyages and island active rounds exclude each other. Generic departure resumes the active island. Old families without the optional field still load. Imported snapshots cannot create authoritative island progress or rewards.
- Completion shows coins/XP/material packs/saved star and a direct gacha entry. Standard result reward choice and gacha actions precede the construction journey panel.

## Verification

- `npm run build`: PASS, including TypeScript and pronunciation check. Island JS loads on demand (~51 kB minified, including shared reviewed phrases); it reuses the packed pronunciation dictionary instead of shipping the raw dictionary a second time.
- Full `TEST_DATABASE_URL=postgresql://127.0.0.1:55432/star_tide_monsters_20261025 npm test`: PASS, 64 files / 528 tests.
- Independent read-only verifier: PASS, 8 suites / 100 tests including three real PostgreSQL API cases. Four findings fixed: resume demos, persistent help effect, early-finish solution redaction, current 120-point best-voyage cap. App-level reduced-motion scroll was also fixed.
- Real API coverage: duplicate simultaneous request receipts, stale revision, repeated/premature answers, forged points/grade/mode, second login resume, separate accounts/players, early terminal finish receipt, no repeat completion reward.
- CUA browser QA on isolated localhost account: completed counting lesson including wrong-first/corrected attempt; coins remained unchanged on correction; 4/5 result, 40 coins/XP (this initial QA preceded the final exclusion of guided lessons from completion-star rewards); reload returned to question 2; help persisted after leaving/reentering; question 4 resumed its new concept demonstration. Split-candy and duck-addition demos inspected.
- Widths 320/390/768/1440: document width equals viewport; three island controls. Narrow counting objects were changed to a four-column grid after a 320px clipping finding. Evidence: `outputs/math-island/viewports.json` and local screenshots (not required in production bundle).
- Fresh review fixes: third-mistake result uses honest failure narration and a supportive, non-success mood; it never promises a skipped remedial demo. Manual ear-button replay works with automatic voice off. Sound recognition always has countable dots, preserving the server answer. Four feedback/render/speech regressions and one six-question completion regression were added. Full suite includes real PostgreSQL API cases after rebuilding the server.
- Island annotations reuse the shared reviewed phrase rules as well as character readings. Corrected 朋友 to ㄆㄥˊ ㄧㄡˇ against [MOE concise entry 2895](https://dict.concised.moe.edu.tw/dictView.jsp?ID=2895&la=0&powerMode=0), with a contextual regression and assertions for all 203 shared reviewed phrases. This is separate from the global pronunciation-generation gate. Local character differences are the intentional verb 數 and Taiwanese 企; retained 空幾格 and 狐狸 context rules.
- Guardian keypad touch targets: four columns on phones, six on wider screens. Browser measurements at 320/390/820/1024/1440 widths are respectively 52/69.5/75.33/105.33/117.33 px wide, all 56 px high; all 12 keys keep 0–10 then confirm order, without document overflow. Local isolated fixture unlocks the guardian only for this layout check.
- No real child's progress used or modified by QA. Physical Safari/audio output was not independently verified; captions and replay remain usable.

## Compatibility and rollback

The family version stays 6 with an optional validated `mathIsland` field. Grade-one reward ledgers additionally accept the bounded `isl-*` namespace; normal catalog allocation remains unchanged, including n1/c1 readers.

After live island rewards exist, do not deploy a pre-island validator: those older readers reject `isl-*` ledger entries. A rollback must retain the island schema/ledger readers and active-round resume/quit support, while disabling new island starts if necessary. Do not delete, reset or rewrite children's progress to roll back presentation.

## Release

- Live runtime: `63e9ce9b8908a061fa4ef6ceac172d4764311314`, pushed on `codex/math-island-integration`. Includes the separately reviewed battle-setup adjustment from `08c58d8`: start beside team selection, sticky controls, collapsed element guide, and no construction panel on the battle page.
- Railway deployment `a44bcfe5-4977-46d9-8fef-7b2e0ab3e5a0`: **SUCCESS** on 2026-10-25. Clean `git archive` snapshot, not the shared dirty checkout. The initial upload returned 502 and left deployment `9e5bda0e-0955-4751-ae13-816795f9d371` without a build; retrying the same snapshot succeeded and the platform removed the abandoned attempt.
- `/healthz`: HTTP 200. All **46/46** checked entry/assets match the local runtime SHA-256, including all eight compiled JS/CSS chunks. Two initial Python transport timeouts were rechecked successfully with curl. Full evidence: `outputs/math-island/production-verification.json`.
- Independent coordinator verified the public live login page, expected compiled entry and zero console errors; authenticated learning flows were exercised in isolated local accounts. No actual child account was changed for verification.
- Final integrated build and real PostgreSQL suite: **64 files / 528 tests PASS**. Local UI proof includes small-phone key targets, explicit confirm behavior, six-question success and third-mistake failure. Physical Safari audio remains unverified.
