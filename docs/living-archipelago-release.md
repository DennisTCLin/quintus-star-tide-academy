# 高解析動態群島（2026-10-25）

## 交付

升級現有網站，沿用帳號、題庫與進度。以 Higgsfield 製作美術，沒有另建 Higgsfield Game 專案。

- Higgsfield `flux_3_image`，4K 選項，單張19 credits；job `18d2926a-b719-469f-aa93-136ae06b30e7`。
- 參考既有 panorama，生成5456×3072無字場景；發布960、1600、2560、4096寬WebP（約128KB、311KB、763KB、1.82MB）。原始PNG保留於本機visualizations的living-archipelago-workfiles，未將29MB來源加入網站。
- 移除播放時覆蓋背景的1280×720影片，始終保留清晰背景。
- SVG按新場景座標裁切局部瀑布流光、池面波紋、薄霧、火山光暈。全景鏡頭與建築不移動，裝飾不攔截點選。
- 科目入口改為象牙白／古金銘牌，沿用各島屬性色。手機顯示短名稱；二年級手機銘牌省略注音，完整注音保留在下方科目卡，桌面銘牌仍有注音。
- 沿用可見性、暫停、系統低動態、省流量、安全模式、夥伴介面暫停與首頁動態授權握手。載入新圖失敗時退回原圖並停止局部動畫。

## 驗證

- PASS：course-selection / stage-visibility / hero-carousel，22 tests；正式build與注音檢查。
- PASS：Chromium，1/2/4年級 × 320/390/768/1440，沒有水平溢出、入口互疊或越界，所有入口至少48×48。
- PASS：WebKit mobile，同12組尺寸／年級；水流transform隨時間變動、觸控入口導航正確、srcset依裝置選擇960至4096資源。
- PASS：瀏覽器14項動態檢查：初始offscreen、授權握手、實際水流、暫停全部動畫、恢復、滾出停止、suspended、reduced、靜態仍可導航、safe、省流量、圖片備援、備援靜態、不載入舊影片。
- PASS：獨立唯讀複核程式與畫面，無阻擋發現。
- PASS：整合特邀券main後，隔離本機PostgreSQL、`npm test -- --no-file-parallelism`，110檔799項全數通過。初次平行執行4項child-account全庫快照測試受其他測試同時寫入影響；改以序列執行後全數通過，沒有改動測試或產品邏輯。
- 測試使用本機合成fixture，未操作正式孩子帳號。

## 範圍／回復

CourseSelection、遊戲規則、帳號與題庫路由未修改。可獨立撤回本次群島元件、CSS與新資產；舊poster仍保留作備援。發布前整合當時main，避免覆蓋平行特邀券更新。

## 正式發布

Runtime commit `626dbd56b9de46f7166932591ced5a4dbc979adb`；Railway deployment `8cb25295-a5b0-4748-8ddc-6a0c34b29237` SUCCESS。正式站14個HTML/JS/CSS/新地圖檔SHA256均與本機正式build一致，health200/ok、匿名state401。證據：`output/playwright/living-archipelago/production-verification.json`。
