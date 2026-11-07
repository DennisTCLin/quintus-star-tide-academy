# 固定main65d基線

source-provenance.json 的632檔來自精確 `git archive 65d3a309bf012f6f54bd21d9b81387d45bf1c992 src curriculum scripts/content-catalog.ts docs/content-review/approvals.json public/assets/brand-icons.svg`，不是候選自產預期，也不是正式資料庫。

解到output/next100/base-source後，用esbuild bundle該src/learning.ts、question-generator.ts、adventure.ts為output/next100/base-learning.mjs、base-generator.mjs、base-adventure.mjs（node/esm，svg=text/css=empty）。src/readability.tsx同樣bundle為base-reading.mjs。執行generate-fixtures.mjs建立題物件hash與5個完整舊航程。新家族/時間可不同，無逐byte重建動態時間宣稱；回歸使用本目錄已固定fixture，保存已選題ID和作答/獎勵全狀態，獨立覆核可重新從Git核驗輸入與題物件。
