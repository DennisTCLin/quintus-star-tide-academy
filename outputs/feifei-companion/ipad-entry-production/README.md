# iPad 學伴入口修正驗證

2026-10-26，程式提交 ea9c320；Railway 4aea1536-c00f-4279-bcd2-ed2833451d53 已成功上線。7 個公開資產雜湊與本機建置一致，healthz 正常。

根因：首頁傳入 launcherMobileOnly，CSS 在寬度 >=701px 隱藏入口。移除這組條件，維持既有答題／對戰等場景的 suppressed 規則。斐斐仍使用原本的 Higgsfield 透明動畫與靜態備援，素材未重做。

本機與正式網址各通過 40 項 Playwright 檢查：WebKit／Chromium，393、700、701、768、810、834、1024、1194、1366、1440px。768px 直向與1024px橫向皆驗證擊掌、吹泡泡、休息原始動畫畫格變化、關閉後焦點、捲動後入口、去背 alpha、無水平溢出。另驗證減少動態、WebP載入失敗時的透明PNG備援，以及庭羽與同年級其他孩子的身份隔離。

瀏覽器使用 iPad Chrome UA 與觸控模擬，並非實體 iPad。正式網址驗證載入真實公開素材，但 /api/* 使用合成測試回應，沒有登入或修改孩子帳戶。28 項相關單元測試與完整 build 通過。

重現：FEIFEI_QA_URL=https://quintus-star-tide-academy-production.up.railway.app FEIFEI_QA_OUTPUT=outputs/feifei-companion/ipad-entry-production /tmp/star-tide-dog-qa/bin/python outputs/feifei-companion/ipad-entry-qa.py
