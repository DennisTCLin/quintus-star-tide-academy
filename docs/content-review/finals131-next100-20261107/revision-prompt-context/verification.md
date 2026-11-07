# 完整題幹語境修訂後驗證

取代歷史0fec候選的發布資格；基底正式main65d3a309bf012f6f54bd21d9b81387d45bf1c992不變。原178索引及其中原始盲包、同年度來源選書/冊次單元證據、真main632檔基線、6629/23192及5合成保存fixture仍保留，參照historical-index-binding.json。原0fec完整prompt缺境FAIL與修正前60筆stale delta全部列證據，不作最終PASS依據。

固定仍為100題/6來源/5分流：g1國語5、g2國語25/南一數學20、g6自然25/數學25；無英文/三年級。四個未發布新題用等義完整語境調整標記、並列及邊長表示，未改量值/答案唯一性/答鍵/來源族；逐欄delta與原盲解映射列question-presentation-delta.json。原6629題及approval、42templates、生成23192完全不變。

**PASS** 最終npm build（內容6729/6729、42/42模板、23192promptoracle、注音/pack/型別/Vite/server）；一般1624PASS/360條件skip，38個全新空白本機PG365PASS，360逐file/fullName/occurrence補驗、5overlap，共1984unique。38db皆initialpublic0、互不重名且與前76db無交集。784 source/runtime/test/build輸入前後同SHA。

**PASS** 真syllables840個完整prompt/hint/explanation/options/來源kind/locator，漢字缺音0，逐occurrence保留原文與實際輸出。完整題幹牽手/乾旱、含數值的長邊、操作變因／應、動詞點數及名詞學習點數、獨立著手正負控制均直接取實際question欄位驗證，非只測短詞。580新詞/9字/66精準完整規則；從最終字典逐key重產added delta，值對最終字典與packed比對；所有既有27393詞/3035字未變/刪。

**明確限制** 單字髮舊fallbackfa4未改：該字形題純漢字選項、無choice.zy/AutoRuby，選項語音gate false，題目語音payload為generic speechText，答後可朗讀中文解說但voice不以字典轉音。函式/SSR與payload路徑不等於實機OS或實際TTS發音認證；不為隱藏字形提示而把漢字改成注音。詳spelling-choice-speech-path.json，相關函式斷言已在測試。

舊閱讀差異為16題24個核心顯示欄＋1個來源locator（總25nested字串欄），僅空白韋/櫥/蘆補音；無原非空白替換。

**PASS** 五條375×812fresh UI（g2 words實際採修後改錯題）：Q1correct自動Q2、reload繼續仍Q2，一answer/一advance/+10coins，10JPG/DOM/API/metrics/console空。UI指定首題/去challenge/記憶體API，一年級合成5題；正常六題填充/分流/完整保存及重送保留由PG另驗，不冒稱實機Safari或正式actor。

新版本尚待固定Git與冷覆核、整合窗口/正式保全及部署後驗證。根未push修訂，未合併main/部署，正式actor[]、正式DB access false。131份整卷未全部核准；Brownie英文排除；不重設帳號/存檔/進度/獎勵。
