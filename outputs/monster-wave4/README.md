> 2026-10-27 發布更新：已依使用者要求上線首批 30 隻，待修影片以安全備援動作取代，另外 20 隻未開放。下方原始製作／驗收紀錄保留。詳見 `docs/monster-wave4-release30.md`。

已於 150 段原始動畫完成後停止生成；150 支去背影片與 300 項 Chromium／WebKit 播放檢查完成。21 段免費修剪通過重驗；25 段建議重做、5 段可選細修尚待確認。實體 iPad 未驗證，沒有部署。

完整的 150 段停止點、免費修剪結果及付費重做建議，見 [`docs/monster-wave4-quality-review.md`](../../docs/monster-wave4-quality-review.md)。所有追加重做均未送出。

## Latest user limit (2026-10-27)

User says stop animation production at 150 original videos: complete the first 30 creatures, five actions each, then stop submitting originals. Preserve all 50 portraits. Slots 151–250 are deferred, not authorized to submit now. `production-control.json` is authoritative and the pump reads it before every cycle. Seven already approved paid replacements are complete; additional paid replacements must await the consolidated final review list. Do not deploy the incomplete 50-creature feature. After 150 are collected, stop processing watchers, report quality findings and clarify the eventual release scope with the user.

## Current production status

User confirmed credits replenished. Verified balance 4,003.68; original 160 remaining clips are estimated at 4,480, so a 476.32-credit shortfall remains at that snapshot. Paid production may resume within the already approved scope and total estimate. Never resubmit an existing job ID. Check `video-jobs.json` for current jobs and `credit-block.json` for any later block; do not rely on the committed checkpoint counts. Original video 89 was still generating at the 89-file checkpoint. Seven replacements were complete.

# Wave 4 production workspace (not production assets)

User approved 50 Higgsfield portraits + 250 four-second 720p animations, then explicitly approved seven reframing replacements for video indices 8, 14, 29, 41, 43, 44 and 48. Estimated allowance 7,333.5 credits total. No additional paid retries are authorized. Work solo. Deploy only when media and verification finish.

## Durable jobs

`image-jobs.json` has 50 completed original image jobs. `video-jobs.json` is the original 250-slot video batch. `redo-video-jobs.json` is separate, with seven original video indices; never merge by index with the original jobs without preserving the replacement provenance. Existing job IDs must never be resubmitted.

`pump.js` is an async Functions orchestration body using `tools`, `load`, `store`, `text`. It polls pending jobs and prioritizes the seven authorized redo submissions, keeping at most six active video jobs total. Rehydrate all job arrays from these JSON files before restarting a pump; a long-running Functions cell can hold a stale store snapshot. Never start a second pump concurrently. The JSON files are atomically written and are authoritative while a cell is running.

`padded-references.json` holds Higgsfield-uploaded technical reference preparations. Only creature indices 13–50 use these for the original video batch; 1–12 had already begun with original references. `reframe-references.json` holds the wider 600px-on-1024px references for the seven approved replacements. No changes were made to the original portraits.

`fetch-results.py --watch` downloads original jobs atomically to `source/`. `fetch-results.py --watch --redo` downloads replacements as `redo-video-NNN.mp4`; it does not overwrite originals. These signed URL records and raw source files must NOT be committed or deployed.

## Processing

`matte-videos.py --watch` reads original `source/video-NNN.mp4` files, writes synchronized side-by-side RGB/alpha H.264 movies into `public/assets/monsters/wave4/`, and atomically appends to `matte-videos.json`.

Current fast invocation:

```sh
PYTHONPATH=/tmp/star-tide-wave4-torch WAVE4_MATTE_PROVIDER=MPS python3 outputs/monster-wave4/matte-videos.py --watch
```

BiRefNet Lite model weights are official MIT-licensed files from `ZhengPeng7/BiRefNet_lite` pinned to revision `aa62cd87eafb9cc43056d08ef3615a14628b831d`. Safetensors SHA256: `4417d89795250e698c3cb0ae8df15743810065f646f48a694fdfa7ca052d0815`. Code was inspected before loading. Torch/vision/transformers are task-temporary dependencies, not application or production dependencies.

The primary mask keeps armor intact; `key-background.py` removes saturated background spill absent from all 50 original opaque portraits. Initial portraits were checked for the candidate key hue. Bird clips 41–45 were already reprocessed locally for spill; this is free processing, distinct from paid reframing replacements. Do not use the early simple chroma-key experiment or raw square videos in a release.

All seven paid replacements are applied and recorded in `applied-replacements.json`; old sources are preserved in `source/superseded/`. Do not apply them again. Free editorial trims for entrance clips 41 and 76 keep only the fully framed opening: 41 uses its first 7/6 seconds retimed to 2 seconds, 76 uses its first 2 seconds. `editorial-trims.json` records source hashes and durations; full-length versions are in `source/uncut/`. The matte writer verifies edited hashes and accepts the corresponding 24 frames at 12 fps. No additional paid jobs.

Never edit the matte ledger or canonical sources while a matte worker is writing. Stop the single writer first and preserve old versions.

## Validation and release

- `audit-media.py`: frame coverage, motion, edge/cropping and spill metrics; contact sheets in `media-audit/`.
- `check-all-motion.py --require-complete`: all 250 clips in Chromium and WebKit, 500 checks. Cache keys include media SHA256 so replacements are retested.
- `check-motion.py`: reduced-motion and unavailable-video fallback.
- `check-capture-ui.py`: 60 touch layout checks across five players and six viewports.
- `check-capture-flow.py`: 16 successful/failed capture flows including refresh after first answer, on both engines.
- `run-database-tests.py`: 23 task-owned isolated database suites, shared PostgreSQL at 55432; do not stop the shared database.
- `package-release.py`: requires 250 validated matte entries, 500 matching browser checks and 250 clean matching frame audits, verifies all old public files against the integration base, preserves them through the established restore-assets pipeline, and includes exactly 350 new media files.

App implementation + 100 portrait WebPs checkpointed in commit `1e76ccf` on `codex/boss-wave4-capture-trial`, based on `7498f9f`. No wave-4 deployment yet. Before final commit/deploy, fetch latest main again and preserve subsequent updates. Commit final videos, sanitized provenance, selected verification results and necessary scripts only. Do not commit `source/`, signed URLs, the node_modules symlink, generated learning benchmark fixtures or temporary dependency/model directories. Restore pre-task untracked learning outputs from `/tmp/star-tide-latest-integration-backup/outputs/` before final cleanup. Never force push or clear player data.

## Manual review findings

`manual-review.json` records visual issues not caught by numeric frame checks. Index 110 (water hydra capture) invents wings throughout the clip. The user explicitly chose to collect all further redo requests and review one consolidated list at the end. Do NOT submit any additional paid replacements beyond the already approved seven. Free edits of 41, 76 and 106 are recorded in `editorial-trims.json`. The release gate rejects any unresolved visual finding.

Action prompts from original slot 126 onward use `prompt-revisions.json.originalsFrom126`, removing generic references to wings/hands/weapons absent from some references. Slots through 125 retain the original prompt records. The current pump must load this revised action array on recovery. Frame audit v2 checks peak frame-edge occupancy, not only the average; old cached audit entries must be rebuilt. Index 115 has a free-edit plan in manual review; do not pay for a replacement unless the final review list is approved.
