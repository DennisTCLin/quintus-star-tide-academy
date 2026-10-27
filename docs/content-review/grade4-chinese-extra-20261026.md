# 四上翰林國語補充（2026-10-26）

家長提供小四國文翰林1–3.pdf，共12頁：內湖114四上期中4頁、民權114四上期中5頁、和順114四上第一次3頁。原檔SHA見output/grade4-chinese-extra/sources.json。root及來源審查逐頁看圖，和順掃描橫轉且無文字層，沒有用空白OCR猜題。

三卷未直接印出版社；依家長分類及相符課名歸翰林。沒有聲稱卷首證實出版社、明確第1–6課，或等同115當次考試完整範圍。適用既有四年級翰林國語路由（目前Quintus），不改校籍設定。

新增49題：錯字、成語、句子連接、修辭與閱讀。閱讀8題各自附完整詩文或足夠原卷節錄／整理。排除原卷多解的觸覺詩句與十二下鐘聲暗示題、沒有附課文的記憶題、開放造句／作文、難以辨認的字音／部首題。未提供官方答案；答案是編輯解題後另行盲解核對。

獨立先讀無答案版本，49/49與答案鍵一致；來源逐題對照更正原成語「無懈可擊」、若干頁碼及分組題號。再修正「快樂地」、書桌選項擬人歧義、「開拓視野」，最終49題盲解複查PASS。來源核心條件與閱讀上下文足夠。

保留舊81題所有內容與ID，新題分檔追加；不修改進度、帳號、獎勵、遊戲或發布設定。來源新的適用證據不回寫舊題，不製造舊審查雜湊漂移。

驗證：build/content-audit PASS（本地4209靜態題、23192生成變體）；四個focused test files共20 tests PASS。fresh整合審查重跑國語與路由12 tests PASS，確認舊81題內容與既有審查hash不變。WebKit一般／閱讀題各320、390、820無橫向溢出、可捲至選項並作答、點數重載保留；四年級無題目朗讀鈕。root視覺檢查閱讀390截圖。

測試fixture曾直接替換題目，造成challenge難度序列不一致而被驗證拒絕；已改用正式allocator（先標記非閱讀題精熟），未更改產品驗證規則。測試最後均用獨立本機合成帳號，未改孩子正式資料。頁面重載／關閉時有in-flight state fetch取消訊息，未聲稱console全無錯誤。
完整挑戰6/6正確、runStatus won、重載保留答案亦PASS，見output/grade4-chinese-extra/complete-run.json（其中第1題由前段viewport驗收作答，complete-run接續其餘5題）。

最新整合：合併main ad0b175及0d967fd，保留六年級146題、小一107題、勝利頁與末擊時序。fresh合併複核確認main原4306題審查紀錄全部不變，僅新增49題；原注音無改寫，只追加6詞。build PASS，789一般測試PASS（171個DB測試未在一般測試環境執行），獨立DB校籍雲端17 tests PASS；合併後WebKit一般／閱讀6個viewport與完整6/6通關重載再驗PASS。最終4355靜態題審查PASS。

正式上線完成：runtime d2c0bb9，Railway477f7aec-f083-4053-b77b-a74e4d3eb719 SUCCESS。正式站index/11份JS與CSS（共12檔）SHA全部符合本地已測dist；healthz200/ok、匿名api/state401。正式WebKit390/820登入入口正常、無橫向溢出；只做匿名唯讀檢查，沒有正式孩子帳號寫入。對應證據production-verification.json、production-entry.json、deployment.json。
