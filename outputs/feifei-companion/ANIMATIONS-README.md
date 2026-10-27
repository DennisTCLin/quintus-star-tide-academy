# 王筱斐專屬學伴：蝴蝶結寶寶（黑眼睛定稿）

12 段 Higgsfield Kling 3.0 standard 無聲動畫，原始每段 5 秒，共 90 credits。

- animations-v1：網頁用 H264 / yuv420p / 640×640 / 24fps MP4 與對應 JPG。
- frames-v1：供 iPad 舊版影片播放受限時使用的 JPEG 逐格圖集，320×320 / 10fps。讀取 animation-assets.json 的欄列、幀數與速度；需前端 canvas 播放器整合，單獨 JPEG 不會自動播放。
- preview.html：12 段影片本機預覽。
- animations-generation.json：生成提示、參考圖、job ID 與原始結果來源。

已逐段視檢：摸頭、吃星形餅乾、接球、碰掌、吹泡泡、閉眼躺睡、揮手、聆聽、思考、說話、歡呼、待機。黑眼睛、粉紅蝴蝶結和黃色斑塊身份保留。

休息裁切自 2 秒後的睡姿，待機裁切自 1.5 秒後的放手姿勢，使用正反序列讓循環不跳回初始揮手站姿。網站整合採用 public/assets/feifei-bow/v1，包含 12 段動畫、各動作海報及重新製作的 256px / 10fps JPEG 圖集（每張最寬 2048px）。舊版 iPad 直接播放逐格動畫，其他裝置影片失敗時使用同一動作的逐格備援。

專屬條件為登入帳號 feifei、帳號所屬 profile feifei、目前 profile feifei 三者同時成立；共用 profile 槽位的 jimmy 不會取得此角色。Olivia 的派對狗狗維持原樣。聊天使用虛構角色名稱，無須將學生姓名傳給生成服務。

驗證：browser-qa.py 使用合成 API fixture，不修改學生資料；檢查 WebKit/iPad 15 模擬、Chromium、六種互動、暫停恢復、影片失敗、減少動態效果、三種視窗寬度及帳號隔離。此測試並非實體 iPad 實測。
