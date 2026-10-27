# 王筱斐專屬學伴上線紀錄

- 日期：2026-10-26（Asia/Taipei）。
- 來源版本：8ffe757e61c8208e545f0e9f32859e608c891245。
- Railway deployment：000fe060-e72c-4611-97b8-773e63875e0b，SUCCESS。
- 網站：https://quintus-star-tide-academy-production.up.railway.app/
- 專屬身份：username、account profile 與 active profile 同為 feifei；Jimmy 同 slot 仍為潮光獸，Olivia 仍為派對狗狗。
- 黑眼睛定稿的 12 段 Higgsfield 動畫，六種互動按鈕、待機與對話狀態均有對應動畫。
- iPad 15 使用 256px / 10fps 逐格備援；其他裝置影片失敗亦使用同動作圖集。

驗證：799 tests passed、174 skipped；build passed；本機 WebKit／Chromium 50 項瀏覽器檢查通過。獨立驗證包含全素材失敗解鎖、海報備援、12 種 canvas 實際變動、休息循環和帳號隔離。正式站 health、JS entry、38 個新素材 SHA-256 與重點三段影片 HTTP Range 206 通過；正式站瀏覽器結果見 production-browser/results.json。使用合成登入狀態驗證，不改動學生資料；並非實體 iPad 測試。

第一次完整 runtime 上傳因 417 MB archive 超過平台限制而收到 HTTP 413，未影響既有正式站。改用 56 MB runtime 包：新素材與已建置程式直接上傳，544 個未變動公開素材在 Docker build 取回後以 SHA-256 驗證。全部通過才完成 image，執行時不依賴舊部署。部署用 Dockerfile、取回腳本及雜湊清單保存於 deployment/；完整 dist 仍留在本機。
