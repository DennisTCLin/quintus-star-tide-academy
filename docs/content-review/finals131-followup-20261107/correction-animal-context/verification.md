# 動物語境修訂

原210題候選036cf381在單題化「大〔ㄒㄧㄤˋ〕粗壯的腿像柱子」時，沒有保留原卷上文的動物園背景，可能將「像」解讀為大雕像。保留phase2-g2h-20003307-i-5的ID、選項順序象/像、答鍵0、來源及sourceFamily，只補明原卷已有的動物/長鼻語境及相應解說；其他209題完整物件/approval與原6311題保持。沒有改帳號、進度、獎勵、儲存結構或成人程式。

最終題文：「這種動物有長鼻子。大〔ㄒㄧㄤˋ〕粗壯的腿像柱子。括號注音應寫成哪個字？」獨立answer-free封包SHA067d182b561b733bd66aa3c39a818ba13dbb336635035da1173fc5bc3fcc1cb9，grade2_final_content_review逐選項核為象唯一。原Q及同校114國語二年級康軒選書PDF皆另核實bytes/SHA/指定格，見source-provenance.json。

獨立複核另攔下新解說「前句已明指有長鼻子的動物」中長的預設讀音錯誤，已加精確完整句規則，沒有用全域長字或廣泛「有長鼻子」覆寫。題幹與解說的長均經真正syllables回傳的{text,zy}斷言為ㄔㄤˊ。既有26688 phrases及3028 chars均0改0刪，只新增5個短句，437已審語境。

| 最終檢查 | 實跑結果 |
|---|---|
| build/audit/注音/tsc/Vite/server | PASS；6521 static、23192 generated、42 pools，0findings。|
| 修訂專項 | 16 PASS，包括全部舊6311物件、210題答鍵/分流、一次獎勵、前版本保存與新動物語境/兩處長字讀音。|
| 普通全套 | 1562 PASS、280條件skip、0fail；原始JSON/log在evidence。|
| fresh PostgreSQL | 30支各新建空DB、284 PASS；每DB有名稱及publicTablesBefore0。|
| 精確skip對應 | file＋fullName＋occurrence，280/280對到PG PASS、4重疊、0未覆蓋，1842 unique PASS。|
| CUA手機刷題 | 合成memory fixture、375×812：題文完整，選象答對一次＋10、自動到index1，重載回港口接續仍index1；0水平溢出/缺圖/console warn/error。|
| 正式環境 | 未查詢或寫入；無正式BEFORE/AFTER、無部署。仍待最新main整合及獨立正式閘門。|

初始build.log早於字典generator完成而因新文字未登錄失敗，已保留；generator完成後的最終build-final.log才是建置證據。初始新增讀音測試誤把syllables的物件回傳當字串斷言，失敗log亦保留；現改為同時斷言文字長及其zy，未降低產品檢查。修正解說讀音前的一輪完整測試留在本機output/finals131-pr22-correction/before-explanation-pronunciation-fix，未計入本表最終閘門。

獨立最終複核BOUNDED_PASS（P2已解除），另見本目錄falsifier.json。本修訂不把131份全卷視為通過，亦不解除PR19後合併當時main重測、PR23重綁，以及發布前後資料保全的要求。原036cf381及舊PR23結果保留作歷史，不能直接作正式發布候選。
