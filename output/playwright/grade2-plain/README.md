# Grade-two plain reading — 2026-10-26

Request: remove second-grade auxiliary zhuyin throughout the UI.

Changes: annotateTree retains branded icons without injecting ruby; AutoRuby respects grade-two reading context for explicit helper usages (including dialogs). QuestionPrompt uses original teaching text and phonetic formatting. ChoiceView displays Chinese text for ordinary grade-two options; protected phonetic-answer questions retain their actual zhuyin content. Grade-one math island and read-aloud policy unchanged. No CSS hiding of ruby and no changes to player data, scoring, course difficulty or permissions.

Base includes 89ddb64 English supplement. Build PASS; 10 focused suites / 97 tests PASS. Existing ruby-expectation tests updated to new requested policy. Fresh read-only verifier found no leaks or blockers; independently ran 33 focused tests PASS.

WebKit isolated synthetic grade-two account:
- home320/390/768: zero ruby/rt, no horizontal overflow;
- companion collection, ranking, gacha, companion dialog: zero ruby/rt, no overflow;
- reading question and four Chinese options: zero ruby/rt, no overflow.
Screenshots inspected. Only a synthetic local account was used. Physical mobile device not directly tested.

Rollback: revert the grade-two plain rendering commit together with expectation updates, retaining the current database reader.
