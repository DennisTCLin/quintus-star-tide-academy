# 複習功能驗證（2026-10-26）

- 基礎：正式站 `fcc8586`，已合併管理員在線／能力雷達／唯讀家長艙。
- 四項功能：再練一組、錯題修復、今日複習、家長摘要。
- 單一寫入者實作；獨立唯讀複核已找出並修正學校變動恢復、其他作答路徑間隔重查、重試標記重複三項反例。複核最終 PASS。
- 完整隔離 PostgreSQL 回歸：124 個測試檔、901 項測試 PASS；包含新的 12 項 domain、4 項交易測試及指定孩子管理員摘要驗證。
- `npm run build` PASS，包含題庫內容審查、注音完整性、TypeScript、正式靜態資產與伺服器 bundle。
- 手機／平板：`browser-qa.py` 使用真實本機 PostgreSQL/API 與 WebKit；檢查跨裝置、重整、錯題原題間隔、獎勵不變、短螢幕捲動、實際音檔播放解鎖、全題耗盡、唯讀管理員摘要。結果見 `browser-verification.json`。
- WebKit 在刻意離線時可能記錄 `/api/state due to access control checks.`，獨立列於 expectedOfflineDiagnostics；其他 runtime error 必須為零。
- QA 帳號與密碼皆為本機合成資料，限定 `postgres://127.0.0.1:55432/study_review_browser`；沒有用真實孩子帳號作答或修改任何正式獎勵。

每題每日第一次作答才影響摘要；舊精熟沒有日期就不偽造到期紀錄。一年級數學島保留原流程，未混入新摘要。

復原可回復應用版本，保留 JSON 中選填 `learning.study`；不需資料庫結構回滾或清除孩子進度。正式驗證以已測試資產的 SHA-256、健康端點與匿名權限邊界為準，不以部署請求已送出當作上線成功。

正式上線：`5954d4f4111f48dff6e7da48d267baf6f094074b`，Railway `e111b2be-d8c2-4ab8-8ded-5e442343d0ba` SUCCESS。正式 16 個檔案 SHA-256 全符，health 200，五個保護端點匿名均 401，/admin 200 且 HTML 與測試版本一致。
