# 後續210題驗證

基線main92ad44；本批仍為candidate，不等於131份全卷通過。來源/冊次/單元限制、216→210准入及6項隔離見README與mapping。舊6311完整題物件及原approval逐筆不變，未修改帳號、保存、獎勵或資料庫實作。

| 閘門 | 實跑結果 |
|---|---|
| 獨立內容/變更複核 | phase2_falsifier只讀PASS；答案盲答packet/result/hash、210題完整語義、11來源、舊6311物件與approval一致，見evidence/falsifier.json。|
| build/audit/注音/tsc | PASS，6521 static、23192 generated、42 pools、0findings，435已審語境，完整log見evidence/build.log.gz。|
| 普通全套 | 1561PASS、280條件式skip、0fail；evidence/general.json及lossless gzip log。|
| 逐檔fresh PG | 30檔各新建本機合成DB，284PASS、0fail；evidence/cloud-per-file/results.json及每檔原始JSON/log.gz。|
| skipped精確覆蓋 | repo-relative file + exact fullName + occurrence；280/280逐一對到PG PASS，4項重疊、0未覆蓋，唯一1841項PASS。見evidence/skip-pg-coverage.json。|
| 本批新雲端測試 | 8條課程各array/prefix-v1，獨立92ad合成fixture解碼後full runtime相同，login/state前後DB原文SHA與updated_at不變；六題分配、重讀與答案只領一次獎勵。新交集不足6個來源族時保留必要既有對版補題。|
| 瀏覽器實際作答 | CUA IAB Chromium；1/2/6年級375×812、5年級768×1024。四例都answer一次、auto-advance一次、coins1234→1244、index0→1，reload→harbor→resume仍下一題；0水平溢出，0warn/error。八張圖與原始DOM測量/commands見evidence/browser。|
| 發布/正式資料保全 | 尚未執行，本文件不能代替獨立新BEFORE/AFTER及正式部署驗證。|

聲調題使用既有三個可見SVG；二年級純注音選項正常顯示20px且無ruby洩答案。五年級古詩題保留兩首完整全文。未宣稱實體音訊或iPad Safari已驗證；既存二年級一般中文字旁ruby缺口未在本批擴改。

首次新測試曾把雲端future-ID遮蔽誤當完整run，以及用不足六個新來源族要求單趟、把無sourceFamily舊題合併成一族；測試已按原產品契約修正，未改runtime或降斷言。短時間重複登入觸發限流後改沿用合法session，未停用或調整限流。舊歷史池測試以test-only helper限定歷史場景；current catalog仍由explicit child-curricula筆數與新題/PG直接驗證。

重現：先npm run build；普通npm test不設TEST_DATABASE_URL。專用本機PG55931（無正式資料）啟動後執行evidence/run-cloud-isolated.py，再evidence/make-coverage.py。每檔另createdb，不能用共用殘留DB代替。固定基線fixture來源與重建說明見fixtures/README.md。
