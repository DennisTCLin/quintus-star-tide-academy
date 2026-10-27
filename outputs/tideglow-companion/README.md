# Tideglow interactive AI companion

Implemented on `codex/tideglow-ai-companion`, starting from `f8a8690`.

## Delivered behavior

- One bottom-right companion, with a larger interaction room reachable from the harbor.
- Ten silent Higgsfield animation states: idle, greet, pet, feed, play, listening, thinking, speaking, cheering, rest.
- Tap/stroke to pet; tap or drag a snack; a finite three-hit star-ball game with a stop control.
- Existing authenticated, per-player AI conversation and reviewed fallback replies; care choices add conversation context without changing family balances, inventory, XP, or rewards.
- Grade-one picture/audio controls and grade-two pronunciation annotations. Matching ocean, mint, and gold styling.
- Quiet during quizzes, island learning, live battles, and modal flows. Pause/hide, reduced-motion stills, video-error fallback, and cancellation on close/player changes.

## Media provenance

`generation.json` records seven new Kling 3.0 jobs, start/end reference, prompts, estimate of 52.5 credits, and three reused pilot jobs. `results.json` records terminal results. `delivery.json` records runtime hashes and file sizes. All ten MP4s were independently decoded: H.264, 640×640, 24 fps, 5.041667 seconds, no audio. Sampled frames are distinct. Speaking is an expressive animation, not phoneme-level lip synchronization. No recurring generation automation was enabled.

## Verification

- Production build and pronunciation checks passed.
- PostgreSQL-backed full suite: 81 files / 638 tests passed before integration of separately authored changes.
- Focused tests: 22 passed, including care idempotency, authorization, account isolation, and unchanged economy.
- Independent read-only verifier found no blocking counterexample. A controlled hook harness confirmed zero stale updates/speech after unmount and cancellation when context changes.
- Anonymous live-provider calls returned all three care replies with the configured production provider; no database or child information was used. Final relevance/phrasing validation accepts pet and feed and rejects the awkward play wording in favor of the reviewed fallback (`live-ai-check.json`, `live-ai-final-validation.json`). Four reviewed care words and all 10,000 adjacent vocabulary pairs passed pronunciation tests; unrelated scenery, wrong gesture, and the observed awkward concatenation have regression coverage.
- Browser acceptance is coordinated separately across 320/390 px, portrait/landscape tablet sizes, desktop, and native macOS Safari. The local browser fixture uses guided replies; it is not evidence of live AI. Physical iPad hardware has not been tested.
- Browser findings fixed: global full-screen minimum height on dialog, sticky close header, and grade-two ruby wrappers in both care and dialogue options.

## Release and rollback

The root chat is the sole integrator/deployer. Integrate exact tested commits from the island/progress and Brownie authors, rerun the combined suite, then push/deploy the frozen commit. Production health/assets and anonymous provider checks are required. Brownie's author separately completed idempotent provisioning against the compatible current runtime, with unchanged original-account data and production login verification; the new avatar ships in this batch.

Rollback target before this batch: Railway deployment `6abed637-05be-4dd7-9764-44fef7777030`, runtime `c56c70a4b04ad3affc005c2c96b0ba813b02bd05`. No database migration is required for this companion change.

## Completed unified release

Railway deployment `67dc60cf-526a-4307-8ef4-2edd1c4f6e60` is SUCCESS, running `16c7f02fcbf8e0eac8c11d2e40870d4818cf4e5b`. The final production build and **83 files / 649 tests** passed after the island, ownership-preview, Brownie, care-language, and pronunciation changes were combined. The independent reviewer accepted all three App conflict resolutions, and the final narrow-phone UI gate passed.

Production entry HTML, JavaScript, both style bundles, ten videos, and poster all match local SHA-256 hashes (`production-verification.json`). Three anonymous provider calls inside the deployed container returned AI responses for pet/feed/play (`production-ai-verification.json`); this verifies connectivity and gesture relevance, not exhaustive language-quality guarantees. The temporary verification SSH key was revoked, its local key pair removed, and the key registry confirmed empty.

The release used a clean Git archive, excluding drafts and test outputs. `release.json` records release scope and limits. Browser testing used synthetic accounts; no real child progress was used for these checks.

Independent production UI acceptance passed in a Safari private window on an existing initialized synthetic QA player: harbor launch, large room, animation, pet feedback/action unlock, and live AI conversation were observed. The clean production screenshots are included. Shared-cookie IAB observations were discarded; the private window isolated testing from real child sessions. No questions, collections, or equipment were changed for the companion smoke. Physical iPad testing remains outside the evidence.

The final coordinated island-preview production smoke also passed in the private QA window: three synthetic profiles matched their five-island ownership counts, all thirty entries were checked, and expansion did not start a journey. The verifier logged out and closed the private window. Selected clean evidence from `fb7583e830654551ae6e5f5ad7461b4b308b1329` is stored in `outputs/island-collection-preview/production-verification.json` and `production-preview.png`; larger AX transcripts remain in the source evidence branch. No remaining release gate is open.
