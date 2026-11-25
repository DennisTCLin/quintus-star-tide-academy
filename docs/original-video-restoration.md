# Restore original visible media, keep text concise

The November 16 home simplification put the six-film hero, story posters, training/home scene, and companion display inside a default-closed `harbor-extras` disclosure. Navigation closed it again; a later change stopped mounting its contents until it was opened. The homepage companion launcher was also hidden with CSS. The source media were intact.

Comparison: pre-simplification `2e5afaef`, base `9c57ef5a` (including the restored learning battles), and this change.

## Changes

- Render the six original hero films and the two original story poster entries directly on home, before the course map. Preserve the primary conquest and learning departure controls above them.
- Remove the whole-page disclosure state and navigation reset. Render the original training/home scene and companion art normally. Restore the animated companion launcher in a dedicated home row, so it cannot cover film controls or story posters.
- Shorten the hero to the player name and “一起去冒險”; remove the story intro sentence. Only the statistics and long route instructions use disclosures. Keep the visual grade-four ability compass visible.
- Let the visible hero play even when part of the course map is also visible. Each scene retains its own visibility handling; the companion dialog still suspends the hero. Keep manual pause, reduced motion, data saver, background/offscreen handling, and poster fallback.
- Retain six explicit clip controls with touch-sized targets and three columns on small screens.

## Media inventory

| Media | Disposition |
| --- | --- |
| 破浪啟航、夥伴領航、護盾挑戰、星鯨巡遊、極光群島、流星許願 (six mobile + six desktop files) | Restored to normal homepage rendering; original files and playback component retained |
| 《最後一道光》 (48 seconds), 《最後一座燈塔》 (146 seconds) | Both original poster entries visible; original player, narration, captions, and explicit play controls retained |
| Training/home scene, companion display and animated companion launcher | Restored normal visibility |
| Learning and formal battle cinematics, victory/defeat, onboarding dragon, companion actions, conquest battle | Existing media and normal gameplay conditions retained; no asset or player replacement |
| Dev-only animation galleries and deliberately excluded malformed monster actions | No change |

No server, schema, question, scoring, economy, reward, or child-record changes. Original Chinese pronunciation entries and original media assets remain unchanged.

## Validation

- Production build (content audit, pronunciation validation, TypeScript, Vite, server bundles) passes.
- Full available Vitest run: 197 files / 1,752 tests pass; 39 environment-gated files / 379 tests skipped. No database suite rerun is needed for this presentation-only change.
- Browser evidence uses disposable local accounts and a loopback-only PostgreSQL instance. All API calls, including the deployed frontend walkthrough, are routed to that local API; production account writes are zero.
- `output/original-video-restoration/local-browser-results.json` records viewport/grade coverage, each decoded and playing clip, both story players, restored scenes, reduced motion, offscreen/manual pause, and unchanged learning/economy ledgers. Screenshots and QA scripts are retained locally in the same folder.
- Three additional local frontend learning flows pass (Chrome, WebKit, reduced motion), including real decoded attack feedback and unchanged economy.
- Latest focused media/battle tests: 24 pass. Chrome/WebKit cover 320, 375, 390, 820, 1180, and 1440-pixel widths, grades 1/2/4/6, both motion settings, 30 exact-source hero playbacks, 12 story playbacks, map/hero simultaneous visibility, and companion pause retention across navigation.
- Independently reviewed source and visual evidence before release. Release verification compares the deployed boot entry and relevant JavaScript/CSS bytes with the tested build and checks health and anonymous API isolation.

Rollback: revert this presentation commit and redeploy. No data rollback or migration is required.
