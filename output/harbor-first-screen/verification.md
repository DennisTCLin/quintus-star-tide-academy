# 港口首屏出發區：第一個 PR 驗證

日期：2026-10-26。對應製作人審查 P0-A／原問題 #7。
基線：main `7498f9f19a35be0e3269e7bbe916cda2b8cbc77f`。實作分支 `codex/harbor-first-screen`。

## 結果與範圍

港口的單一主要出發區移至帳號／標頭下方、資源列及導覽之前。無進度時選科，有一般或數學進度時接續，舊版待領獎時先進領獎。既有 `requestLearning` 決定目的地，不另建遊戲狀態機。關閉選科視窗後焦點回到出發按鈕。

一年級保留圖示與聽說明按鈕；二年級出發文字縮為「出發」搭配明確注音、深色聲調；完整無障礙名稱仍是「選一座島出發」。其餘行程標籤維持「繼續挑戰／領取獎勵」。移除 hero 重複的主要出發按鈕，群島與既有玩法仍在下方。

僅修改 `src/App.tsx`、`src/family.css` 及本目錄證據。未改 API、DB/schema、帳密規則、進度格式、獎勵、題庫、玩法、管理員能力、校名或影音資產。沒有新增動畫、第三方服務或追蹤。

## 實際驗證

- `npm run build` 通過：內容審核、注音打包、發音文字檢查、TypeScript、Vite、server build。保留既有大型 chunk 警告，沒有把這次宣稱為載入效能改版。
- 6 個測試檔、39 項通過：subject-islands、challenge-rules、tiered-challenges、learning-journey、ready-screen-cloud、subject-islands-cloud。
- Chromium 與 WebKit：92 組版面量測、22 組登入後流程。年級 1/2/4/6；320×568、375×667、375×812、820×1180、1180×820、1440×900。起始 scrollY=0，CTA 完整可見、點擊中心未被遮擋、高度至少48px、無水平溢出；二年級注音在按鈕內。
- 無進度、準備題、舊待領獎、三錯補練、數學島、答完尚未下一題：按鈕標籤、導頁、重新整理與離線阻擋。導航前後 API 狀態比較 run/mathIsland/coins 相同。
- Chromium/WebKit：鍵盤跳到主要內容、Enter 開啟選科、關閉後焦點返回；減少動態模式；出發區文字與注音放大200%無水平溢出，按鈕可操作。放大後可能需要垂直捲動，未宣稱200%放大仍所有控制在首屏。
- 額外 Chromium 實際開啟限時題目，接續／切換分頁再回來後 runId、題號、既有 clock/deadline 與內容完全相同。準備題的 clock 保持 null，導航本身不開始倒數。
- WebKit 強制斷網時有預期 `/api/state` 網路拒絕，數量記錄在 browser-results.json；沒有隱瞞為零網路錯誤，恢復連線後按鈕正常。
- 使用者另行授權建立一個正式站專用測試帳號，登入與讀取自身狀態 HTTP200；本輪未送出正式站遊戲 command。憑證、復原碼在 repo 外的限制權限檔案，不加入程式碼、報告或 PR。全部狀態種子只在新隔離本機 DB `harbor_first_screen_20261026`，未使用真實孩子帳號。

證據：browser-results.json、extra-results.json、production-account-check.json、build-output.txt、test-output.txt，以及手機／平板截圖。

## 效能與限制

原8539f0e量測主JS gzip 180,916 → 181,325 bytes（+409）；CSS gzip 64,381 → 64,654（+273）；game-view bundle hash與大小未變。圖示修正後的建置大小另見../harbor-review-followups/bundle-sizes.json。無新增大型圖像／影片。精確 bundle 資料見 bundle-sizes.json。

五分鐘閒置流量原始資料已隨PR追蹤於 [idle-results.json](idle-results.json)。覆核時另實跑同一隔離帳號、可見375×667 Chromium視窗、前後各300秒：

| 版本 | state | online-battle | presence | API合計 | response body bytes | response header bytes |
|---|---:|---:|---:|---:|---:|---:|
| main 7498f9f | 108 | 100 | 30 | 238 | 707,080 | 56,168 |
| 港口8539f0e | 109 | 100 | 30 | 239 | 713,490 | 56,404 |

單次覆核差1次state請求、6,410 response body bytes；輪詢程式未改。這個差異符合觀測區間首尾的單次輪詢邊界，不據此宣稱前後請求數完全相同或正式站效能不變。先前239/239的原始量測另保存在 [idle-results-initial.json](../harbor-review-followups/idle-results-initial.json)，未刪除較早證據。這是本機合成資料傳輸量，不等同正式站延遲或真實家庭payload。

本 PR 不修先前報告中的登入前預載、帳號文案／隱私／完整復原流程等其他獨立問題。此輪沒有宣稱已用實體 iPad 驗收麥克風／音訊、完整發音正確性或長時遊玩效能。尚未把本 PR 發布至 Railway。

## 獨立反證檢查（Solo）

逐項查找可能失敗的路徑：數學島優先於一般挑戰、待領獎不啟新局、三錯後補練仍可進入、離線點擊不可提交、未按開始的clock為null、已開時計時不重設。程式差異確認原requestLearning與任何server檔案均未改；隔離資料前後比較及限時題驗證支援此結論。視覺檢查實際發現並修正二年級文字換行、注音對比與WebKit平板縮窄；鍵盤驗證發現並修正選科關閉後焦點遺失。

重跑多輪登入曾觸發隔離環境的既有驗證速率限制；只清除專用本機DB的request_limits後重跑，未降低正式環境限制。

## 重跑與回復

先建立新的隔離測試 DB，再設 `TEST_DATABASE_URL=postgres://127.0.0.1:55432/harbor_first_screen_20261026` 執行 start-local.mjs。該腳本只允許此 DB 名稱，產生隨機本機測試憑證到 repo 外；不接受已有相異帳密帳號。先跑 browser-qa.py，再跑 extra-qa.py（後者會刻意開始隔離限時題）。idle-qa.py 另需把基線7498f9f的前端建置與同一隔離API置於4365。所有測試會避免付費 AI 對話，沒有提交正式站學習資料。

回復方式：revert此單一前端提交並重建發布，沒有 migration 或需要逆轉的孩子資料操作。PR發布前仍需核對最新main與協調窗口，發布後需另查正式站版本及專用帳號流程。


## 發布前追加審查

- 已重新核對GitHub PR head中的idle-results.json存在，並補上上述實測前後表。
- WebKit一年級375並非只因截圖太早：networkidle/document.fonts.ready後1秒及額外5秒仍可重現外部SVG use的漸層填色消失，Chromium正常。改將原SVG符號與漸層以唯一前綴放入同一文件，保留幾何與配色，取消跨文件paint-server參照。前後截圖及DOM檢查在../harbor-review-followups/。
- 實體iPad由使用者協助驗證；已提供隔離LAN預覽連結，確認結果尚待回覆。未把WebKit模擬結果當成實機通過。
- 與boss-wave4-capture-trial的目的地優先序將保留獨立整合提交與驗證，合併完成之前不發布。
- 浮動「陪你一起學」遮擋底部導覽已列為下一PR，本輪沒有修改該定位或交互。
