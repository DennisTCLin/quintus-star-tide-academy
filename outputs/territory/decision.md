# Council Final Call: build

## Recommendation
Build the bounded complete peaceful territory.

## Council Result
F leads unblocked aggregate; D user-fit retained.

## Blocking Issues
Pre-build unknowns resolved by contract below. Local and production release gates passed.

## Refinements
Preserve Turing scope dissent; cosmetic residents.

## Implementation Shape
Confidence: high for tested behavior; production capacity and physical mobile devices are unmeasured.

The aggregate ranks F first among candidates without unresolved stated blockers; D has highest raw mean and strongest user fit. Adopt D peaceful loop, A boundaries, B/C transaction rules and F bounded art/state. Preserve E dissent: no additional complex resident production multipliers or construction timers in this release.

## Concrete contract resolving pre-build questions
Root sole writer; use codex/peaceful-territory baseline050d387, merge monster and gacha releases before deploy. Optional Profile.territory {version:1,...}; never replace existing profiles or modify learning currencies. 24 numbered plots, 8 initially, then16 and24; one building per plot, fixed footprint, free relocation and storage/replacement with stable building IDs and levels. Main hall cannot be stored; always produces all three resources, so spending cannot deadlock. Sixteen building/decor types, maximum five upgrade levels, city levels1–10, three island regions, optional repeatable commissions and achievements. Residents are cosmetic owned companions; zero impact on production to avoid stale ownership/retroactive bonus problems. Optional five-element adjacent generation increases production by10%, capped perbuilding; settle old rates before any layout change. No penalties/forced combat.

Economy: wood/stone/stardust independent balances bounded50000 each. Initial180/150/90; hall generates120/100/60 perhour, lowest buildings cost40wood/20stone. Upgrade cost base*(currentlevel+1), renown earned spending/building/commission; unlock levels reachable with repeatable resource-consuming commissions. Offline cap8hours; exact integer fractional carry avoids repeated-command rounding exploits. Server-controlled now, monotonic lastSettled; atomic settlement/debit/mutation/receipt under existing row lock. Reject illegal inputs before publishing cloned state. Check full old data equality outside territory. Old clients retain territory through server-side commands; migration cannot overwrite existing revision.

## Visual/UX contract
Higgsfield generates original floating-island panorama and consistent white-stone/teal/gold building art. Responsive compressed art; lazy page module. Visible selectable plots, tap/select/place, accessible list alternative, free relocation, explicit cost/action, no streaks. Main map remains focal area; reduced-motion and readable resource labels.

## Verification
Combined gacha/Safari/territory branch: 285 tests pass, including 11 territory tests and real PostgreSQL authorization/replay/concurrency/preservation checks. Peaceful-only model simulation reaches city level10, all16 types,24plots,level5 upgrades,all6 achievements. Actual browser build/upgrade/move/store/resident/commission/achievement/theme/retry/offline/reload/second-device pass; original four profiles outside territory and verified scores unchanged. Independent model reviewer found a 48-building capacity softlock; fixed by confirmed salvage of stored buildings, with30 extra adversarial cases passing. Stale remote-deleted relocation ID crash also fixed and independently falsified. Local four-family64commands p95 5.92ms. Production deployment a93dde47-4b4c-4c6a-b522-5e18bb14bac7 SUCCESS, runtime444af84. Six public asset files byte-identical, health200, isolated-account seven browser groups pass with zero pageerrors. Initial quick-action run timed out; insufficient diagnostic evidence to assign root cause. Final script waits each response and retries only explicitly observed background-sync busy with no request sent. Existing poll contention may require clicking again; no claim of new automatic command queuing.

Local role tuning: none. Six members high reasoning on inherited model, native role diversity only. Platform exposes no close-agent API; members completed/idle before reviewer dispatch. Reviews1/2 are local anonymous Chairman reviews; Leonardo separate agent; Bob equivalent root Playwright evidence.

## Frontend Evidence
Desktop/390/320 map art visually reviewed. Actual browser layouts pass320/390/768/1440. Independent UI reviewer passes24plot target centers, roving keyboard tabs, remote relocation deletion, demolition cancellation and reduced motion. Final independent320/390 x4tabs with grade2,level10,50k resources,expanded plot list and200% computed-font text-only simulation: all8 no overflow/pageerrors. This is not real device/browser zoom proof. Higgsfield island and transparent16-building atlas total1,184,604bytes, lazy-loaded page; initial page loads no territory resources.

## Audit Notes
Local estimates only. Member prompts refer to shared brief; tool accounting excludes full transitive reads, so post estimate coverage is partial despite CLI file-presence result.
