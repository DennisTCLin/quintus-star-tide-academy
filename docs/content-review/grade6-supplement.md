# Grade-six Chinese, social and science supplemental release

2026-10-26. Parent supplied 30 files. This batch adds 100 curated, self-contained adaptations: Chinese 30, social 40, science 30. This is not a complete transcription of every exam, nor confirmation of Jianan's current assessment scope. Publisher labels follow parent file classification; none of the inspected covers proves an exact textbook volume. The source exams have no independent answer key; answers were reasoned from the complete adapted question and independently reviewed.

## Sources and selection
- Chinese: 民權114/113/112、舊莊112、延平110、舊莊108、幸安108、碧湖108、麗湖108. Files7/8 are byte-identical; source8 is explicitly duplicateOf7 and contributes no extra question count. File9 DOCX uses section locators and null page, not invented pagination.
- Social: 內湖112、河堤112、民權111、成德110、延平110/109、成德109、溪山108、延平108、幸安108. File9 DOC converted to HTML and its three source passages visually checked in WebKit; null page retained. River-bank exam112 contains an inconsistent111 later header; metadata follows cover112.
- Science: 永安114、和順114、普仁114、大華114、安和114、東光114、安和113、明義113、和順113、獅湖113. All first pages visually checked; scanned file3 both pages checked.
- File fingerprints are in output/alston-supplement/source-hashes.json. Original exams remain outside the public app.

## Exclusions and corrections
- Missing source passages/diagrams are not prerequisites in any released question; necessary context is supplied in adapted prompts. Open-ended composition and sentence writing are not forced into arbitrary single-answer grading.
- Chinese sound questions require Taiwan dictionary verification and are not included in this batch. Old flu-medication/vaccine reading is excluded. The early suspected 崖/涯 ambiguity was retracted after checking Taiwan readings and is not recorded as a source error.
- Social current-officeholder, future election and economic prediction items are excluded. Historically dated facts retain their dates. Constitutional-role items explicitly describe the constitutional division of powers, not present personnel or operations.
- Science false statements presented as original true/false choices are not treated as source errors or imported as facts. Diagram-dependent weather/experiment questions excluded. Volume-change comparison was tightened after fresh review to equal initial volume, constant pressure, equal cooling and no phase change. Thermometer question specifies a liquid-column thermometer; air-mass properties specify the source region.
- Constitutional cross-checks: https://www.president.gov.tw/Page/284/1241 ; https://www.exam.gov.tw/cp.aspx?n=22 ; https://www.cy.gov.tw/cp.aspx?n=91&s=247 . Sculpture attribution: https://www.ntmofa.gov.tw/News_Content.aspx?n=1383&s=223668 . Taiwan pronunciation reference for the retracted concern: https://dict.mini.moe.edu.tw/ (崖).

## Verification
- Root is sole repository writer; three read-only source explorers and a separate fresh verifier reviewed the adaptations.
- Fresh review of all100: content PASS after volume-comparison correction; final evidence hash recorded below.
- TypeScript PASS; focused grade-six suites11 tests PASS; authenticated curriculum/review PostgreSQL21 tests PASS (synthetic accounts only).
- No real child's learning progress, PIN, account or friendships changed by this release. All new courses use existing mastery/review storage and school filtering.

Final reviewed bank SHA256: `e40632180e25ad2fed512d7c33117240feef8ed85ca87774aa13f64627891795`.
- Full build PASS; full unit suite106 files /746 tests passed,21 files/171 DB-gated tests skipped in that invocation (separate21 PostgreSQL tests passed).
- WebKit12 cases: each new subject at390×844,820×1180,1180×820,1440×900; five island cards, four answer choices, correct grade, no horizontal overflow or page errors. Phone science and landscape-tablet Chinese screenshots inspected. This is browser emulation, not physical-device performance certification.

Integrated main5b22fbc (grade-two auxiliary Zhuyin removal) without conflicts. Unified build PASS; full suite747 tests passed,171 DB-gated skipped; new-subject WebKit12 cases repeated PASS on the integrated frontend. Grade-two entrance copy now says 中文閱讀與語音. Extra science text-wrapping check at four widths passed; an initial fixture lookup used accounts rather than player_logins and failed without changing data, then was corrected on the synthetic local database only.

## Production result
Runtime9f17cee, Railway deploymentf593a67b-d4c5-49fe-9e3b-4dd387e2e68c: SUCCESS. `/healthz` OK; all4 initial JS/CSS asset SHA256 values match the tested local build. Public WebKit login smoke at390×844 and820×1180 PASS with no overflow/page errors. Account-based curriculum checks used only the isolated local synthetic database. Evidence: output/alston-supplement/production-check.json and production-browser.json. Release coordinated with chat35; its grade-two change is included.
