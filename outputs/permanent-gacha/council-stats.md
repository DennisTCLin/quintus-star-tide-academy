# Codex Council Session Stats

Token numbers are local estimates, not actual Codex usage, billing telemetry, hidden prompt overhead, or exact tool-call accounting.

- Mode: standard
- Type: frontend
- Token profile: compact
- Status: completed -> build
- Frontend gate: active
- Roles: 6
- Reviewers: 3
- Evidence runners: 1
- Validation: ok

## Pre-execution estimate
- Total tokens: 10478
- Input/output tokens: 8808/1670
- Range: 7858..14145

## Post-execution estimate
- Total tokens: 13918
- Input/output tokens: 8463/3840
- Coverage: partial
- Member input/output: 3894/1170
- Reviewer input/output: 4189/1492
- Synthesis input/output: 380/1142
- Scorer/stats artifacts: 1110
- Estimated tool overhead: 505

## Artifact-only tokens
- Total tokens: 29106
- Text counted: 116424 characters, 11634 words
- Artifact files counted: 45

## Delta
- Post - pre tokens: 3440
- Post / pre ratio: 1.3283

## Calibration recommendation
- Action: increase_future_estimates
- Message: Post estimate exceeded preflight materially; increase the local multiplier.

## Missing/unmeasured data
- Coverage: partial
- Unmeasured overhead note: No access to actual Codex billing/API usage, cached input, hidden system prompts, or exact tool-call token accounting. Tool overhead is estimated.

## Largest Artifacts
- evidence-runners/browser-evidence.json: 6318 estimated tokens
- session.json: 1828 estimated tokens
- reviews/reviews.json: 1499 estimated tokens
- prompts/reviewers/leonardo-da-vinci-brutally-honest-ux-ui-critic.md: 1425 estimated tokens
- prompts/reviewers/performance-impact-reviewer.md: 1383 estimated tokens

Operator coverage correction: follow-up dispatch wrappers/tool traces not exhaustively archived. Automated artifact-existence coverage was full, but actual execution coverage is partial. These are not billing figures.
