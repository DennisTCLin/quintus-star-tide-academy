# 手機首頁學伴入口修正

- 原因：首頁設定 hideLauncher，只保留島嶼選擇後的 inline entry；手機初始畫面看不到學伴。
- 修正：首頁採 launcherMobileOnly，700px 以下恢復固定於右下角的學伴。桌面及平板維持原有 inline entry；其他頁的入口與 suppressed 行為保留。
- Source：17c9d26。
- Railway deployment：df416944-9da2-498f-b89d-149904965456，SUCCESS；正式站 12 項檢查亦全部通過。
- 驗證：build 通過；WebKit 與 Chrome 各測 375、393、430px 初始畫面可見、開啟與播放休息、關閉焦點、捲動後可見、834px inline entry，以及 Olivia/Jimmy 身份隔離，共 12 項。使用合成 API fixture，未修改學生資料，並非實體手機測試。
- 本機結果：mobile-local/mobile-entry-results.json。正式站結果：mobile-production/mobile-entry-results.json。
