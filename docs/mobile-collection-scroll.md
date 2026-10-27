# 手機收藏視窗捲動修正

家長提供iPhone截圖：45種收藏的視窗無法上下滑。原本由原生dialog自身承擔捲動；沒有找到觸控事件preventDefault或touch-action:none。無法確認實機引擎的原始觸發原因。

CollectionViewer選用SocialDialog的scrollBody模式：固定視窗外框與標題／關閉按鈕，內容使用min-height:0的獨立overflow-y:auto區域，明確允許pan-y與pinch-zoom。只在[open]時使用flex，其他好友與線上對戰視窗不改。保留原生showModal、取消與焦點復原。

驗證：npm run build PASS。使用真正CollectionViewer與CSS、45種合成收藏的fixture（不登入孩子帳號）驗證WebKit手機402×681與320×500：初始24卡、更多載入到45卡、最後一張可見、關閉鍵保持可見、關閉復原鍵盤開啟焦點、320px無橫向溢出。Chromium手機CDP原生touch事件上滑scrollTop297，下滑回9，背景scrollY0。獨立唯讀複核無阻擋。未宣稱實體iPhone已測通；fixture未載入所有App模組，已查全專案social-dialog/觸控規則沒有其他覆蓋。

可重現fixture與截圖／工具紀錄：output/playwright/collection-scroll/。fixture僅供Vite開發測試，不在正式入口引用，發布封裝排除output目錄。

正式runtime 6617fc7896a39d07f5b90e4436e419578e64ad3d；Railway 8d69e10b-6c4e-4682-a21f-791eeca65421 SUCCESS。正式10個入口/JS/CSS雜湊與本機build一致，health200/ok、匿名state401。無資料遷移，可回退f4102c6。
