# Jay 續批題庫驗證

狀態：內容、本機測試、PR整合及正式發布驗證全部PASS。

- 新增407：國語308、自然86、英文13；與前96來源共503，保留160通用，五年級共663靜態ID。
- 407最終答案與fresh盲解逐ID一致，6修正題重解，官方臺灣讀音爭議已有reconciliation。來源抽核及範圍限制見docs/content-review/jay-grade5-remaining.md。
- npm run build PASS；content-audit 5018 static、23192 generated、42 pools PASS。
- npm test：911 PASS、181 DB-gated SKIP；另全新隔離PostgreSQL認證課綱19 PASS，包含原96精熟後三科各六題續批、重讀持久化、原獎勵保留、其他profiles未改。
- Chromium/WebKit各五科、320/375/820，40檢查PASS（30版面＋10實際UI答案儲存與重載）。有完整prompt文字、可捲動與no overflow斷言，grade5無普通朗讀。僅合成帳號，非實體iPad新驗收，不讀寫正式孩子帳號。
- 完整歷史合成fixture89354bytes，原80KiB測試門檻不足，調96KiB；正式請求1,000,000bytes限制未改。Node本機p95 11.51ms，不宣稱手機效能。
- 保留舊96來源檔byte hash，未改任何既有題ID或獎勵邏輯。源PDF未修改。
- 問題API當前題不含answer/explanation，未來題不在payload。既有client bundle仍包含全題庫答案供本機邏輯使用；這是練習產品既有架構，不宣稱原始碼防作弊或保密正式考試。

回退必須保留所有新ID解析與dongmen驗證，停分配不能刪除已有精熟／航程題或重置孩子紀錄。

Fresh最終反證：407ID唯一、308/86/13、來源21count吻合、原96實際byte與HEAD相同、全題prompt/hint/explanation/source完整。三項歧義已消除，不捨語境補齊；未發現未修新回歸。來源反證範圍仍以審查文件所列視覺19頁＋其餘抽取文字為準。

## 正式發布

PR6：https://github.com/quintus-star-tide/star-tide-academy/pull/6 ，已合併9932328aede64f8b5d95bce930aea3aa2b25c6a0；封裝產品來源b3fd97a20f1a9a33d8457a5dcf3fdf50a7c908fd。Railway423f7deb-7ae1-4bbc-8e0e-1f679e41431e SUCCESS。包含先前PR5導覽按鈕修正，未覆蓋其他已發布功能。

1987個dist檔封裝核對；1793原媒體按SHA保留，180已審新媒體沿用前次發布。線上全部9變動檔SHA與封包一致；185其他發布檔與上次驗證封包byte相同，另外3張未改圖像線上抽樣PASS，不宣稱重新下載全部未變動檔。health ok，未登入state401，Chromium/WebKit正式登入頁、inline SVG/no pageerror/no overflow PASS。無正式孩子登入測寫／資料重設。細節見production-assets.json、production-browser.json、release-manifest.json；verify-production.py可重核本次已下載檔。
