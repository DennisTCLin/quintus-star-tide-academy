# 星潮故事觀看入口

港口的「星潮故事」與主要導覽的「故事」開啟同一個播放器。沿用正常登入／選擇玩家流程，直接入口為 `/?story=opening` 與 `/?story=lighthouse`。其他 `story` 值不會載入額外內容。

- 開篇〈最後一道光〉：48 秒。
- 第一篇〈最後一座燈塔〉：146 秒。
- 兩支沿用使用者選定的 Holden 國語旁白、原創配樂與燒錄的繁體字幕。網站版保留 1920×1080、H.264/AAC 與 fast-start，供應同源、內容雜湊命名的 MP4 與 JPEG 封面；影片約 19 MB／59 MB。

`src/story-films.ts` 保存故事資訊，`src/data/story-media.json` 指向 `public/assets/stories/`。首頁只載入封面；進入故事頁仍需主動播放。一次只掛載一支影片，支援原生快轉與全螢幕，播放失敗可重試。切換影片、離頁、切換玩家會清除舊串流；隱藏分頁暫停且不自行恢復聲音。故事頁停用背景配樂與陪伴角色打擾，頁面朗讀與影片互相讓出聲音。

原始成片：

- 開篇：`https://d2ol7oe51mr4n9.cloudfront.net/user_3IddyqW3CuEo5SavyNhdLjWWZJu/422b0b74-be89-4b5c-a0c8-ab0e16196c70.mp4`
- 第一篇：`https://d2ol7oe51mr4n9.cloudfront.net/user_3IddyqW3CuEo5SavyNhdLjWWZJu/c8775bc8-4115-4d86-9d62-3960b6c663ac.mp4`

新增介面詞句保留既有注音字典，只補新詞；「避難」依教育部辭典修正為 ㄅㄧˋ ㄋㄢˋ，來源 https://dict.concised.moe.edu.tw/dictView.jsp?ID=1397&la=0&powerMode=0 。

驗證：`npm run build`、`npm test -- --maxWorkers=4`；瀏覽器測試涵蓋 390／1440 寬度的兩片真播放、快轉、全螢幕、單播放器釋放、背景音樂隔離、錯誤重試、直接入口、影片不預載與版面不溢出。開發模式另外驗證 StrictMode 重播 effect 後仍能播放、分頁隱藏與頁面朗讀會暫停影片。QA 腳本、截圖及資產雜湊證據位於本機 `output/story-cinema/`。

本功能不寫入觀看紀錄或玩家進度，不變更 API／資料庫／CSP。部署應接續目前整合分支，完成既有單一發布流程後驗證上述入口、影片 HEAD／Range 與 `/healthz`；回復僅需回復程式版本，不還原資料庫。
