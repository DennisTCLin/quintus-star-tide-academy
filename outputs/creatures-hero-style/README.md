# 100 隻英雄畫風修正版

使用者認可三角色校準稿後，透過 Higgsfield 重製既有 50 隻夥伴與 50 隻怪物。縮小眼睛、拉長四肢、增加力量感與立體光影；以寬毛束與甲片控制紋路密度。角色身份、名稱、數值、技能、稀有度、抽取規則均不變。

- 20 張圖版全部成功（每張 1 credit 報價，合計 20；校準稿另 1）。4 次 429 回應無 job ID，等待後才重送未建立工作；沒有重送已成功建立的工作。
- 200 張唯一透明 WebP，640/320 各 100，合計 9,130,438 bytes；逐張解碼、雜湊、尺寸、透明邊緣驗證通過。
- 修正右上角色裁切區跨到下排的問題，避免夾帶鄰近角色碎片或截去頭部。
- 建置 PASS；956 tests PASS，213 項需要 Postgres 環境的整合測試跳過。
- WebKit 202 assertions PASS，逐角色詳情與技能、手機/平板寬度及全部圖片載入通過。
- 對照 Git 6b15f4d，兩個圖鑑模組只變更 image/thumbnail 雜湊，其他欄位完全相同。未操作真實玩家資料。
- all.html 是全部新立繪；index.html 是核准稿與舊稿對照。仍為立繪，沒有新增專屬動畫。
- results.json/requests.json/assets.json 記錄所有生成與來源雜湊；sources PNG 不入 Git。

回復：可回復此提交的圖片與兩個圖鑑模組；角色 ID、資料格式與持有狀態均未變。

正式發布：PR #21 merged，runtime 73abee40f4d49d51e5b75c3898bf9fd503dc02d7，Railway ed92bd7a-3103-4ae5-a21e-257c25b7172a SUCCESS。正式站 HTML 與本地建置一致，212 檔（含全部 200 張新圖）雜湊驗證 PASS，healthz 正常、匿名 state 401。
