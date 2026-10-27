# 去背放大學伴與動畫群島還原

Source: 18f2602。Railway deployment: d0ca9bf2-3f62-4635-8560-5f630a1c837c，SUCCESS。正式站 10 項檢查及 2 個透明素材雜湊核對通過。

- 王筱斐首頁浮動學伴改用原 Higgsfield idle 影片衍生的透明動畫，移除圓框、背景並裁除留白；手機寬 116px、桌面 132px。
- 85 幀透明 WebP，216×276，約 843KB；減少動態效果與載入失敗使用透明 PNG。原來 12 段互動影片維持。
- 移除手機模糊雙欄縮圖及金框標牌，恢復清晰原比例 Higgsfield 全景與既有瀑布／水波動畫；科目用小型半透明標籤。注音、暫停、鍵盤焦點與原來航線選擇保留。
- Build、24 項相關測試、本機 WebKit／Chromium 10 項視覺檢查通過。測試 375、393、834、1440px，包含透明像素、入口開啟互動、地圖標籤界限、動畫暫停恢復及減少動態效果。
- 並非實體手機測試；使用合成 API fixture，不改動學生資料。

本機結果：visual-local/visual-results.json。正式站結果：visual-production/visual-results.json。

部署包將 544 個已核對的既有公開素材放在獨立 Docker layer，再複製新素材與程式，讓後續小幅更新可重用大型素材層。
