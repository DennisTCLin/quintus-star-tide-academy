# PR22 整合正式 main341aff

210題仍與更正後PR22／386bd570完整一致，含象/像動物語境與兩處長鼻讀音。新增的PR23 108題、額外55題、後續25題與8題提案、三年級及英文均未混入。本次以實際remote main341aff（tree8d12b570）為正式基底，接續已審d521離線checkpoint。

341aff相對047b只變動ConquestGame.tsx、ConquestScene.tsx、conquest.css。三檔完整內容與341aff逐byte相等，沒有覆蓋剛發布的手機修正。對d521的777筆src/server/scripts/tests/compiled-game/adult輸入重算，只有同3個UI檔改變，game.mjs、game.css、adult.mjs全部相同。既有adult/world/auth/database/儲存與獎勵規則都保留。字典保留26843 phrases/3029 chars與440人工context phrases，沒有重新以單側覆蓋。

|本次新基底檢查|實跑結果|
|---|---|
|build/content audit/注音/tsc/Vite/server|PASS；6521 static、23192 generated、0findings。|
|完整普通回歸|1593 PASS、334條件skip、0fail，所有suite PASS。|
|每檔全新空本機PostgreSQL重新執行|36個不同DB，339 PASS，每檔publicTablesBefore=0。未沿用d521結果冒充本次新跑。|
|精確skip配對|file＋fullName＋occurrence；334/334對到本次PG PASS，5重疊，1927 unique PASS。|
|375×812合成手機UI|完整長鼻語境與象/像選項；一次作答後第2題，星幣1234→1244；重載回港口後仍接續第2題。scrollWidth375，0brokenImages。|
|來源與獨立審查|先前main6311、PR22完整6521、23192生成題、全部approvals物件精確保留；本次源差異與手機證據獨立BOUNDED PASS，待最終head及新36PG報告綁定。|
|正式環境|此分支無正式DB查詢／QA／部署；正式發版仍需另開新BEFORE/AFTER窗口。|

第一輪這次UI曾在建立newtab前設定375，實際量測為1280桌面，因此完整保留於browser/initial-desktop-viewport，未算mobile PASS。之後先建立tab再設375，實測innerWidth375後才操作，三張browser/{before,after,reload}.jpg才是375×812證據；最後還原viewport並關閉自己的本機UI。測試只支持此單一象/像答題路線，不擴稱已重驗8條UI、Conquest海圖、console或auto/manual觸發分類。

舊main047b的兩次sandbox server.test hook逾時、隨後允許localhost的完整PASS資料仍保留於rebind-main047b；不隱去失敗，也不列作本次main341的通過證據。這次普通及PG皆為main341整合來源的新執行。

131份原卷仍非全數逐題通過；出版社／冊次／單元有疑問、缺圖、缺聽力、多答或文字層不可靠者仍隔離。孩子與成人原帳號、穩定題目ID、既有學習進度、收藏、獎勵、收據與歷史不得清空、重設或還原舊快照。PR23等PR22正式整合後再獨立重綁；不把兩支合成一批。
