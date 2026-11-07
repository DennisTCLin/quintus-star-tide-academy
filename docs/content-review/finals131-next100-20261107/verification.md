# Next100 固定來源與本機驗證

基底為當時正式main `65d3a309bf012f6f54bd21d9b81387d45bf1c992`，tree `c7b532eda9a75068ee600ca8a1e0f135e23174d9`。僅追加100題/6來源/5分流，當前靜態題6729，產生題23192/42池。整體131份整卷尚未全部核准。

- **PASS** 100逐題選項答案等於去答案盲包的獨立答案；來源頁首、同年同校出版社及同出版社冊次/單元參照分層，歷屆交集不冒稱115完整當次考試範圍。
- **PASS** `npm run build`：內容審核6729/6729、42/42模板、所有23192產生題提示式oracle；注音/型別/Vite/server bundle通過。既有大型chunk提醒仍在，不是建置失敗。
- **PASS** 一般回歸1624，360個條件跳過全部由38個全新本機PG資料庫對應補驗；PG365全過，5個重疊，唯一測試1984。檔案+完整測試名稱+重名發生序號比對見evidence/skip-pg-coverage.json，不用測試總數冒充覆蓋。
- **PASS** 每個PG資料庫開始public表數0；38個db各不相同且與先前38組初跑無交集，見fresh-db-disjoint.json及cloud-per-file/results.json。合成帳號/資料，不接正式DB。
- **PASS** 當前正式main的6629完整靜態題物件及原審核紀錄、23192產生題物件保持；5個完整舊航程在array/prefix存法登入與state讀取前後，原JSON字串、updated_at、進度、星幣、券及其他孩子狀態保留。新增題正常分流、題目未洩答案、同源族排除、答對/重送/新id重送只領一次。
- **PASS** 784項source/runtime/test/build輸入在最終測試前後SHA相同；固定原始Git archive含632來源/教材/審核/圖示檔，見fixtures/source-provenance.json。
- **PASS** 5條375×812真實DOM/點擊流程：Q1答對→等待自動Q2（未點下一題）→reload港口→繼續仍Q2；每條只有一answer、一advance，1234→1244星幣，無橫溢出/缺圖，console空。10張JPEG、DOM、metrics、API證據完整保留。

UI為合成memory API且指定第一題/移除挑戰旗標；一年級此合成航程只有5題，正常六題航程與必要舊題填充另由PG測試。不是實機Safari/聽力/正式帳號操作證明。沒有GitHub CI通過宣稱，沒有部署/正式保全通過宣稱；後續需獨立覆核與授權整合窗口。

新增注音573詞/9字，其中61個精準完整新字串校訂。所有既有27393詞/3035字條目的讀音未變或刪除，未改全域多音字fallback。MOE簡編本/重編本來源見primary/reading-context-sources.json。真正syllables語意反例包含「牽著手」vs「著手」、「操作變因／應是」vs「因應」、「生長」vs長度、「為取得」vs「分別為」，及前批看家/觀看、磅礴/一磅。

既有16題24個欄位出現韋/櫥/蘆三字的空白注音補齊，未替換任何原非空白字音，詳existing-reading-delta.json；不宣稱所有舊畫面逐像素未變。較早暫存測試/修訂發現與sandbox本機連線限制見semantic-review-remediation.json；本表只引用最終固定輸入的通過結果。

來源問題及尚未核定整卷繼續隔離；Brownie英文、三年級均未新增。無存檔格式/帳號/進度/獎勵演算法或正式actor命令變更。發布前後由獲授權整合聊天協調獨立保全；不回填、清空、重設或套舊快照。
