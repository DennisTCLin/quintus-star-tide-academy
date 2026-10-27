# Alston 六年級發布驗證

來源：家長提供10份康軒六年級數學卷（29頁）及建安115教材草案。納入289題，來源、限制與修正詳見docs/content-review/grade6-math.md。

- schema8：舊四名玩家所有欄位保留；缺少新slot補入未確認新手狀態。既有verified四鍵加總保留，新鍵初始化0。
- 既有三表CHECK限制經transaction advisory lock升級，後續啟動無重複ALTER；PostgreSQL舊限制遷移/新帳號/重試不重設測試通過。
- 單元測試739項通過；另外新增grade6複習測試1項通過。22個獨立PostgreSQL資料庫測試套件172項通過；最終強化school套件15項重新通過。單一共享QA資料庫曾因跨套件限流失敗，改為每套獨立資料庫；沒有放寬正式限流。
- build、內容hash稽核3033道靜態題與23192道生成題、注音結構檢查通過。新字典經既有台灣覆寫規則生成；不宣稱所有語音已人工聽驗。
- 新鮮獨立code review發現並修正助戰課程硬編碼、舊分數缺鍵、六年級入口文案；四檔34項獨立驗證通過。
- WebKit synthetic child登入、歡迎、免費抽取、首頁數學單科、開啟六年級題目。390×844、820×1180、1180×820、1440×900均無橫向溢位及pageerror；圖像截圖人工檢視。這是瀏覽器模擬，非實體iPad麥克風驗收。
- 配題僅建安六年級康軒數學；連續3次助戰、practice配題、錯誤科目拒絕、已熟題零獎勵複習測試通過。
- 正式孩子進度沒有用來測試。新帳號另立家庭，僅為新帳號新增紀錄。

整合main9a250ed，保留study-review及既有語音/動畫功能。回滾必須保留schema8讀取能力，不能直接將舊v7 reader部署回去。

## 正式發布

Railway deployment `18fc2ace-2615-494b-8a88-70d33998f304` SUCCESS，runtime `d9492e2`。/healthz成功，正式入口4個JS/CSS SHA與本機build相同。正式WebKit登入頁無pageerror/溢位。

以operator-only helper建立獨立Alston帳號，正式登入驗證六年級、建安校籍正確；密碼只經stdin進入server且以雜湊儲存，未寫入repo。新手歡迎尚未操作，星幣/券皆0；登入前後學習資料一致。未使用其他孩子帳號測試。作業臨時SSH key已從Railway撤銷並刪除本機副本。

首度上傳包含QA截圖被413拒絕；移除封裝中的output/outputs/tests/qa後成功，不刪除網站執行資產或內容稽核來源。
