# 星海遠行者與邊境怪物：新增 30＋30

基底：a2ce19d。新增 30 種可抽取夥伴與 30 種可遭遇／降服的怪物；每組金木水火土各 6 種，E、D、C、B、A、S 各 5 種。總圖鑑 275 種（普通夥伴 135、怪物 140）。

## 相容性與取得方式

- 舊 215 種 ID、圖鑑編號及素材不變。新夥伴 `w3-` 編號 216–245；新怪物 `w5-` 編號 246–275，怪物專用編號 111–140。
- 普通券與星耀特邀券皆沿用先抽稀有度、再抽同級物種的機制；權重未變。普通 S 1%、SS 0.3%、SSS 0.1%；特邀券 S 30%、A 70%。新手初始池未變。
- 新怪物 E–C 在初階航程遇見、B–S 在練習提升 4 級以上航程遇見。仍依島嶼屬性選取；連續答對三題降服流程不變。
- HP／攻擊／防禦／天生等級與技能效果沿用既有規則。未更動玩家、帳密、題庫、星幣、券數或經驗值。
- 新角色本批使用原創透明立繪及既有戰鬥回饋，**沒有新增專屬影片動畫**。不將 CSS 動態宣稱為逐格／影片動畫，也未改動 MonsterMotion 的已驗收影片清單。

## 素材

Higgsfield GPT Image 2.5 Flare，12 張 2K 透明合圖，每張五種不同造型；報價合計 12 credits。四張首次提交遭明確 429 拒絕，待首批完成後僅重試未提交四張；全部 12 job 成功。紀錄見 `outputs/creatures-sixty/requests.json`、`results.json`。

獨立 640px 立繪及 320px 縮圖共 120 個 WebP，約 8.6 MB。打包時切分透明邊界、移除相鄰格殘片、保留細節透明度與外圈留白。部分高階角色保留淡色光暈。`assets.json` 保留原圖 SHA256、生成 job、裁切框、輸出 SHA256；網址用內容 hash 版本。原始大圖保留本機 sources，不送到正式部署。

## 驗證與復原

- 新 60 種身份、名稱、編號唯一；每種新夥伴可抽、交換、裝備及存檔讀回。
- 每種新怪物可在對應航線遇見，完成答題、降服、重複結算、裝備後存檔讀回。
- 10,000 點取樣驗證普通券／特邀券精確稀有度分布。
- 完整建置 PASS；140 套件／950 測試 PASS，213 個需資料庫測試未執行。
- 獨立複查 9 套件／60 測試 PASS；120 個 WebP 透明邊界與尺寸 PASS。
- WebKit 以隔離合成玩家驗證實際圖鑑詳情／技能／圖片及手機、iPad 尺寸，未操作真實玩家。實體 iPad 未測。
- 玩家取得新卡後不可退回不認識新 ID 的版本；應保留資料定義向前修復，必要時關閉新取得入口，不刪既有收藏。

完整建置、單元測試與瀏覽器結果見 `outputs/creatures-sixty/` 及 `output/playwright/creatures-sixty/`。正式部署結果若存在，另見 production.json。

## Production release

Railway deployment `91f34e37-593b-4490-92e6-11245f916702` succeeded. Public verification matched the validated HTML and 132 JavaScript, CSS, and new creature assets. Health check passed and anonymous state remained unauthorized. The runtime package restored 1,196 unchanged assets with exact byte and SHA-256 verification. No student state was written.
