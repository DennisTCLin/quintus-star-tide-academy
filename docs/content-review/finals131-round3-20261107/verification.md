# 第三輪108題驗證

原3213154候選已因上游PR22內容修訂停用。現已合入PR22修訂386bd570並重新建立獨立固定基線；最新測試/來源保全閘門見rebind-386bd，以下結果保留作原候選歷史，不能當新版或最新main的發布放行。

堆疊基線為凍結PR22的036cf3818ae0df912b934378a77f0349295e5537，tree b3c890b3ad93c851117dd7863cecd84e8786ad94。本批未部署；正式整合前仍須合併當時main、重跑受影響檢查及獨立新BEFORE/AFTER。沒有用本文件取代正式資料保全閘門。

| 閘門 | 實際證據與界線 |
|---|---|
| 內容與出處 | 115候選＝108新題＋6去重＋1隔離；五組answer-free盲答及修訂包、原卷相關頁、同年度出版社、同冊單元交集均完成。詳mapping、README、blind-expected與evidence/falsifier.json。無英文、無三年級。|
| 原題保留 | 舊6521個questionById完整物件及approval不變；23192生成題不變。獨立git基線內存編譯比對、新題108/108索引讀取深相等、原注音phrases/chars舊條目改變數0。|
| 建置 | build/audit/439注音語境/tsc/Vite/server全部PASS；6629 static、23192 generated、42 pools、0findings。evidence/build.log.gz。|
| 普通全套 | 1576 PASS、296條件skip、0fail；evidence/general.json及lossless gzip log。|
| PostgreSQL全套 | 31支測試各建立獨立本機合成DB，300 PASS、0fail。每支保存databaseName及執行前public table數0；evidence/cloud-per-file原始JSON/log.gz及results.json。|
| skip精確對應 | repo-relative file＋exact fullName＋occurrence ordinal，296/296 skipped逐項對到PG PASS、4項普通/PG重疊、0未覆蓋，共1872個不同測試PASS。evidence/skip-pg-coverage.json。|
| 保存與一次獎勵 | 8條課程array/prefix-v1共16種前版本合成保存表示；登入/讀取前後raw DB文字SHA和updated_at不變、完整family一致。各課程六題來源分流、重載、逐次作答/重送不重發、其他profile/券不變。不是正式孩子資料快照。|
| 實際刷題UI | CUA IAB Chromium、375×812，8條航線實際點第一題答案、各只發一次＋10，重載港口再繼續均在index1。操作中6條離頁前已接題；g1 pairs及g2 pairs在回頁後按下一題。API紀錄本身沒有auto/manual欄位，不能獨立細分6/2，更不能宣稱8條自動接題。16張成對前後截圖（另存1張接題截圖）、原始DOM/metrics/API commands在evidence/browser。水平寬375、缺圖0、console warn/error0。|
| 正式部署與保存 | 尚未執行，不宣稱108已上線或131份全卷通過。|

低年級聲調SVG及純注音選項已目視；五/六年級題目完整可讀。未宣稱實體音訊或iPad Safari驗證。既有一般中文字ruby缺口未在內容批次擴改。UI伺服器僅合成memory fixture，不實作其他無關社交端點，亦不讀寫正式帳號。

曾攔下的問題：新題原被追加到questionIndex建立後，會造成108個ID讀不到題；已改成建索引前註冊並加全108讀取斷言，修正後才執行上述完整測試。書面「一幅畫」沿用全站字典本調政策（ㄧ），題目若問連讀已明寫並隱藏旁注/使用通用TTS；沒有更動全站一/不規則或放寬檢查。

重現：先npm run build，再不設TEST_DATABASE_URL執行npm test。將evidence/run-cloud-isolated.py與make-coverage.py放至output/finals131-phase3，專用本機PG55931啟動後逐支新建空DB執行，再建立skip對應；不可共用有殘留資料庫。qa-server.mjs也須複製到output/finals131-phase3並從repo根執行（相對import build/game.mjs與server.mjs），只在44001–44008提供合成fixture，再由瀏覽器實際送答。固定前版本fixture來源/重建方法在fixtures/README.md。

新增大墩主證據10格涉及11份PDF。source-disposition-131.json仍只代表出版社狀態：55 confirmed、75 needs_primary_evidence、1 conflict；原347頁渲染與頁首初篩不是逐題全部准入。q/a同sourceId計數不可和題數混加，空白答案/缺圖/錯年級等旗標不因出版社補證據而消失。
