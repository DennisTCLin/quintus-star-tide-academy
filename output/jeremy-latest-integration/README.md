# 最新維護版與 Jeremy 數學島整合驗證

整合說明：`docs/jeremy-math-latest-integration.md`。本資料夾保存本次合併後重跑的證據，不沿用舊測試結果作為通過依據。

所有資料都是合成 fixture。伺服器固定綁定 127.0.0.1，使用專屬本機資料庫 `star_tide_latest_browser_20261026`；腳本拒絕以既有帳號取代新建立的測試帳號。沒有正式玩家存檔、正式登入資料或資料庫備份。密碼從環境變數讀取，不寫入版本控制。

重跑需要 Node、Python Playwright 的 Chromium/WebKit 與本機 PostgreSQL。此次使用 PostgreSQL 17 的 port 55432；若在其他環境重跑，需明確調整腳本中的本機工具路徑及測試庫連線。不要將它們改成正式資料庫。

執行順序：

1. `npm run build`、`npm test`。
2. `python run-database-tests.py`（由 repo 根目錄執行完整相對路徑）：23 套各建一個全新測試庫，結束即移除。
3. 設定 `MATH_QA_PASSWORD` 為任意一次性測試密碼，再設定 `QA_PASSWORD` 為相同值。建立空白 `star_tide_latest_browser_20261026`，執行 `node output/jeremy-latest-integration/start-local.mjs`。它會產生 `/tmp/jeremy-latest-*` fixture 與動態 URL。
4. 依序執行 `browser-check.py`、`voice-keypad-check.py`、`phone-layout-check.py`、`next-button-check.py`、`course-browser-check.py`、`course-guard-check.py`、`math-course-guard-check.py`。不要平行執行會重設相同合成帳號的腳本。
5. 停止這個專屬 server，再移除上述瀏覽器測試庫。不停止共用 PostgreSQL 服務。

數學流程依賴真實本機 API 與保存。iPad 回歸中的好友通知以合成回應模擬；語音使用測試引擎追蹤生命週期，不代表實機音質已驗證。WebKit 的全控制項鍵盤巡覽使用 Option-Tab。

瀏覽器結果中的 navigation/context teardown 訊息僅記錄主動重新整理或關閉頁面時的 state 請求取消；一般操作期間的錯誤會使腳本失敗。原始取消訊息保留，沒有宣稱瀏覽器日誌完全為空。

`verification.json` 是總索引，`scope-check.json` 是原版保護範圍，`source-inventory.json` 記錄 Jeremy 來源內容數量，`preservation.json` 記錄本地原有檔案保留與測試庫清理結果。

文字日誌只清除行尾空白與多餘的結尾空行，保留測試結果、警告及建置內容。
