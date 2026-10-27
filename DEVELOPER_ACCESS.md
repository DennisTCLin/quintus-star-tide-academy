# 星潮共同開發與 MCP

程式碼：https://github.com/quintus-star-tide/star-tide-academy （私有）。

## 帳號與授權範圍

每位開發者使用自己的 GitHub、Railway 帳號。星潮專用 GitHub 組織可設兩位 Owner；星潮專用 Railway 工作區可設兩位 Admin。這兩個管理空間只用於星潮，避免管理權限擴及其他專案。

邀請送出與接受是兩個步驟。對方需使用受邀 Email 所屬帳號接受邀請，之後才能驗證有效權限。不要共用密碼、Cookie、CLI 登入檔、個人 API token 或部署金鑰。

## 取得程式碼

接受 GitHub 邀請後，以自己的帳號登入 GitHub CLI，再複製專案：

```sh
gh auth login
gh repo clone quintus-star-tide/star-tide-academy
cd star-tide-academy
npm ci
npm test
npm run build
npm run dev
```

需要 Node.js 22.12 以上。共同主分支為 `main`；變更可建立工作分支並透過 Pull Request 合併。完整管理權限也允許直接修改，請避免覆蓋另一位開發者尚未完成的工作。

## 連接 Railway 官方 MCP

支援 OAuth 的 MCP 客戶端可使用伺服器網址：

```text
https://mcp.railway.com
```

由每位開發者登入自己的 Railway 帳號，OAuth 授權時只選星潮專案／專用工作區。MCP 權限不會高於該帳號的平台權限，OAuth 授權可在個人 Railway 設定中撤銷。

若編輯器透過 CLI 連接，安裝官方 Railway CLI 後，在該開發者自己的電腦執行：

```sh
railway login
railway mcp install
```

依互動選單選擇實際使用的編輯器。這會使用該開發者自己的 CLI 登入，不需要將另一位管理員的憑證寫入設定檔。官方遠端 MCP 不接受 project token。

官方文件：https://docs.railway.com/ai/mcp-server

## 操作既有正式專案

接受 Railway 邀請後，先確認專案名稱與工作區，再連結：

```sh
railway link --project c54c10ea-8ba1-49bb-9a40-bcdacef64f29
railway status
```

目前既有 production 服務 ID：`33cc03ca-0f08-4307-bfbb-d79550f51efa`；environment ID：`3f27cde0-a75d-4560-8d2a-56254884b8fb`。

正式網址：https://quintus-star-tide-academy-production.up.railway.app/

正式部署前執行測試與建置；部署後確認 `/healthz` 回傳成功。GitHub 儲存庫的建立本身不會自動啟用 Railway 的 GitHub 自動部署；以 Railway 實際服務來源設定為準。

目前沒有雲端資料庫。學習進度保存在各使用者瀏覽器，分享程式碼或移轉工作區不會搬移孩子的瀏覽器紀錄。

## 驗收與撤權

接受邀請後確認：可讀取私有程式碼、管理星潮專案設定、查看部署與日誌；這次授權沒有開放其他專案。以角色與有效權限查詢驗證管理能力，不以刪除正式資源測試。

離開協作時，移除 GitHub 星潮組織成員與 Railway 星潮工作區成員，並檢查另行建立的應用程式授權、部署金鑰與 token。各自帳號亦可撤銷 MCP OAuth 授權。最後確認被移除的帳號不能再存取。

## 建立進度（2026-10-24）

- GitHub 組織與私有儲存庫已建立，程式碼已上傳。
- 已寄送 GitHub Owner 邀請至 `r99245016@gmail.com`；GitHub 邀請清單及 API 均確認角色為 Owner（API：`admin`），尚待對方接受。
- Railway 專用 Pro 工作區 `Star Tide Academy` 已建立（ID：`d523e299-01c5-4df7-9a15-f407e154501c`），星潮已移入；查詢確認只含此專案。
- 已寄送 Railway Admin 邀請至 `r99245016@gmail.com`；API 回覆成功，尚待對方接受。
- 移轉後既有正式網址的 `/healthz` 成功，服務部署狀態為 `SUCCESS`。
- 兩邊的邀請均已送出；尚待受邀者接受，並在自己的電腦登入官方 MCP。接受後再驗證實際存取權。
