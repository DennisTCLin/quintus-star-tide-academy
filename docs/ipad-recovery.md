# iPad recovery entry

Baseline: `d49a0da357b6435c5fe08dcb69029499605b6324`.

The reported device is an iPad 7 running iPadOS 18.7.10. The user reports that opening the website stays on the photographed screen. The actual device failure has **not** been reproduced; this change provides a diagnostic/recovery route, not a confirmed root-cause fix.

`?safe=1` forces the existing reduced-animation paths on both the login screen and signed-in game. It prevents decorative video mounting and sprite animation work, disables animation/blur effects, and shows an explicit exit link. The choice is URL-local, with no account preference, score, cloud schema, or audio-setting changes. Question audio remains available. A React boundary offers retry/mode switching on render errors. A static HTML fallback remains if entry JavaScript cannot load. Cloud startup remaining pending for 15 seconds shows recovery controls.

The application keeps its original static import arrangement. A trial lazy App import was removed after WebKit retained an aborted dynamic import across reload. Existing lazy game routes are unchanged.

## Validation

- PASS: `npm run build`, including TypeScript and pronunciation checks.
- PASS: `npm test -- src/__tests__/recovery-mode.test.ts src/__tests__/hero-carousel.test.ts src/__tests__/island-motion.test.ts` — 3 files, 16 tests.
- PASS: `git diff --check`.
- PASS: independent read-only review; fixed static fallback/error heading contrast and made retry call `location.reload()` so fragment URLs also reload.
- PASS: isolated Playwright WebKit against production build, local synthetic API responses only:
  - Safe login and signed-in home have no video elements; login request succeeds and preserves safe URL.
  - Login at 320, 768 and 1024 pixels has no horizontal overflow.
  - Explicit exit removes only the safe flag and normal video capability returns.
  - English quiz resumes, sends an answer with the correct player/run/index, command ID and revision, and stays video-free. Synthetic response updates the UI; this is not a real cloud-persistence test.
  - Injected render error shows readable recovery; retry with a fragment performs a new request; safe link preserves the fragment.
  - On final static-import build, an injected normal-mode render failure recovers through the safe link to usable login.
  - Blocked entry JavaScript retains readable static recovery; lifting the block and clicking the safe link loads login.
  - Simulated hidden-document cloud startup shows recovery controls after 15 seconds (virtual clock).

Screenshots: `output/playwright/safe-login-1024.png`, `safe-home-1024.png`, `safe-quiz.png`, `error-fallback.png`, `static-fallback.png`.

UNKNOWN: actual iPad recovery result and original failure cause. Modern WebKit does not reproduce this particular device's memory limits or OS runtime. React boundaries cannot catch Safari process termination or failures before entry JavaScript executes. No production child account or progress was accessed/modified during QA.

Rollback: revert the recovery commit; no data migration is involved.

## Final integration checks

The integrator fixed an independently identified same-origin URL edge case: a route beginning with `//` now retains its explicit original origin when toggling safe mode. Coverage includes entering/exiting safe mode while preserving other query parameters and fragments. Independent follow-up review: PASS.

Final root build: PASS. Full isolated PostgreSQL suite: 90 files / 689 tests PASS. The normal voice UI was rechecked with WebKit (16 checks, including 21 component checks). Nine additional anonymous WebKit checks passed against the final local build: safe entry without video requests, layout, normal-mode exit, blocked entry script recovery, and render-error recovery. See `outputs/voice-battle-release/local-recovery-browser.json`. The original physical iPad issue remains unverified.

Production verification: runtime `cb4bb77`, Railway `fcf15771-cea8-4d88-b302-5412fef80c15` SUCCESS. All 29 health/asset-hash checks and 9 anonymous WebKit recovery checks PASS. Evidence: `outputs/voice-battle-release/production-recovery-verification.json` and `production-recovery-browser.json`. This confirms public deployment and browser recovery; physical-device status remains UNKNOWN.
