# 完整紙本語境修訂的離線驗證

本修訂只對應基底 main c66f492811c51298673fede44d0997d33aa64494 上的35題候選，尚未發布。原先6d2a4919的「舊非空讀音零改動」雖是當時事實，卻保留了試卷／書卷三聲的錯讀；其最終讀音放行已撤回。上層原181檔與artifact-index.json全數保持，供歷史核對；最終以本修訂的新固定head／index及外部冷綁收據為準。

## 內容與版本

35題題幹、選項、答鍵、來源族及數量自6d2a4919未改：一上翰林數學7、五上翰林國語7、六上康軒國語21。上層來源PDF、同年度學校選書、冊次概念交集、盲解與去重證據保留效力。第一年級7題是10以內加減、30以內排序；分合題僅重複映射未新增。來源同年度出版社與同出版社上冊參照分開，不認證115單課或整卷完整範圍。Brownie英文、三年級及待核對題未加入。

## 讀音修正與影響

89個完整紙本／書籍中文語段採明確四聲特例，包含真實組合出的14段來源文字；43個舊詞鍵僅卷三聲改四聲，新增210詞／19字，無舊字元fallback改動。原卷／整卷不設裸詞全域規則。試卷、書卷、手不釋卷四聲，銀絲卷、捲曲三聲；故意錯拼或引用單字不假裝已判詞義。primary-reading-references.json列官方字典實查來源；89全文語境為逐段人工語意判定，非89條字典原詞目。

真syllables全量比對 c66 的6729舊static物件、23192 generated、268來源metadata，實際中文字串逐ID／欄位記完整前後音。791欄變更：static697、generated0、source94；static含provenance/examSources540、imageAlt93、prompt52、explanation6、options4、retirementReason2。source含publisherEvidence59、scope18、file7、bookEvidence5、compatibleScope5。其中3欄是既有醉／眨空音補齊；其餘為卷語境改音。不能稱所有舊讀音不變。全部既有題目物件、答鍵、ID、審核與42個生成模板仍保持。35題完整326中文欄位零缺音，字形選項不加zy，純注音保留專用渲染與通用speech說明。

獨立反證另以當前6764 static／23192 generated／271來源實際物件掃描，明確試卷／書籍語境殘留三聲0；這個結論只限當前完整語料，不保證任意未見句子的詞義。evidence/legacy-all-reading-impact.json保留791欄完整前後值，actual-runtime-context-completion.json保留14新增完整語段及來源欄引用；paper-context-correction-map.json是最初75段盤點的歷史分類，完整89段以當前src/data/paper-context-reading-overrides.json及14段補完為準。

## 完整測試

- build、內容審核、注音、packed一致性通過，6764 static／23192 generated／42 pools。
- 普通測試1638 PASS、366條件skip；39個各自全新本機PG資料庫（每檔初始public表0）371 PASS。按repo-relative file＋完整fullName＋同名occurrence逐項對照，366 skip全部由PG覆蓋，5重疊，2004 unique PASS。evidence/skip-pg-coverage.json有完整映射，原始普通JSON／log及39檔PG JSON／log皆保留。不是GitHub CI的聲明。
- 779項src/server/scripts/curriculum/package/根設定/approval輸入雜湊測試前後一致。focused完整語料／packed另獨立19項PASS；raw log在evidence/。
- 原181中的真Git c66 archive、4個舊固定航程重建與原穩定題目物件比較保留；本次另跑全部進度／獎勵相關一般及PG測試。沒有正式DB讀寫或正式actor命令，不能把離線fixtures稱正式保全。
- 在同一測試輸入上重新做6條375×812手機瀏覽器流程：一年級排序／應用、五年級改字、六年級注音／改字／成語。Q1正確自動Q2、reload港口接續Q2；每條一次answer＋一次advance、1234→1244星幣，無橫向溢位／破圖／console warning或error。12張原JPG及2張完整contact sheet均已目視，raw DOM、尺寸、local API紀錄均保留。第一次誤為1280尺寸的試跑另隔離於未收錄output/ui-desktop-first-attempt，不作手機通過證據。驗證後關閉自建tab、reset viewport、停止自建server。

## 邊界與發布條件

六條UI以memory API注入第一題、移除challenge；正常教材分流、六題完整作答、重送與獎勵保留另由3條本機PG與全站回歸檢查。未認證實體Safari／OS實際語音。中間trial-only修訂雖也通過舊測試，漏掉書卷、手不釋卷與動態來源文字，不能拿來作最終證據；本索引僅收完整89語境源的新一輪結果。

完成本文件或固定Git不等於發布。需要新head/index的獨立冷綁、整合聊天離線接受、全新正式BEFORE／AFTER與正式main→Railway公開靜態產物核對，方可宣告上線。原PR25窗口已結束且不得重用。131份整卷仍未全部核准，42個出版社原證據待查、1個衝突及圖片／課文／答案／單元隔離待辦保留，不能將131張頁首分類當131卷逐題完成。
