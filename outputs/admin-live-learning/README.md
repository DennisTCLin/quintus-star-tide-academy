# 管理艙：在線、能力雷達與唯讀家長艙

範圍：管理員名單顯示有效孩子心跳（5 秒讀取、最長 35 秒 lease）、沿用港口的能力雷達、超管查看所選孩子的家長艙。保留一般／星耀券發放與原有管理權限。

## 驗證

- `npm run build` PASS：內容審核、注音、TypeScript、前後端打包。
- 聚焦 4 個檔案、46 項測試 PASS；完整隔離 PostgreSQL 回歸 122 個檔案、884 項測試 PASS。
- `browser-verification.json` 記錄 WebKit iPhone 13 / iPad 第 7 代的 30 項操作檢查，包含 320–1024 px、在線更新、斷線重連、選人競態、報表錯誤恢復、長發券原因換行、權限範圍與 JavaScript 錯誤。
- `no-mutation.json` 比對合成測試資料庫全部 game_states 的完整前後內容；管理頁查看與測試沒有修改學習、收藏、券數或版本欄位。
- QA fixture 使用隨機本機資料庫，啟動前建立、結束後刪除；暫存登入資料只在權限 0600 的 `/tmp` 檔案，不進版本庫。
- fresh verifier 發現長字串發券原因在手機可能溢出，已修正並新增上限 200 字元原因、32 字元帳號測試；也獨立檢查多孩子家庭只回傳所選 profile、排除共用文字流水帳。
- `verify-production.py` 在部署後比對所有 JS/CSS SHA、入口 HTML、健康狀態、匿名存取拒絕與手機/iPad 管理登入頁。不使用真實管理員密碼、不更動正式孩子資料。

實體 iPad/iPhone 尚未驗證；WebKit 裝置模擬不能等同實機測試。

本機瀏覽器重跑：

```sh
python /path/to/webapp-testing/scripts/with_server.py --server 'node outputs/admin-live-learning/qa-server.mjs' --port 4332 -- python outputs/admin-live-learning/verify-browser.py
```

需先完成 build、本機 PostgreSQL 在 55432、Python 有 Playwright 且已安裝 WebKit。
