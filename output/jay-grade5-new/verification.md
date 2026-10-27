# Jay 新補21卷驗證

狀態：內容、建置、單元、隔離資料庫、UI及正式站驗證全部PASS；2026-10-27已發布。

## 範圍

- 21卷55頁，新增457：數學272、社會125、英文60。
- 原503來源＋160通用保留，Jay共1120靜態ID；數學352、國語368、英文113、自然142、社會145。
- 原數學/社會錯版卷不混入。英文Dino7/D7保留舊版來源，僅U1國家/U2交通相容交集，雙門檻要求q.curriculumMatch及source.compatibleBook；非整本Here7同版。
- 內容逐頁來源整理、分節處置與限制見docs/content-review/jay-grade5-new.md及source-manifest。

## 檢查

- 457逐題fresh盲解與最終key一致；11修正題再盲解，全數唯一解。保留初稿issues及最終修正版答案供追溯。
- Fresh來源反證者全457語義／所有選項／hint／explanation檢視，視覺抽核高風險數學圖頁與官方社會資料；有效發現全部修正，最終無未修新阻擋。未宣稱第二位檢查員逐頁視覺覆蓋全55頁。
- npm run build PASS；content-audit PASS：5475 static、23192 generated、42 pools，findings0。
- npm test：929 PASS、182 DB-gated SKIP。另全新隔離PostgreSQL school-curriculum-cloud 20 PASS；覆蓋五科與原年級路由，以及原503精熟後三科各六題續批、逐題保存重讀、獎勵及其他profile不變、API作答前正解/未來題遮罩。
- Chromium/WebKit、五科、320/375/820，共40 UI檢查PASS（30版面＋10實際點答案與重載保存），數學/社會/英文均確定新題，國語/自然仍正常。題幹全文在可捲動區、無水平溢出、五年級無普通讀題按鈕。不是實體iPad新一輪驗收。
- 初次UI合成fixture為固定長題只留2個未精熟ID，觸發正常不足6題保護；修fixture留12題後完整通過，未因此改產品邏輯。
- 完整歷史合成fixture93979bytes<96KiB guard；正式request1,000,000bytes限制未改。Node本機p95約15.96ms，不宣稱手機效能。
- 原503題及160通用原檔byte hash鎖定測試PASS；新增題不重設進度/獎勵，不改DBschema。

## 邊界與回退

只使用隔離合成帳號測寫，未登入測寫正式孩子。API遮罩不代表原始碼保密：既有client bundle包含題庫答案供本機邏輯，不是正式考試防作弊架構。

若需停用新增題，仍要保留曾持久化ID解析及dongmen驗證相容，不能刪已存精熟／航程或重設孩子資料。

已保留PR7小六試用及PR9手機/iPad/浮動學伴，合併最新main後再次build、929單元、20隔離DB及40UI PASS。457題與f3e9472內容完全一致；重新執行匯入產生器所有ID/選項/內容byte一致。bow.png與PR9發布manifest相同。

## 正式發布

- PR8合併main：76b875b4cdb118be3ba39ef0c8a00f8e497f4b18。Railway部署f2df86d2-1119-49e8-8ae0-6782f05e9d87 SUCCESS。
- 凍結打包來源：e91fcdb330baafef6e1536ef7e64551950f5ad57；與PR合併main的src/server/public/package/server.mjs產品內容相同，後續差異為文件與QA證據。
- 1988個dist檔案經打包清單驗證，1793個原有媒體保留。相對PR9，9個變更檔全數從正式站下載比對SHA與長度；186個其他當前資產與前次已驗證清單byte相同，另抽驗3個wave4圖片及bow.png。未宣稱重新下載全部1988檔。
- 正式healthz正常、未登入api/state回401；Chromium與WebKit登入畫面、inline SVG、無水平溢出、無page error全部PASS。未對正式孩子登入作答測寫。
- 三科新題的完整作答、重讀存檔及獎勵保留由隔離DB20檢查和40項UI驗證覆蓋；正式站驗證涵蓋部署檔案一致性與登入載入。
- 正式證據見production-release.json、production-assets.json及production-browser.json。任何回退須保留已持久化的新題ID解析，不得重設孩子進度或獎勵。
