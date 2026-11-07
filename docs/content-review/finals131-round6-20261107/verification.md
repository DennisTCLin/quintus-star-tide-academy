# 驗證：round6固定35題

基底為正式main c66f492811c51298673fede44d0997d33aa64494；本文件只描述離線候選。部署與正式BEFORE/AFTER尚未執行。

## 內容與分流

35題：一上翰林數學7、五上翰林國語7、六上康軒國語21，3個來源。盲包及獨立答案在content-inputs/，答案字串逐題對照blind-expected.json。113大墩、113明義、114臺北松山民權的同年度選書原PDF與SHA在primary/及publisher-and-book-evidence.json。來源選書與同出版社上冊參照分開；不冒稱115單課或整卷完整範圍。兩個重複候選只保留mapping；原ID與審核不改。g6划倒題保留整句、選項、答鍵與來源族，等義表述修訂見prompt-context-equivalence。Brownie英文排除。

## 實測

- build、內容審核、注音檢查及packed資料一致性PASS：6764 static、23192 generated、42 pools，全部已審核。
- 一般測試1636 PASS／366條件skip；39個互不重複、初始零public tables的全新本機PG資料庫371 PASS，逐file/fullName/occurrence覆蓋366條件skip、5 overlap，合計2002 unique。不是GitHub CI狀態。
- 769個列舉的src/server/scripts/curriculum/package輸入雜湊前後一致。root-config-git-equality另核7個未修改根目錄server/build設定對Git基底一致，是測試後讀取之Git一致性檢查，並非追溯補拍pre-run snapshot。
- 真Git c66的634檔src/curriculum archive SHA155f512461d73f820518b37d5959be5da4e21b335abcbfee192aad1cfc6dd41d。6729舊static物件、23192generated物件、舊approvals與42templates均保持。4條合成舊航程由seed117/day2026-11-07獨立逐值重生；stored prefix-v1與expanded runtime均驗證，無正式帳號資料。
- 真syllables重算326中文完整欄位；新增194詞/19字，舊字典所有條目保持。舊2題3欄位僅補原本醉/眨的空音，無非空讀音替換。字形不加zy、純注音沿用渲染；questionSpeech通用說明，沒有錯字朗讀提示。OS語音未認證。
- 6條375×812手機memory-fixture：Q1→答對自動Q2、reload後港口接續Q2；每條一次answer/advance、1234→1244星幣。12張JPG逐張目視，無橫向溢位/缺圖，console error/warn=[]。第一題注入且移除challenge，不能冒稱正式actor或實體Safari測試；正常來源族分配、6題作答與原進度/獎勵保留另有本機PG證據。

## 保留的失敗與限制

早期focused三個測試前提錯誤（eligibleExam依賴外層年級過濾、compact seen被toJSON再壓縮、提示得字數）已修測試與fixture表示後重跑。首次整站8個舊capacity/exhaustion測試前提需涵蓋新增題；修正後零assertion失敗，但沙盒本機HTTP listener使server hook timeout。general-local-allowed以移除正式環境變數的本機測試權限完整通過，原始失敗與最終報告並存。早期src-only archive缺curriculum，不作有效fixture來源；採complete archive。預設audit cache自然產生但保持unstaged，另存final report。

獨立read-only覆核通過內容、真Git物件、全部讀音、盲解、fixture重生、39PG raw精確計數及12圖；獨立重跑focused＋packing 17項PASS，沒有重跑全部PG，也沒有接正式DB。固定Git/索引仍需再次綁定；正式發布需協調新窗口與保全，不得由舊repo覆蓋或恢復舊資料快照。131份整卷尚未全部核准；42個出版社原證據待查與原圖/課文/答案/單元待辦保留在外部pending清單。
