# Transparent corner companion

Removes the reserved bottom strip, root scroll lock and shortened nested content scrollport. Only the transparent character and compact label remain fixed at the viewport's bottom-right. The page keeps normal document scrolling. Existing quiet-page, modal and input-focus suppression remains; keyboard browsing after closing the companion targets the document.

Validation:
- `npm run build`: passed.
- `npm test`: 935 passed, 193 database-gated skipped.
- WebKit + Chromium: 36 layout/interaction combinations (three mascots; 320×568, 390×844, 820×1180, 1024×768, 1440×900, 844×390).
- Four additional phone/tablet flows verify course-picker and leaderboard suppression and restoration on return.
- Original content reaches the viewport bottom at five scroll positions; no reserved strip, transparent containers, stable corner, reachable navigation/last control, modal close focus and keyboard scrolling.
- Dog PNG has 127,492 fully transparent pixels out of 230,400. Existing artwork unchanged.
- Visually reviewed phone and landscape iPad WebKit screenshots: page visible behind dog surroundings, no navy band.
- Independent read-only source review: no concrete regression found.

Browser tests use synthetic API fixtures and do not write player data. Viewport/browser emulation is not a physical iPad/phone test. Initial network-idle navigation timed out on animated assets; harness now waits for DOM and explicit UI readiness instead.

Reproduce: `node output/floating-companion/fixtures.mjs`, serve built dist on 47892, then run `browser-qa.py` and `suppression-qa.py` using Playwright Python. Set CORNER_QA_URL for published-asset verification with synthetic API fixtures.

Production: deployment f928551e-a119-43de-9bff-042e2b48c41e succeeded at runtime d800dc7 (PR #15). All 36 published-asset browser cases passed; seven changed files and six unchanged media samples match staged SHA256. Health passed, anonymous state remains 401. Published phone/iPad screenshots visually reviewed, including a settled Chromium phone capture after detecting a transient compositor screenshot during immediate scrolling. No player writes.
