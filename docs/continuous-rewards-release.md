# 持續獎勵與怪物分級發布

## 已授權規則

- 每次符合條件的六題挑戰成功都有一次固定稀有度機率捕捉；取消每日三次限額。不保證每次捕捉成功。
- 每兩場成功累積一張星願券；完成星可跨日、跨主航線／數學島。取消每日獲券上限。
- 新題與系統安排複習當天第一次提交答對得10星幣，取消每日15題上限；錯後重開、重送、備份還原不能重領同一首答獎勵。
- 失敗不給完成星、票券或捕捉機會，已得答題星幣保留。仍為六題、累計三錯失敗。
- 玩家錢包顯示星幣／票券。歷史精熟點及解鎖保留；每滿20舊精熟點補10星幣（floor(points/20)*10），資料版本7及version1標記確保只轉換一次，不逐次重複補發。
- 普通航程與數學島捕捉結果可從港口／地圖重新開啟，避免刷新後看不到已加入的夥伴。

## 整合與驗證

本批包含用Higgsfield重新生成語音聊天交付的05f45ae數學島介面／資產；保留741bd65既有正式功能與2c6e09a文檔基線。所有改動由本聊天單一寫入、單一發布。五行學科島新工作留待本版immutable commit交接後整合。

完整測試71檔583項（含PostgreSQL）通過；npm run build通過。86趟／516題首答對可累積5160星幣、43券與86次捕捉判定的回歸測試通過；一次性轉換、平行重送、備份首答紀錄與結果恢復均有測試。人工瀏覽器證據見outputs/tiered-challenges/verification.json及outputs/continuous-rewards/island-capture-recovery-tablet.png。

發布只使用乾淨Git archive，不上傳本機QA帳號、資料庫、憑證或其他未追蹤輸出。新資料會寫version7；若需回復，必須保留version7 reader或採向前修正，不能直接部署舊version6程式。

本次分級限時詳見docs/tiered-challenges.md，僅限主航線新野外航程，並未把數學島／競技對戰改成相同限時模式。

## 正式發布結果

2026-10-25 13:46 台北時間確認Railway SUCCESS。執行程式來源commit `3d4b5e9c30769b597ccb1bb9412f651cec4530cc`；deployment `492cb4e6-5120-4b89-b162-e48f7aa6bc33`。`/health`及首頁HTTP200；全部5個JS chunks、首頁CSS、4個數學島資產SHA256與已測本機build一致。正式登入首頁可正常載入，console error0。沒有登入真實孩子帳號做正式站作答測試。

證據：`outputs/tiered-challenges/deployment.json`。此發布紀錄及最終截圖的後續commit不改執行程式。
