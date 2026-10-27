人工覆核：coverage 為 partial。下方 CLI 的 full 只表示檔案齊備；成員 prompt 引用共同 brief，未完整計入工具讀取與間接上下文。6641 是已保存評議材料的局部估算，不是整體實作用量或帳單。不得據此宣稱節省或自動調降未來預算；未保存使用者額度偏好。Final Call 為 build，已正式發布；CLI pending 來自欄位解析，不代表執行未完成。

# Codex Council Session Stats

Token numbers are local estimates, not actual Codex usage, billing telemetry, hidden prompt overhead, or exact tool-call accounting.

- Mode: standard
- Type: implementation
- Token profile: compact
- Status: complete -> pending
- Frontend gate: active
- Roles: 6
- Reviewers: 3
- Evidence runners: 1
- Validation: ok

## Pre-execution estimate
- Total tokens: 10498
- Input/output tokens: 8828/1670
- Range: 7873..14172

## Post-execution estimate
- Total tokens: 6641
- Input/output tokens: 1287/3735
- Coverage: full
- Member input/output: 683/1235
- Reviewer input/output: 288/954
- Synthesis input/output: 316/1297
- Scorer/stats artifacts: 1114
- Estimated tool overhead: 505

## Artifact-only tokens
- Total tokens: 12074
- Text counted: 48294 characters, 4695 words
- Artifact files counted: 35

## Delta
- Post - pre tokens: -3857
- Post / pre ratio: 0.6326

## Calibration recommendation
- Action: decrease_future_estimates
- Message: Post estimate was materially below preflight; decrease the local multiplier cautiously.

## Missing/unmeasured data
- Coverage: full
- Unmeasured overhead note: No access to actual Codex billing/API usage, cached input, hidden system prompts, or exact tool-call token accounting. Tool overhead is estimated.

## Largest Artifacts
- session.json: 1805 estimated tokens
- final.md: 1297 estimated tokens
- candidates.md: 1229 estimated tokens
- reviews/reviews.json: 997 estimated tokens
- preflight-estimate.json: 765 estimated tokens
