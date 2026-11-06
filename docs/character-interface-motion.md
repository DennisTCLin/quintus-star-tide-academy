# 角色介面動畫需求與驗收

## 目標

目前已發布的 14 位英雄與 375 位夥伴／怪物，在出現的介面中有符合情境的動態反應。沿用原造型與既有 Higgsfield 素材；卡片微動、出場與選中反應不能取代真正的三招影片、骨架戰鬥或語音角色演出。

- 瀏覽：依角色原有 movement metadata 或類型作輕微呼吸、漂浮、游動等動作。
- 操作：選中／招呼短暫回應；獲得／勝利有出場或慶祝反應。
- 戰鬥：沿用實際事件時間與傷害，對應攻擊、受擊、勝負與倒地；不修改戰鬥規則。
- 後勤：受傷休養保持輕微呼吸，倒地停止待機跳動；鎖定角色維持靜態。
- 學習：答題目標保持穩定，既有數學教學／答對／答錯反應保留。地圖與非答題的角色展示補上動態。
- 效能：共用 IntersectionObserver；不可見、背景分頁、未載入圖片暫停。尊重系統、頁面與元件的減少動態設定。
- 保全：不改 XP、收藏、領地、血量、伺服器 API、玩家資料或正式部署。

這一批是介面呈現工作，不聲稱新產製逐隻影片。沒有新的 Higgsfield 扣點。

## 覆蓋表

| 介面 | 動畫呈現來源／本批變更 |
|---|---|
| 卡冊、交換卡、一般選角 | App Art／PetPicker／CardFace：待機、選中、鎖定；保留 SSS 光環 |
| 好友收藏、對戰選角、訓練 | CollectionBoard、BattlePetPicker、TrainingPanel：待機與選中 |
| 聯盟英雄封面、英雄選擇、遠征編隊 | ConquestEnrollment、ConquestGame：英雄待機、選中、未解鎖靜態 |
| 駐島守軍、增援、後勤 | ConquestGame、ConquestLogistics：依血量顯示待命、休養、倒地 |
| 群島戰前／實戰／戰報 | ConquestBattle：英雄登場／結算、隊員攻擊／受擊／倒地；既有 ConquestBattlefield 骨架與特效保留 |
| 練習、好友對戰 | BattleScene／QuizEncounter：既有三招影片、sprite sheet 與 MonsterMotion 優先；圖片備援補動態，後備隊依 HP 呈現 |
| 怪物圖鑑、招募成功 | MonsterBestiary、MonsterMotion、QuizEncounter：原影片優先，失敗備援仍可回應，招募揭曉 |
| 抽獎、初始夥伴 | GachaMachine、StarterOnboarding：抽獎結果與首次相遇的揭曉反應 |
| 房間、家園、編輯住民、城堡進階 | HomeArt、HomeScene、RoomEditor、CastleExterior：待機、招呼、休息、選中、慶祝；IslandHabitat 既有行走保留 |
| 課程島嶼收集預覽 | IslandCollectionPreview：所有已發布角色縮圖有待機呈現 |
| 動手玩數學 | IslandApp：地圖神獸、單元相遇、島主入口補動畫；原答題 mood、受擊、倒地、結算演出保留 |
| 引導、語音與教學 | TideglowCompanion、DragonGuide 入口；DragonMascot 影片失敗備援；CountOnExplanation 招呼。TideglowActor／ElementGuide 既有演出保留 |
| 結算 | OutcomeAnimation 原勝敗動畫與影片保留 |

不屬於角色演出的圖片：真實玩家照片、題圖、家具、地景、品牌標誌、導航建築。沒有為了動畫移動孩子的題目或答案按鈕。

## 驗證紀錄（2026-11-05，本機分支）

- 基線：c08790b5；獨立分支 codex/character-interface-motion。先接上 a83d3bac 發布證據，再無衝突整合影片主線 21cb7463；42 個不重疊動畫檔與 15 個不重疊故事檔逐檔相同，App.tsx 同時保留兩批入口，見 story-integration.json。
- **PASS — 完整建置與測試**：`npm run build`，`npm test -- --maxWorkers=4`；166 個測試檔通過，1476 項通過、235 項因未接隔離資料庫而略過。建置包含 TypeScript、內容審核、注音、Vite 與伺服器 bundle。21cb7463 整合後重跑同樣通過；最新記錄為 build-story-integration.log / tests-story-integration.log（留在本機，未提交大型 log）。
- **PASS — 全名單與素材**：14 位英雄＋375 位夥伴／怪物均有受支援的呈現策略；679 個不重複原圖／縮圖檔案均存在且可解碼，見 asset-verification.json。清點剩餘原生 img 並分類為既有角色演出或非角色圖片，見 remaining-images.txt。
- **PASS — 可視區域與生命週期**：全名單 389 張同時掛載時，桌面當下 21 張可視角色啟用、368 張暫停。手機 390×844、iPad 820×1180 選角與英雄畫面無水平溢出。共用 observer/listener、卸載、遲到 callback、失敗圖片、無 IntersectionObserver 備援均有 lifecycle 測試。
- **PASS — 延遲載入與減少動態**：8 秒延遲圖片載入前 active=false、paused，載入後完整播放揭曉；10 種 pose 的計算樣式核對，倒地／鎖定為 none，減少動態關閉角色動畫。
- **PASS — 實際元件互動**：BattlePetPicker 選中、ConquestEnrollment 聯盟與英雄、TrainingPanel 切換夥伴、GachaMachine 結果、RoomEditor 住民選擇與 HomeScene 招呼、IslandApp 地圖神獸與單元招呼、ConquestLogistics 受傷／倒地皆於本機 fixture 操作驗證。
- **PASS — 群島實戰**：由 ConquestGame 選島、預覽、進攻到結算、駐防，保留 3D 戰場；DOM 觀測捕捉 idle → attack / hit → defeated / victory，見 battle-animation-trace.json。勝利角色使用 portrait-reveal，倒地角色 animation=none。這是本機記憶體戰鬥，不是正式玩家攻擊。
- **PASS — 媒體備援與招募**：MonsterMotion 故意載入不存在的本機影片後，原角色揭曉與重試按鈕仍可用；捕獲 summaryOnly 在沒有另一個戰鬥舞台時仍能播放揭曉。原有三招影片與專用動畫播放器保持優先。
- **PASS — 唯讀複查**：載入等待、SSS 光環、reduced props、獨立招募可視性、舊 CSS 優先序、連續技能重播 key、媒體失敗取消 RAF 均已修正／複核。最後複查未發現新的阻擋問題。
- **PASS — 資料保全範圍**：產品差異僅在呈現元件、CSS 與測試；未修改 XP、收藏、領地、戰鬥規則、server API。驗收頁沒有 API proxy，資料全部由本機 factory 建立並留在記憶體。

### 驗證界線

沒有操作孩子帳號、逐一走完每個登入／社交帳號流程，也沒有重新人工觀看全部既有出招影片；這批以完整入口程式清點、共用機制測試及上述實際元件互動驗收。原影片及既有骨架演出沒有被換成卡片微動。

內建瀏覽器切換後仍回報 document.hidden=false，因此不宣稱已完成真實 OS 背景切換驗收；visibilitychange 的暫停／恢復與卸載由 lifecycle 測試驗證。235 個資料庫條件測試未執行；本批未改資料層。

### 本機驗收與回退

在專案根目錄執行：

```sh
node_modules/.bin/vite --config output/character-interface-motion/vite.config.mjs
```

開啟 `http://127.0.0.1:4374/output/character-interface-motion/preview.html`，切換展示分類、選中角色、勾選減少動態，或從群島進入本機戰鬥。所有互動只有記憶體資料，重新載入即重置。

回退方式：撤回本批呈現元件與入口替換；無資料遷移。本批獨立提交供下一次發布整合，不自行部署。

## 成人版整合後複驗（2026-11-06）

- 從 canonical main `dfafb55e` 無衝突整合。成人入口／同步、故事影片、群島新領地總覽與玩家規則保留；本批相對 main 沒有 server、成人程式、角色資料或 public 素材變更。
- 完整 build PASS；171 個測試檔通過，1510 項通過、251 項資料庫條件測試略過。記錄：build-adult-integration.log、tests-adult-integration.log。
- 最新真實瀏覽器驗收：390×844 與 820×1180 無橫向溢出；英雄選中、群島新總覽、減少動態、故意失敗影片的原圖備援與重試按鈕 PASS。
- 全 389 張名單的 180 幀採樣：手機尺寸 p95 8.9ms、iPad 尺寸 p95 9.1ms，均無 >50ms 畫格；僅可視 6／25 張啟用動畫。這是桌面瀏覽器的 viewport 採樣，不是實體手機/iPad 硬體效能保證。證據：release-browser-checks.json。
- 本機效能面板首輪 JSON 未換行造成工具自身橫向溢出，已修正並重驗英雄與群島；沒有為了通過檢查裁切產品內容。
- 未夾帶其他聊天尚待人類認可的英雄新素材；本批仍沿用 main 既有圖片與影片。
- 最新唯讀候選複查 PASS。正式發布另以本機專用紀錄保存發布前／後資料保全與版本核對，不將帳號資訊放入公開 PR。
