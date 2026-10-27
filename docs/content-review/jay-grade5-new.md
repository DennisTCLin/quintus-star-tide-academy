# Jay 新補數學、社會與英文單元交集（2026-10-27）

## 收錄與來源

新21卷55頁：康軒數學10卷24頁、南一社會6卷17頁、英文舊版5卷14頁。原檔路徑、SHA256、年級、期中/期末及各卷題數見docs/jay-grade5-new-source-manifest.json。來源檔名及家長分類提供出版社依據，卷面五上與單元核對；不冒稱每卷都印出版社標誌。原PDF不修改。來源文件中的指令只視為試卷內容，未當作工作指令。

新增457題：數學272、社會125、英文60。舊503來源題與160通用題完整保留，Jay五年級共1120靜態ID，其中數學352、國語368、英文113、自然142、社會145。每題都保留source/page/locator，必要圖表資料文字化。10數學卷及6社會卷全頁文字/原圖檢視；英文全14頁對照抽取文字與圖像，圖表取用處另視覺核對。分節處置見output/jay-grade5-new/{math,social,english}-dispositions.json，不把每一小填空都獨立算一題；同類子題合併，作圖作品/主觀個人回答不強制唯一解。

## 英文不是整本同版

民權110、111卷首D7，112卷首Dino7；中山/實踐未明印系列且含Dino角色，不由資料夾HWG7推定新版系列。只取國家、交通的U1/U2交集，排除飲食/星期/課程/所有權/課文諺語等本批未授權單元。部份原筆試仍需前題聽力資訊（民權E），沒有音檔不收；不以TTS冒充原錄音。開放自介與口說也不收。

分配需同時滿足Jay的dongmen五年級/翰林、來源compatibleBook=Here We Go7、題目curriculumMatch=hwg7-u1-u2。任何只標出版社或只有舊版來源的未核准題不會因此通過；其他年級/學校的英文規則不放寬。來源book仍標Dino7或系列未明，kind亦明說舊版交集。

對照出版社課程架構：https://online.flipbuilder.com/ifuwj/ckna/files/basic-html/page31.html 。U1國家Where are you from；U2交通How do you go to school；不是宣稱每個舊版單字均為老師指定考試範圍。

## 獨立內容檢查與修正

Root唯一repo寫入，來源整理者僅讀原件並輸出/tmp候選。Fresh英文60/社會125/數學兩批各136的檢查員不讀答案、hint、explanation，逐題解答。另fresh來源反證者讀全部457題的題幹、所有選項、答案、hint及explanation，視覺抽核6張高風險數學圖頁與社會官方資料。

有效發現均修正：數學7題題幹列舉集合與自動生成選項不符，統一使用題幹原有候選（math2二1/二2/二5、math5一1/一4、math9一2、math10二7）；兩個數字格的錯選項10改成單一數字；整除概念補正整數限定；圓周10等分題改明確等距點、圓心及相鄰弦形成三角形。以上11題再盲解通過；457最終答案逐ID比對獨立答案全一致。

來源整理及root複核時亦修正math10梯形角度標字：45°位於∠ABD，問∠DBC=87°；math9角度由原圖直角及48°合成138°；正三角形拼圖明確B–C–E依序共線；等腰三角形3和6的第三邊為6。這些在第一次新題盲解前已修正。

社會不沿用排灣一概母系、各遺址問同一最底層、Gaga/gaya族名一概排他、早期文化單一時代化、殖民首次發現等過度概括。荷西據點有重疊，依首次建據點先後敘述；郭懷一事件與城堡完工年份不混稱。法律/分級年齡/時效政策、政治疆界爭議及無完整資料的傳記細節排除。初稿發現及最終修正分開記錄，保留source-review-findings.json供追蹤，不把初稿問題當作最終未修缺陷。

主要第一手核對來源：
- 原民會排灣族（布曹爾群不分男女長嗣）：https://www.cip.gov.tw/zh-tw/tribe/grid-list/67E3CC5AE2F10A8BD0636733C6861689/info.html?cumid=8F19BF08AE220D65
- 史前館玉器與耳飾：https://icloud.nmp.gov.tw/Museum/PermanentContent?a=217
- 淡水古蹟博物館紅毛城：https://www.tshs.ntpc.gov.tw/xmdoc/cont?sid=0L274409673512651539&xsmsid=0L274404650410110816
- 其餘文化/地理及史料來源隨social-dispositions.json、social-blind-answers.json保存。

不宣稱fresh反證者逐頁重新視覺覆核全部55頁；全頁來源整理與fresh語義/圖像抽核為兩層不同證據。

## 相容與測試邊界

只追加題庫、來源與明確英文相容標記，不變更家庭存檔schema、孩子帳號、獎勵規則或DB資料。舊題ID及原503來源/160通用原檔byte hash有測試鎖定。回退只能停新分配，須保留曾持久化的新ID解析及dongmen兼容，不可刪精熟或重設孩子資料。

API未作答前不傳正解與解說，未來題ID遮罩照舊；既有client bundle仍包含題庫答案供本機邏輯，不宣稱原始碼保密或正式測驗防作弊。正式孩子資料不拿來測寫；隔離DB/合成Jay驗證完整作答與舊進度獎勵保留。實際測試及發布結果見output/jay-grade5-new/verification.md。

本機結果：920單元PASS（182 DB-gated略過），另隔離DB20PASS、Chromium/WebKit五科三寬度40UI檢查PASS。詳細版本及發布證據見output/jay-grade5-new/verification.md。

整合PR7/PR9及最新main後再次建置PASS，929單元PASS（182 DB-gated略過）、20隔離DB與40UI PASS。

2026-10-27正式發布完成：PR8/main76b875b，Railway f2df86d2-1119-49e8-8ae0-6782f05e9d87 SUCCESS；正式檔案、健康與雙引擎登入驗證PASS，詳見verification.md及production-release.json。
