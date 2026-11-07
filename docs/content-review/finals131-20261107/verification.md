# 驗證紀錄

**最新整合基線：正式main `acfc325806be99254856ff31f88c4138961da8db`（PR21）。** 本批分支 `codex/content-131-20261107`，獨立worktree；發佈窗口仍須即時重新核對main。最新驗證見本文件末段「整合PR21後重新驗證」。以下3437/e310數據保留為歷史紀錄，不能代替最新候選驗收。未另行合併成人PR14、Conquest PR19。

原始候選基線：`3437ad63e8bfb8e0b689440176d94a0ea223be8c`；舊候選 `e310785dcb9022bae42ec22401f707759e3a84be` 的內容／驗證證據完整保留。

| 檢查 | 結果／證據 |
|---|---|
| 131份原始檔 | %PDF、SHA256全數核對，347頁抽字／高解析渲染；131份頁首人工triage。全卷／原子題審查範圍另列，不冒稱131份均通過。|
| 本批95題 | mapping102筆＝95新ID＋7去重；完整提示與選項，無缺圖／聽力參照；102個候選獨立盲答正答一致。|
| content audit | PASS：固定6311／生成23192／42池，findings0。見[evidence/content-audit.log](evidence/content-audit.log)。95個新approval hash正確，原6216個approval和manifest其他欄位不變，由獨立falsifier重驗。|
| build／TypeScript／注音 | `npm run build` PASS，含內容audit、注音打包檢查、tsc、Vite與server bundles。見[evidence/build.log](evidence/build.log)。新JSON全部文字皆納入注音掃描；426個已審情境規則。|
| 全套回歸 | 176檔通過／28檔跳過；1540測試通過／263跳過。見[evidence/full-tests.log](evidence/full-tests.log)。此為未設定TEST_DATABASE_URL的普通全套；所有263項條件式跳過已由下列每檔獨立PG補跑涵蓋，不宣稱使用正式資料庫。|
| 隔離PostgreSQL補測 | 29檔各用全新本機拋棄式DB，267項全部通過；包含一般套件跳過的263項及4個重疊非DB測試。見[evidence/cloud-per-file/results.json](evidence/cloud-per-file/results.json)及各檔原始log。沒有連正式DB。|
| 舊題保留 | base3437全6216物件SHA256逐一不變；獨立審查者用git show重建基線，6216/6216匹配。|
| 進度／獎勵 | 各年級舊航程、mastery、收藏、成長、星幣、券等跨JSON序列化與validateFamily保留；95題逐一標準作答＋重播，僅首答加10星幣，不影響其他玩家。|
| 分流與接續 | 幸安／永春一數、南屯／永春二數、東門五社會、建安六數均有新增合格題；同族線索不共趟、已精熟排除，耗盡不降級、不清空紀錄。|
| 瀏覽器 | CUA IAB Chromium，本機合成API、無DB、無真實帳號。1/2/6年級375×812，五年級768×1024；量得document寬度不超viewport；答案顯示與答對接續通過。高年級沒有聽題目按鈕。並未以模擬尺寸宣稱iPad Safari實機測試。|
| 實際UI作答 | 四個fixture皆從coins1234→1244、index0→1，只有一個answer與一個advance；[evidence/ui-evidence.json](evidence/ui-evidence.json)。|

截圖：[一數375](evidence/g1-375.png)（新題第二題接續）、[二數375](evidence/g2-375.png)、[五社會768](evidence/g5-768.png)、[六數375](evidence/g6-375.png)。第一題一數紅／青蘋果和西瓜完整條件亦經實際作答，沒有把西瓜算入。

首次全套測試指出7份歷史子批測試把該子批當作全部可用題，新增未精熟期末題使原本「已耗盡」前提不成立。新增test-only `pre-finals-learning` helper，僅在歷史子批測試預先精熟同年級本批題目，維持原本子批邊界；現行全題庫仍由all-child與新finals測試直接使用真實freshLearning驗證。沒有改動分配引擎以迎合舊斷言。readability同一組完整逐字斷言保留，只把不變的Object.entries移出迴圈，解除平行套件下的重複配置超時。

**目前狀態：candidate_not_deployed。** 尚需整合窗口：即時main/候選SHA確認、正式資料前後基準、GitHub合併與Railway部署成功、部署後版本/題目/分流驗證。正式孩子資料未被本批測試或實作改寫。只有這些證據齊全才能稱為已上線。

獨立falsifier另驗測試helper：一／二／四／五／六年級分別精熟26／27／0／13／29題，無他年級ID；validateMastered與validateLearning全通過。

## 1437cee後的雲端補測與必要修正

首次把29檔共用一個新DB執行：247通過、10失敗，原始[失敗log](evidence/database-tests.log)保留，未合併部署。分布是all-child6、child-account2、school-curriculum2；cloud.test本身27/27PASS。後續修改只有測試與證據，產品碼、95題、6311個內容hash、UI建置資產均與1437cee完全相同。

- **all-child6**：新增題的共同長前綴使既有toJSON在寫入前就選用prefix-v1，測試錯把原始JS陣列和PG儲存物件比較。現在setup UPDATE後、login前實際取family::text與updated_at，login/GET後逐字嚴格比對；再decode後比完整family，沒有刪seen或關閉codec。10個current情境都保持原始hash與timestamp不變。
- **真正舊航程**：原測試startRun使用候選題庫，不能獨稱跨版舊航程。另由乾淨pinned base3437原始碼產生[10份完整合成family](fixtures/base3437-cloud-families.json)，42個唯一run題ID／60個hash引用；獨立falsifier從base源碼重新esbuild重建10/10逐欄相等。每位使用array及合法prefix-v1共20種儲存情境，驗原始text/hash/timestamp不變、完整decode、API全部learning/seen、run/index/answers、mastery/收藏/成長/星幣/券不變。沒有用candidate自產航程冒充舊航程。
- **child-account2**：初始共享合成DB遺留alston5列、jay2列，全部匹配admin_trial_accounts；[聚合證據](evidence/shared-db-residue.json)。這些列不符合該測試故意恢復的舊四角色CHECK。base3437及1437cee在各自空白DB均6/6PASS。最終29檔全部獨立DB；沒有改CHECK、使用NOT VALID或刪既有帳戶。
- **school2**：舊測試只允許mxg2字首／舊單一子庫。現在用舊GRADE2＋本批27題的精確白名單，航程和battle同驗grade/course/publisher/eligibleExam/source；保留答案隱藏、pairs不洩注音、積分／重載斷言。最終API實際選到f2-i10-2/i10-4/i10-6，詳[21/21通過log](evidence/cloud-per-file/school-curriculum-cloud.test.log)。

[base與舊候選逐檔新DB對照](evidence/pg-base-comparison/results.json)：base三檔全部通過；1437cee的all-child/school保留6+2個失敗，child-account在隔離下通過，支持上述根因。最終29檔267項全通過，另完整一般套件1540項及build再通過。完整測試共1803項由這兩種執行模式涵蓋，沒有用「無workflow run」冒稱CI通過。

重現：本機新建隔離PG55931、專用空白角色／DB，在備妥repo依賴後執行[evidence/run-cloud-isolated.py](evidence/run-cloud-isolated.py)，每檔createdb新庫。基底fixture產生器為[fixtures/generate-base3437.mjs](fixtures/generate-base3437.mjs)，需先於/tmp/finals131-base-3437建立乾淨指定SHA worktree並build:server。此腳本驗證base HEAD與tracked source乾淨，不會存取正式DB。

## 整合PR21後重新驗證

正式main於本批等待驗收期間前進到acfc325。唯讀確認Railway部署 `15b12cdc-1e33-43dd-9690-ef3cbdb90372` 為SUCCESS、來源acfc325，舊3437部署已REMOVED；因此沒有直接發布e310。整合採merge保留舊證據與歷史，並保留PR21中心五格範圍、取消領地相鄰限制、NPC擴張及煙霧美術的全部變更。

三個衝突僅涉及注音：`taiwan-zhuyin-overrides.json` 作三向結構聯集，同key異值即停止；保留PR21「為中心」「吞沒」和本批五條情境。兩個generated檔使用合併後全部來源、pypinyin0.55.0重生。428條已審情境、26005詞句、3009字；沒有用某一邊的generated檔覆蓋另一邊。PR21其餘18檔逐位元等於acfc325；本批95題data/adapter/learning/exam-sources/approvals五檔逐位元等於e310。逐檔hash見[merge-preservation.json](evidence/integrated-acfc325/merge-preservation.json)。

| 最新必要檢查 | 結果／證據 |
|---|---|
| build／audit／tsc／注音 | PASS，[完整build log（gzip）](evidence/integrated-acfc325/build.log.gz)。題庫6311／生成23192／42池，0 findings。|
| 一般全套 | 176檔PASS／28條件式跳過；1546項PASS、264項跳過、0 failed。[原始JSON](evidence/integrated-acfc325/full-tests.json)、[原始log（gzip）](evidence/integrated-acfc325/full-tests.log.gz)。|
| 逐檔全新合成PG | 29個檔、268項PASS，0 failed／pending；PR21較舊候選增加1項DB測試。[結果及全部斷言](evidence/integrated-acfc325/cloud-per-file/results.json)，每檔另存原始Vitest JSON及lossless gzip log。|
| 跳過項精確覆蓋 | 以repo-relative file＋exact fullName＋occurrence ordinal逐項配對：264/264普通skipped均對到PG passed，未覆蓋0、額外未解釋0；PG另4項為普通已PASS項的重跑。共1810項唯一測試有PASS證據。[逐項映射](evidence/integrated-acfc325/skip-pg-coverage.json)。不以總數相等代替測試身份核對。|
| 舊內容／新功能保留 | 獨立審查重建6216舊題hash全相同，95新approval及6311 ID唯一性PASS；18份PR21檔逐位元相同。Conquest新版規則／finals／readability重點7檔68項另PASS。|
| 雲端資料保存 | 最新PG全套仍包含20份真實base3437合成舊航程的兩種儲存編碼及10份current情境；原始JSON text、hash、updated_at不變，完整family decode、API learning/seen、舊航程／獎勵斷言全部PASS。3437→acfc325未變更題庫或Family儲存實作，既有舊航程fixture仍作跨版測試；另外完整保留acfc325的Conquest新規則。|

普通suite首次在受限沙箱內執行，`server.test.mjs` 因本機listen EPERM而失敗；該次[原始log](evidence/integrated-acfc325/full-tests-sandbox-bind-denied.log.gz)保留。允許本機監聽後，以相同命令重跑完整suite通過；未修改產品碼、斷言或timeout。

新的[PG重現腳本](evidence/integrated-acfc325/run-cloud-isolated.py)在專用本機PG55931逐檔createdb，僅使用合成帳號；不讀正式DB。所有原始log以gzip無損保存，JSON內每檔log路徑對應其`.gz`封存檔；原始Vitest JSON未改動。重跑後可用[覆蓋核對腳本](evidence/integrated-acfc325/make-coverage.py)重建file/fullName/occurrence映射。

**狀態仍為candidate_not_deployed。** 等待最新head獨立複核、基於acfc325的新正式資料基準與專屬發布窗口。尚未mark-ready、合併PR20或觸發部署。
