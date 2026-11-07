# Precise polyphonic-context correction and fresh verification

This supersedes the unreleased `e5c01dcb` PR23 candidate. Its 143-artifact package remains intact as history. Base remains released main `8465de69f91ff51d6f8c677a634fb68f7dbfb45a`. Only the same 108 reviewed questions are admitted; no extra proposals, English or grade-three questions are included, and Brownie English is excluded.

Independent negative control found that adding the weight-unit character reading 磅＝ㄅㄤˋ produced an incorrect first syllable and missing second syllable for 磅礴. MOE entry23998 specifies **ㄆㄤ ㄅㄛˊ**, pāng bó, first tone. The prior evidence's “páng” notation was incorrect and is superseded here. The fix adds only the exact 磅礴 phrase to curated/readable dictionaries and repacks. Character-level 磅 remains ㄅㄤˋ. MOE77333 confirms 看家＝ㄎㄢ ㄐㄧㄚ; the 看 character remains ㄎㄢˋ. No global character reading is changed.

`evidence/primary-reading-evidence.json` records exact primary URLs. Real `syllables()` assertions cover 磅礴, 氣勢磅礴, 一磅, 英磅, 看家, 觀看 and standalone 看. The actual new question's complete 看家 prompt and explanation were also checked for longer-phrase shadowing. `precise-context-controls.json` retains before/after values.

| Gate | Current result |
|---|---|
| Content and scope | Original 108 question objects/options/answers/approvals, seven source registrations and eight grade/course lanes are unchanged. Main's 6,521 complete static objects and 23,192 generated objects/IDs remain protected by exact-main baseline tests. Original exact Git archive and eight stored/runtime fixtures remain in the historical rebind package. |
| Source delta | Relative to e5: one test, three dictionary files and compiled game change; all other 779 captured inputs are identical. Adult compiled bundle unchanged. The new phrase is absent from all 6,629 static objects: actual e5→fix reading comparison changes zero question fields. |
| Existing main reading impact | Fresh actual scan still finds exactly 24 old questions / 33 fields / 28 strings gaining previously empty 霍/陡/磅 annotations. Rows match the previous exact-main comparison; no existing nonempty syllable is replaced. This is not a blanket assertion about arbitrary UI prose. |
| Build | Content audit, 445 curated pronunciation contexts, packed equality, TypeScript, Vite and both server bundles pass. Static6,629/generated23,192/pools42, zero findings. An explicitly recorded successful build follows an initial invocation whose completion result was not retained; both logs are kept. |
| Ordinary suite | **1,610 pass / 350 conditional skips / zero failure**, success true. Includes the new real-syllables context regression. |
| PostgreSQL | **37 new distinct empty local databases / 355 passes**. Names are disjoint from e5's batch; all start with zero public tables. Full fresh reports and logs are retained, rather than reusing old DB results after the compiled-game change. |
| Exact coverage | All 350 skips match PG passes by file/fullName/occurrence; five overlaps, zero uncovered; **1,960 unique checks pass**. |
| Mobile UI | All eight lanes freshly rerun from the corrected build at measured375×812. Q1 correct→automatic Q2 without Next click→reload through harbor→Q2; API evidence shows one answer, one advance and1,234→1,244 once per lane. All16 before/reload measurements have no horizontal overflow or failed image. Captured console warning/error log empty. |
| Input binding | All784 source/runtime/test/build/fixture inputs match the fresh pre-test snapshot after completion. Old143 artifacts are untouched. |
| Formal release | **Not pushed or deployed. Pending new fixed-head independent review, coordinator source gate and separately authorized fresh formal BEFORE/AFTER and canonical deployment verification.** |

The UI harness injects the reviewed first question, removes challenge and uses memory API; normal allocation/persistence/rewards are separately tested on fresh local PostgreSQL. It does not establish formal authentication/database preservation, normal timing, audio or physical iPad Safari. A stale browser tab handle was rebound, then explicitly passed into the helper; saved Q2/evidence were checked before continuing, and API counts prove no repeated answers. No application change was made for this harness recovery.

No account, progress, reward, history, saved-ID, adult/world/server or database implementation is modified. No formal actor commands or direct formal database reads/writes are planned by the root publisher. Any source rollback must preserve current live player state, never restore an old database snapshot. `artifact-index.json` binds this correction package; original content and exact-main fixtures remain in their original immutable directories.
