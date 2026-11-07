# 驗證紀錄

候選基線：正式main `3437ad63e8bfb8e0b689440176d94a0ea223be8c`。本批分支 `codex/content-131-20261107`，獨立worktree；發佈窗口仍須即時重新核對main。未合併成人PR14、Conquest PR19。

| 檢查 | 結果／證據 |
|---|---|
| 131份原始檔 | %PDF、SHA256全數核對，347頁抽字／高解析渲染；131份頁首人工triage。全卷／原子題審查範圍另列，不冒稱131份均通過。|
| 本批95題 | mapping102筆＝95新ID＋7去重；完整提示與選項，無缺圖／聽力參照；102個候選獨立盲答正答一致。|
| content audit | PASS：固定6311／生成23192／42池，findings0。見[evidence/content-audit.log](evidence/content-audit.log)。95個新approval hash正確，原6216個approval和manifest其他欄位不變，由獨立falsifier重驗。|
| build／TypeScript／注音 | `npm run build` PASS，含內容audit、注音打包檢查、tsc、Vite與server bundles。見[evidence/build.log](evidence/build.log)。新JSON全部文字皆納入注音掃描；426個已審情境規則。|
| 全套回歸 | 176檔通過／28檔跳過；1540測試通過／253跳過。見[evidence/full-tests.log](evidence/full-tests.log)。跳過的是未設定獨立TEST_DATABASE_URL等既有環境條件，不宣稱正式資料庫測試通過。|
| 舊題保留 | base3437全6216物件SHA256逐一不變；獨立審查者用git show重建基線，6216/6216匹配。|
| 進度／獎勵 | 各年級舊航程、mastery、收藏、成長、星幣、券等跨JSON序列化與validateFamily保留；95題逐一標準作答＋重播，僅首答加10星幣，不影響其他玩家。|
| 分流與接續 | 幸安／永春一數、南屯／永春二數、東門五社會、建安六數均有新增合格題；同族線索不共趟、已精熟排除，耗盡不降級、不清空紀錄。|
| 瀏覽器 | CUA IAB Chromium，本機合成API、無DB、無真實帳號。1/2/6年級375×812，五年級768×1024；量得document寬度不超viewport；答案顯示與答對接續通過。高年級沒有聽題目按鈕。並未以模擬尺寸宣稱iPad Safari實機測試。|
| 實際UI作答 | 四個fixture皆從coins1234→1244、index0→1，只有一個answer與一個advance；[evidence/ui-evidence.json](evidence/ui-evidence.json)。|

截圖：[一數375](evidence/g1-375.png)（新題第二題接續）、[二數375](evidence/g2-375.png)、[五社會768](evidence/g5-768.png)、[六數375](evidence/g6-375.png)。第一題一數紅／青蘋果和西瓜完整條件亦經實際作答，沒有把西瓜算入。

首次全套測試指出7份歷史子批測試把該子批當作全部可用題，新增未精熟期末題使原本「已耗盡」前提不成立。新增test-only `pre-finals-learning` helper，僅在歷史子批測試預先精熟同年級本批題目，維持原本子批邊界；現行全題庫仍由all-child與新finals測試直接使用真實freshLearning驗證。沒有改動分配引擎以迎合舊斷言。readability同一組完整逐字斷言保留，只把不變的Object.entries移出迴圈，解除平行套件下的重複配置超時。

**目前狀態：candidate_not_deployed。** 尚需整合窗口：即時main/候選SHA確認、正式資料前後基準、GitHub合併與Railway部署成功、部署後版本/題目/分流驗證。正式孩子資料未被本批測試或實作改寫。只有這些證據齊全才能稱為已上線。

獨立falsifier另驗測試helper：一／二／四／五／六年級分別精熟26／27／0／13／29題，無他年級ID；validateMastered與validateLearning全通過。
