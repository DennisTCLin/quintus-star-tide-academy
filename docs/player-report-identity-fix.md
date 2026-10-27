# 家長艙玩家身分修正

Alan 使用四年級 quintus 題庫槽位。家長艙先前從 PLAYERS 模板取名、從帳號取得照片，導致王梓鑫照片旁標示 Quintus。現在兒童登入的進度與自適應報告只顯示該登入帳號，名稱與英文帳號綁定；家長家庭模式保留原有角色，但林沐澤明確標示為 Quintus。

已驗證王梓鑫（Alan）／4 年級／Alan 照片，以及林沐澤（Quintus）／4 年級／Quintus 照片。沒有修改帳號識別碼、密碼、分數、收藏、進度或資料庫資料。

同批整合另一對話已完成的選隊圖片卡片 e4905ba。App 不同區塊合併，兩份注音字典從整合來源重新產生。候選 c9d25e3 完整 build、注音檢查、98 檔 739 測試通過。兩帳號家長報告 Chromium 390px 無溢出；證據在 output/playwright/player-identity-review。

發布完成：aaadaea 已推送 main，Railway e5eea48c-d2a6-4694-9190-9bac16812b89 SUCCESS。正式 health 200，HTML 七個資產與本地建置完全相同，entry index.v-CfKRzeW7.js。整合 WebKit 53 項＋遮擋修正後 22 項補驗通過；學伴浮層在對戰頁隱藏，避免遮擋開始按鈕。
