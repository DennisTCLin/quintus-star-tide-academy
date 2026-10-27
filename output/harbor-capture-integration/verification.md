# 港口＋降服挑戰的發布前整合驗證

固定基線：港口PR1 `cb7d225`（原8539f0e＋idle證據/SVG修正）與 `codex/boss-wave4-capture-trial` 的 `1e76ccf7c74a65c6173f783092e5750644cc7458`。這是獨立整合分支，沒有把未完成的怪獸素材包發布，亦未將boss功能混入PR1的前端差異。

## 單一主要行為

`harborDeparture`以同一純函式決定按鈕文字及目的地：待完成降服（voyage優先於island）→未完成數學島→原unfinishedJourney（含legacy待領獎/補練）→選科。首頁移除獨立capture-resume，只保留港口主要CTA；非首頁仍可續做降服。二年級顯示「繼續降服」及對應注音，完整無障礙名稱維持「繼續降服挑戰」。讀音依[教育部降服詞條](https://dict.revised.moe.edu.tw/dictView.jsp?ID=110032&la=0&powerMode=0)核對，沿用既有降服上下文規則。

開啟不送command；關閉及頁面導航不改run、mathIsland、coins、tickets、owned、learning、growth、milestones。Safari點擊時明確建立可回復的焦點；requestLearning維持零參數，避免TrainingPanel/RoomEditor直接onClick所傳入的SyntheticEvent被誤當HTMLElement。非首頁原按鈕會在視窗開啟時重建，關閉後於下一影格重新找可見按鈕回復焦點，保留仍存在的原opener。

## 實際結果

- build PASS；30項目的地、capture、brand及journey focused tests PASS。
- 全體單元885 PASS，179 DB tests因該輪未設定DB而略過；沒有把略過項目宣稱通過。相關範圍另以真實隔離PostgreSQL及合成帳號跑UI，不用真孩子。
- Chromium/WebKit：50檢查PASS，包括一般/數學島pending capture、grade1/2/4、320/375/820首屏與唯一可點主要CTA、離線禁用、Escape後焦點、TrainingPanel callback、非首頁全域入口焦點、part-answer/reload/resume、答錯或三題成功後恢復選科。導航ledger不變；完成降服不重發戰鬥獎勵。
- 初輪WebKit grade2/320 CTA底部超出568px，已縮短降服說明且同一斷言重跑通過；保留before截圖。
- 獨立反證曾抓到SyntheticEvent及非首頁opener卸載問題，已修復並增加實際入口/焦點斷言。最後獨立複查PASS。
- 測試等待函式曾被既有script-src self的CSP禁止unsafe-eval；改以兩個RAF等待DOM更新，不放寬產品CSP。

證據：browser-results.json、browser-check.py、start-local.mjs、build-output.txt、unit-output.txt、focused-output.txt及截圖。

## 尚未完成／發布閘門

實體iPad Safari由使用者協助：iPad Air 13-inch (M3)、iPadOS26.5.2，登入LAN預覽後立即顯示ErrorBoundary，首次實機驗收FAIL。WebKit透過LAN HTTP重現crypto.randomUUID不可用；localhost屬安全環境，先前測試未涵蓋此差異。已加入getRandomValues UUID v4 fallback並修正前端各呼叫，同一LAN WebKit可登入港口。4374已更新凍結預覽；2026-10-27使用者在同一實機回覆「聽說明」與雲端圖示完整，實機圖示閘門通過。此回覆未驗證聲音播放，不擴大宣稱。完整整合發布仍須上游就緒與最終合併核對。詳見../ipad-lan-compatibility/。

上游boss分支仍有作者進行中的素材及驗證；本輪固定1e76ccf測導向，不聲稱250段影片或整個boss功能可發布。上游完成後要合併本整合提交並再次核對最新main，而非直接合併舊兩支忽略CTA修正。

「陪你一起學」遮擋底部導覽屬下一PR。本輪沒有修改其位置、避讓或啟閉機制。

## 最新正式基線整合（2026-10-27）

已合入main 7da986c（30隻新怪物已發布版本），合併提交5841baf。兩份生成注音字典依合後來源重生。怪物、媒體與CaptureChallenge對main零差異，保留最新分齡閱讀。獨立複查PASS；建置PASS、893單元PASS／179DB測試略過；隔離PostgreSQL合成帳號Chromium/WebKit 50項UI回歸PASS。新版modal在開啟時隱藏底下港口，QA先等待節點attached，關閉modal後再檢查可見與可點，不改產品顯示邏輯。伺服器及資料契約對main無差異，本輪以隔離DB實際驗證登入、presence、導航與capture既有持久化流程。

## 發布結果

PR3合併至main e6848c4，原PR1也已合併。2026-10-27 Railway部署5a9cc990-9423-495d-aff7-f7a8d75711cf SUCCESS。正式首頁與194個非保留bundle/media檔案逐一SHA一致；health通過、未登入state回401。正式站WebKit/Chromium登入頁顯示正常、inline sprite掛載、無pageerror或水平溢出。發布後僅讀取檢查，不操作孩子帳號或進度。實機圖示證據來自發布前使用者回覆，不擴稱發布後實機或語音播放驗證。
