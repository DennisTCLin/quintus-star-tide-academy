# iPad LAN登入相容性

使用者實機：iPad Air 13-inch (M3)、iPadOS26.5.2。首次LAN HTTP登入後進入ErrorBoundary，實機驗收FAIL。

WebKit同一LAN origin重現：isSecureContext=false、crypto.randomUUID=undefined、getRandomValues=function。原程式presence掛載呼叫randomUUID造成例外；localhost測試沒有涵蓋此差異。

修正：前端共用clientId，安全環境優先native randomUUID，否則使用getRandomValues產生UUIDv4。全部8個前端呼叫改用此函式；未修改伺服器驗證、權杖、重試ID保留或獎勵規則。

3項UUID單元測試、全體888 PASS／179 DB測試略過及build PASS；獨立程式審查PASS。同LAN WebKit重測登入後到達港口，未再出現該例外。初始未登入state請求仍有預期401，不作零錯誤宣稱。before.json/after.json記錄能力及畫面文字；不含真實孩子資料或密碼。

4374目前凍結integration+UUID修正版，並非原PR1-only版本。未部署正式站。2026-10-27使用者實機重驗確認「聽說明」與雲端圖示完整；圖示驗收通過。未宣稱已驗證聲音播放。完整整合發布仍須上游就緒與最終合併核對。
