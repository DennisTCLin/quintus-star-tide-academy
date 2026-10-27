# iPadOS 15 companion visibility repair

This is the historical still-visibility repair. The later `../ipad15-motion/` suite supersedes still-only failure expectations with actual animated care fallback. Use that suite for current playback verification.

A real iPad Pro 11 on iPadOS 15.4.1 showed a cream rectangle where Olivia's dog should appear. The exact hardware failure is not reproducible here. Inspection confirmed a resilience gap: the old actor rendered only a native video poster until `play()` rejected or a media error arrived. Pending startup or silent stalls had no independent image.

The actor now keeps an action-specific image above the video until a presented frame is reported. Older engines without the frame callback use advancing decoded media time. DOM muted/inline properties and attributes are set before playback, media dimensions are explicit, and a bounded watchdog restores the still after startup failure or loss of advancing playback. Background/offscreen/reduced motion keeps the still; new actions retry playback. Stale source callbacks and completed media cannot end a newer action. Failed action images fall back to the original matching mascot.

All twelve existing dog clips remain unchanged. Integration preserves the new original Tideglow action media from 6fbd059. No account, permission, reward, learning-data, schema or API changes.

## Evidence and limits

- `npm run build`: content audit, pronunciation, TypeScript, frontend/server build PASS.
- Isolated PostgreSQL full suite: 129 files, 937 tests PASS.
- Focused lifecycle/mascot/gesture suite: 4 files, 26 tests PASS.
- Fresh independent review reproduced an unbounded silent post-start freeze in the first patch. The final helper tracks advancing time after a rendered frame; independent recheck passed the freeze, 60-second normal playback, stale decoded callback, and ended-event cases.
- `browser-qa.py`: modern WebKit/Chromium with synthetic API responses and deterministic media faults. Includes actual distinct action playback, silent/signaled freeze, pending/no-frame/rejected/broken videos, broken image fallback, background return, pause/resume, reduced motion, both mascots, 390/834/1194 layouts and an engine without frame callbacks. Results in `browser-results.json` when completed.
- `integrated-qa.py`: 11 additional WebKit/Chromium checks PASS for the new Tideglow action videos, rest loop beyond the watchdog, reduced-motion poster, and dog fallback. Together with the original 51 browser checks, 62 checks passed.
- `verify-production.py`: deployed JS/CSS and all dog assets, health/HTML, MP4 byte ranges and actual WebKit UI under synthetic API interception. Does not sign in to a real child or alter production progress.
- **Physical iPadOS 15.4.1 remains unverified.** Modern WebKit plus an iPad viewport is not the old iPad engine. A user refresh/retest is needed to confirm that particular device.

The native-poster risk is consistent with [WebKit bug 234743](https://bugs.webkit.org/show_bug.cgi?id=234743), including Safari 15.4 reports; this does not establish the exact cause on the photographed device. Frame callbacks first appeared in [Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/).

Local QA (after build; requires Python Playwright, WebKit and Chrome):

```sh
python /path/to/webapp-testing/scripts/with_server.py --server 'node outputs/ipad15-companion/serve-qa.mjs' --port 4334 -- python outputs/ipad15-companion/browser-qa.py
```

Rollback: revert this frontend commit on the latest main; do not deploy an old schema-7 server over current schema-8 state.
