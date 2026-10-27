# 上方進度列版本（本機）

http://localhost:4348/ ，console_short /0742（已在驗收頁登入）。沒有部署。

題數與答對目標移到戰鬥上方單列；移除數字圓圈；失誤次數在夥伴HP旁；聽題貼近題目；其他工具位於答案下方。

- build通過，最終TypeScript檢查通過。
- layout-results.json：58組Chromium/WebKit尺寸檢查，含手機直向/橫向、iPad直向/橫向、長題、圖片及長英文選項。是模擬尺寸，未以實體裝置測試。
- progress-results.json：進度列在戰鬥上方，答對數更新、下一題更新、錯答失誤數更新、影片可見且頁面不捲動。

新版截圖：chromium-short-375.png；測試腳本與結果保存在本目錄。
