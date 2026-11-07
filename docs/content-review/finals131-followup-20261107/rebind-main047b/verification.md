# PR22 整合正式 main047b

此候選保留已核定的210題，只將更正後PR22（386bd570）與已發布成人/world main047b合併。沒有包含PR23的108題、額外55題提案、三年級或英文新增。131份原卷仍非全數逐題通過。

合併時只有注音可讀字典、packed、人工讀音覆寫與產生的audit報告衝突。字典採base92ad44三方逐key合併，保留main既有修正與移除、PR22返景/鹿柴及象/像語境讀音；無任意以單側整份覆蓋。可讀字典26843 phrases/3029 chars，人工phrase440，packed依合併結果重新產生。

|檢查|實際結果|
|---|---|
|建置/內容audit/注音/TypeScript/Vite/server|PASS；6521 static、23192 generated、0findings。|
|普通完整測試（最小環境、允許localhost、逐檔）|1593 PASS、334條件skip、0fail，所有suite PASS。|
|每檔全新空本機PostgreSQL|36檔、339 PASS；每檔publicTablesBefore=0。|
|skip精確配對|file＋fullName＋occurrence，334/334皆對到PG PASS；5重疊，1927 unique PASS。|
|獨立來源反證|main6311、PR22完整6521、生成23192逐物件相等；approval深相等；無adult/world/auth/DB/獎勵執行碼差異。待最終head綁定。|
|375×812 CUA合成UI|完整象/像動物語境；點象只答1次、coins1234→1244，自動到第2題；重載回港口後接續仍第2題。scrollWidth375、0brokenImages。|
|正式資料/部署|此重綁沒有查詢正式資料庫、正式QA、合併遠端或部署。需獨立新窗口的BEFORE/AFTER。|

兩輪原沙箱普通測試在server.test本機HTTP setup hook逾時，0failed assertions但整體success=false，不列為PASS，原始JSON/log完整保留。最後以不含正式憑證/TEST_DATABASE_URL的最小環境、允許本機臨時埠重跑，既有測試與timeout均未更動，才取得上表結果。

父版已完成逐題盲解、原卷/出版社/冊次/單元交集核對，來源與答鍵輸入byte exact不變；本次反證與回歸測試不取代原卷逐題審查。來源80/50/1等歷史研究數量也不等同131份已審完。

正式main若先加入其他PR，本候選不得直接發布舊base；必須重新整合、比對實際差異並重跑受影響檢查。全部既有ID、孩子與成人的帳號、進度、學習紀錄、收藏與獎勵均不可清空、重設、還原舊快照或改寫。正式資料保全證據不得沿用成人發布快照。
