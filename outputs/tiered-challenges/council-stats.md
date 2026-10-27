# Codex Council Session Stats

Token numbers are local estimates, not actual Codex usage, billing telemetry, hidden prompt overhead, or exact tool-call accounting.

- Mode: standard
- Type: implementation
- Token profile: compact
- Status: verified-ready-for-release -> build
- Frontend gate: active
- Roles: 6
- Reviewers: 3
- Evidence runners: 1
- Validation: ok

## Pre-execution estimate
- Total tokens: 10465
- Input/output tokens: 8795/1670
- Range: 7848..14127

## Post-execution estimate
- Total tokens: 8112
- Input/output tokens: 1263/5230
- Coverage: partial
- Member input/output: 666/925
- Reviewer input/output: 222/2502
- Synthesis input/output: 375/1045
- Scorer/stats artifacts: 1114
- Estimated tool overhead: 505

## Artifact-only tokens
- Total tokens: 11940
- Text counted: 47760 characters, 4548 words
- Artifact files counted: 42

## Delta
- Post - pre tokens: -2353
- Post / pre ratio: 0.7752

## Calibration recommendation
- Action: do_not_calibrate
- Message: Post estimate is partial; persist complete prompts and outputs before updating future multipliers.

## Missing/unmeasured data
- Coverage: partial
- Unmeasured overhead note: No access to actual Codex billing/API usage, cached input, hidden system prompts, or exact tool-call token accounting. Tool overhead is estimated.
- partial output: reviews/coverage-integrator.md
- partial output: reviews/leonardo-ux-ui-critic.md
- partial output: reviews/performance-impact-reviewer.md

## Largest Artifacts
- session.json: 1836 estimated tokens
- reviews/scores.json: 1132 estimated tokens
- final.md: 1045 estimated tokens
- reviews/anonymous-candidates.md: 878 estimated tokens
- preflight-estimate.json: 765 estimated tokens
