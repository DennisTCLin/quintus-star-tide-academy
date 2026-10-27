# 領地驗證

- 合併基線：3bd1e97（扭蛋、怪物圖鑑、Safari fallback）。
- 285 tests、建置通過；Vite 主 bundle 500kB 警示仍存在。
- 真實 DB/瀏覽器結果見 browser-verification.json；全4位非territory資料與verified分數完全相等。
- 本機效能見 performance.json；初始頁不載入領地素材、畫面測量見 frontend-performance.json。
- 獨立read-only模型驗證：容量48耗盡問題已以收納拆解修正；30個拆解/退款/偽造欄位案例通過。
- 獨立read-only UI驗證：24土地點擊中心、tab鍵盤、遠端移除正在搬移建築、取消拆解不送POST、reduced-motion全部通過。
- 最終CSS TerritoryPage.v-5PgLoXkm.css；320/390 ×4分頁，grade2/level10/50k資源/土地清單展開，原字級與逐元素computed font-size加倍皆無viewport或資源/h4內部溢出，零pageerrors。這是文字放大模擬，非實機測試。
- 曾出現QA註冊rate limit；只清除本機測試DB request_limits後重新執行，未改正式限制。
- 正式站結果將另存 production/，不使用真實四位玩家寫入測試。

## 正式站

部署 a93dde47-4b4c-4c6a-b522-5e18bb14bac7 SUCCESS；runtime 444af84。production/browser-verification.json 七組全PASS，零JS錯誤，所有非領地資料及verified分數與測試前相同。首輪theme期待逾時，未保存足夠診斷，不斷言根因；改逐命令等待回應，只有明確busy/no-request可有限重試，未盲目重送任何結果未知的操作。
