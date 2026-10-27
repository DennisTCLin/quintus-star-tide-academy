# 星潮學院媒體來源紀錄

最後核對：2026-10-24（Asia/Taipei）。本文件記錄目前 `public/assets/` 中實際發布的 110 個點陣／影片檔：既有 16 個首頁與前三隻夥伴媒體，加上 47 隻新夥伴的 94 個響應式 WebP。設計規格、未採用版本或檔案內缺少的標籤不會被當成來源證明。

## 結論與權利來源

- 四張既有原始插畫由 Codex 依使用者需求撰寫提示詞，透過內建 OpenAI ImageGen 產生；新增 47 隻夥伴則逐隻透過 Codex 的 `image_gen__imagegen` 產生。新批次的工具回傳沒有可靠供應商／模型欄位，因此不猜測具體模型。所有提示詞都要求原創並排除 Pokémon、Roblox 與其他既有遊戲／動畫角色或視覺識別；沒有使用第三方圖庫素材。
- 六段影片確實透過 Higgsfield Plugin 的 `seedance_2_5` 模型產生，模式為 `omni_reference`；參考圖是本專案自己的 `hero-ocean.jpg` 與 `tideglow-companion.png`。六個工作 ID 與輸出對應如下表。
- Higgsfield 原始輸出下載後，由 FFmpeg 重新編碼成網站版；六張 poster 由網站版影片擷取。正式網站只自託管這些輸出檔，不嵌入 Higgsfield SDK、播放器或追蹤器。
- 目前 MP4 容器只保留 `Lavf62.12.100` 編碼器標籤，沒有內嵌 Higgsfield 創作者標籤。因此「Higgsfield／Seedance」來源是由本次 Codex 工作紀錄、工作 ID、下載檔名與生成呼叫建立，不是單靠 MP4 metadata 推測。

## 發布資產總表

### 原創插畫與角色

| 發布檔 | 用途 | 發布尺寸 | 位元組 | SHA-256 |
|---|---|---:|---:|---|
| `hero-ocean.jpg` | 首屏靜態背景與影片參考圖 | 1672×941 | 500,026 | `271d4c7822ea54fe8f29f1696978b1d3cc34b42588c688d6f1182f67db177834` |
| `tideglow-companion.png` | 潮光獸透明角色圖與影片參考圖 | 480×438 | 257,656 | `ba59a555c79c034b592c12fa0a2f2d047a341ce69f2fbbb0fa6e6b0321eccf21` |
| `cloudsail-companion.png` | 雲帆鹿透明角色圖 | 673×700 | 534,004 | `e467c7f472c3cc1e665fe34584b1fffa9fd491ca86516c103f90f5391e5f6b50` |
| `coralflare-companion.png` | 珊火鯨透明角色圖 | 700×466 | 393,782 | `569ac509d10f2c80a0f31742d95ff4445d6ae5ca3ffc5d9cbb2bc21875ebd1b7` |

### 47 隻新增角色圖

新增角色原圖共 47 張透明 PNG，逐隻保留於 `artwork/characters/source/`；正式網站為每隻發布 640×640 與 320×320 兩個 WebP，共 94 檔、5,037,674 bytes。所有正式圖都把角色完整等比例縮放後置中於透明正方形畫布，不裁切、不拉伸；640 版角色最多 540×540，320 版最多 270×270，因此卡片和手機版都有一致安全邊界。

| 批次 | 角色數 | 原圖 | 發布 WebP | 完整可機讀來源紀錄 |
|---|---:|---:|---:|---|
| Tide | 16 | 16 | 32 | [`provenance-tide.json`](./artwork/characters/provenance-tide.json) |
| Cloud | 16 | 16 | 32 | [`provenance-cloud.json`](./artwork/characters/provenance-cloud.json) |
| Reef | 15 | 15 | 30 | [`provenance-reef.json`](./artwork/characters/provenance-reef.json) |
| **合計** | **47** | **47** | **94** | 每隻皆含生成提示、原始輸出、尺寸、bytes、SHA-256、轉檔與 QA |

三份 JSON 是新增角色逐檔證據的權威來源；其中包含完整精確提示詞，而不是依成品反推。Tide 批次以 Sharp/libvips 的 Lanczos3 `contain` 與透明 padding 產生 WebP；Cloud／Reef 批次以 FFmpeg Lanczos 完成相同幾何處理，再由 Pillow 12.3.0 編碼 WebP，原因是本機 FFmpeg 沒有 WebP encoder。三批都驗證輸出尺寸、alpha、完整輪廓與 SHA-256。網站 URL 的 `v=` 值使用對應 640 WebP 的 SHA-256 前 12 碼，讓一年期 immutable 快取可安全更新。

角色資料在 `src/characters.ts` 中另保存名稱、英文名、探索階級、元素、個性、故事、視覺 brief、調色盤與 alt text。探索階級分布固定為 E 12、D 10、C 8、B 7、A 5、S 4、SS 3、SSS 1；階級只描述材質與圖鑑探索深度，不表示戰力或商業稀缺性。

### Higgsfield 影片

六段皆為 8.041667 秒、24 fps、193 frames、H.264 High、`yuv420p`、無音軌。桌面為 1280×720；手機為 720×1280。

| 發布檔 | Higgsfield 工作 ID | 位元組 | SHA-256 |
|---|---|---:|---|
| `hero-departure-desktop.mp4` | `9b24638b-2488-4179-bb65-83eb1302a2fa` | 1,627,792 | `6749bb1f1bd57a4d996077f30bb30602a1fc6c30db818f075cda1c84fc4605e7` |
| `hero-companion-desktop.mp4` | `3fa8f393-e16e-4b49-ac65-af829a1dfdf4` | 1,153,363 | `59dee1235519959d8d7f0335d4cc953d2c3cbc6a4f9142551660981addee97e8` |
| `hero-shield-desktop.mp4` | `119434a9-79d8-45b5-8d01-28aad134a798` | 2,409,160 | `5fab7031140166928a3a7bc4652c59ef24964becee33773738962df001848bb8` |
| `hero-departure-mobile.mp4` | `b1041380-49a3-4037-a38e-aee51d58f645` | 1,340,040 | `e4076f4c977007ce529103b9cd89111f1f6500f221c91a9892978a0032c29b54` |
| `hero-companion-mobile.mp4` | `5bb5ffc0-c2b9-47ab-9df9-c1f24c35c0f3` | 1,764,195 | `faa45de61aba599f8d45f139405de7bdd14ab41b942a9fae74a99e0a3e0de1ce` |
| `hero-shield-mobile.mp4` | `9a2db635-9897-4723-bf95-105d1a55f982` | 2,471,987 | `3d443ecdb05881f7942e7031f897b7bd5cd21d6b1cc5ace5518a312316d9bc51` |

### 影片 Poster

Poster 不是另行生成的插畫，而是用 FFmpeg 從上表的網站版 MP4 擷取：啟航在 1.0 秒、夥伴在 2.0 秒、護盾在 3.8 秒，輸出 JPEG `-q:v 3`。

| 發布檔 | 來源影片／時間 | 尺寸 | 位元組 | SHA-256 |
|---|---|---:|---:|---|
| `hero-departure-desktop-poster.jpg` | desktop departure／1.0s | 1280×720 | 136,877 | `1e410a814e85a8275b905eb1e155e5b84065256026cda8ee7f8538116c63aa80` |
| `hero-departure-mobile-poster.jpg` | mobile departure／1.0s | 720×1280 | 78,955 | `66fc9e4bf8003e5f2ce61ba2b2f6569c92535cd4342763cf1c19f2cbda1b83a8` |
| `hero-companion-desktop-poster.jpg` | desktop companion／2.0s | 1280×720 | 57,526 | `4d1747d34812f81a6439a05f5953bf3b24c10d1d4c2b5917a038eeecc72fa124` |
| `hero-companion-mobile-poster.jpg` | mobile companion／2.0s | 720×1280 | 100,010 | `6409dffc99d1f1ddb9d0ceb80c6584a276ec0c1bc630c3cbc3120cf4f0a0a985` |
| `hero-shield-desktop-poster.jpg` | desktop shield／3.8s | 1280×720 | 98,737 | `729c8ec36fb1b775f3c1080be701f4f05e63f812d760c82e6ed010bf1521cb3a` |
| `hero-shield-mobile-poster.jpg` | mobile shield／3.8s | 720×1280 | 116,361 | `4ff330cf25fe128c3bfce6bcaa9ecacaaa5c7b36570ed65585ad0a848bf01c9f` |

## ImageGen 原圖與轉換鏈

| 發布檔 | ImageGen 原始輸出 ID | 原圖尺寸／SHA-256 | 發布前處理 |
|---|---|---|---|
| `hero-ocean.jpg` | `exec-06c2aaae-0e5c-4802-8e15-37e4681869a8.png` | 1672×941／`35ffa9fac607cfa398a04e941b7db21aea504b3c6f92be6d5400f277824dd918` | macOS `sips` 轉 JPEG、品質 78；未縮放 |
| `tideglow-companion.png` | `exec-26d84355-1cce-40b3-81fa-08604625150c.png` | 1312×1199／`aae1a06cad03e4c59fc6978f1410912bedd873ca64ad0b52972864ed584c78c2` | `sips -Z 480` 等比例縮小，保留透明 PNG |
| `cloudsail-companion.png` | `exec-82a11b0c-bd02-4733-8ebb-2aafe1987987.png` | 1230×1278／`df538c14e1faef7f694d728c7ba4999c20a5d832a3ca3e182fc1e1c82ecc6c24` | `sips -Z 700` 等比例縮小，保留透明 PNG |
| `coralflare-companion.png` | `exec-3f35311d-8df5-4a8e-a7c4-c854826034a0.png` | 1536×1024／`38a6c969b7578f5ad5360a805b696c49b197cc393c567dd5d4554d41147345ee` | `sips -Z 700` 等比例縮小，保留透明 PNG |

珊火鯨另曾產生一個背景清除候選 `exec-2ac40501-4a6f-45df-bd8d-a174be464454.png`，但發布檔沒有採用它；發布鏈仍是上表的原始 `exec-3f353…`。

## 四張插畫的精確 ImageGen 提示詞

以下文字直接取自 2026-10-24 的生成呼叫；不是事後依圖片反推。

### `hero-ocean.jpg`

```text
Use case: illustration-story
Asset type: responsive website hero background for a fourth-grade learning adventure
Primary request: create an original high-energy ocean fantasy scene for a child-friendly learning game, with a small cobalt-and-gold explorer ship sailing toward floating island ruins, a friendly luminous teal fox-dragon companion on the prow, distant training arena towers and harmless cloud-sea creatures suggesting discovery, competition, ship battles, and creature companionship without depicting combat violence
Scene/backdrop: vast turquoise ocean at sunrise, floating islands, swirling navigation trails, distant golden lighthouse; generous darker negative space on the left and central foreground for UI cards and white text
Style/medium: premium stylized 3D game key art mixed with painterly illustration, crisp silhouettes, tactile materials, sophisticated but playful, suitable for a polished web app
Composition/framing: wide 16:9 cinematic composition, key ship and companion on the right third, depth layers that can crop safely on mobile
Lighting/mood: radiant sunrise rim light, adventurous, optimistic, welcoming, no menace
Color palette: deep navy, ocean teal, electric cyan, warm amber and coral accents
Constraints: entirely original characters and world; no words, letters, numerals, logos, UI, watermark, copyrighted characters, Pokeballs, Roblox avatars, anime franchise likenesses, or recognizable game trade dress
Avoid: clutter behind the left-side text area, photoreal people, guns, violence, scary monsters, gambling or loot-box imagery
```

### `tideglow-companion.png`

```text
Use case: stylized-concept
Asset type: transparent character cutout for a child-friendly learning game website
Primary request: an entirely original friendly teal fox-dragon companion named 潮光獸, standing in a confident helpful pose, clever curious eyes, fluffy white chest, small fin-like ears, bioluminescent cyan tail tip, tiny gold compass charm, suitable as a collectible study companion
Style/medium: premium stylized 3D game character render with soft painterly finish, clean readable silhouette, appealing to a fourth-grade child without looking preschool-like
Composition/framing: full body, three-quarter view, centered with breathing room, no ground plane or cast shadow beyond a subtle contact shadow
Lighting/mood: warm optimistic rim light, energetic and trustworthy
Color palette: teal, cyan, navy, white, restrained gold accent
Constraints: genuinely transparent background; no text, letters, numerals, UI, logos, watermark, Pokeball-like objects, copyrighted character resemblance, existing franchise trade dress, weapon, or scary features
Avoid: anime franchise mimicry, baby proportions, excessive detail, aggressive teeth, clutter
```

### `cloudsail-companion.png`

```text
Use case: stylized-concept
Asset type: original game companion character for a children's learning-adventure website collection card
Primary request: Create “Cloudsail Deer”, an original calm sky-and-ocean deer companion whose role is a patient observer.
Subject: one elegant young deer-like fantasy creature, full body in a gentle three-quarter hero pose, all antlers, ears, four hooves, and tail fully visible. Pearl-white and misty blue fur with deep teal shading; translucent sea-glass antlers shaped like small wind-filled sails; soft cloud-like mane and tail; subtle cyan constellation freckles; a small restrained gold compass charm at the chest. Large intelligent friendly eyes and a quietly confident expression, suitable for a fourth-grade child without looking preschool-like.
Style/medium: premium stylized 3D game-character render with painterly finish, tactile soft fur, polished sea-glass, restrained gold trim, cinematic but welcoming; visually consistent with an original teal fox-dragon ocean companion.
Composition/framing: centered complete character, three-quarter view, generous even transparent margin of at least 10 percent on every side; readable silhouette at card size; no part touches or leaves the canvas.
Lighting/mood: cool cyan rim light with soft warm dawn-gold key light; patient, observant, magical.
Color palette: pearl white, cloud blue, turquoise, deep navy, restrained compass gold.
Constraints: genuinely transparent background; one character only; no text, logo, border, UI, pedestal, scenery, or watermark; original design only.
Avoid: recognizable Pokémon, Roblox, or existing game character trade dress; capture balls; blocky avatar proportions; baby proportions; armor; weapons; aggressive expression; extra antlers, legs, tails, or floating detached objects.
```

### `coralflare-companion.png`

```text
Use case: stylized-concept
Asset type: original game companion character for a children's learning-adventure website collection card
Primary request: Create “Coralflare Whale”, an original brave ocean-and-sky whale companion whose role is a courage booster.
Subject: one compact friendly young fantasy whale floating in a dynamic but non-aggressive three-quarter hero pose, complete body fully visible with both pectoral fins, dorsal fin, and entire split tail. Deep teal-blue body with warm coral-orange and rosy luminous accents; elegant coral-reef shaped fins and a soft translucent dorsal sail; tiny bioluminescent star speckles; a restrained gold compass charm on a simple collar. Bright kind eyes, closed friendly mouth, courageous uplifting expression.
Style/medium: premium stylized 3D game-character render with painterly finish, smooth tactile skin, translucent glowing fins, restrained gold trim, cinematic but welcoming; visually consistent with an original teal fox-dragon ocean companion.
Composition/framing: centered complete character, three-quarter view, compact diagonal silhouette that fits a landscape card, generous transparent margin of at least 10 percent on every side; no part touches or leaves the canvas.
Lighting/mood: cool cyan rim light with warm coral and dawn-gold highlights; brave, buoyant, magical, never threatening.
Color palette: deep navy, turquoise, coral orange, rosy pink, cyan bioluminescence, restrained compass gold.
Constraints: genuinely transparent background; one character only; no text, logo, border, UI, pedestal, water, bubbles, scenery, or watermark; original design only.
Avoid: recognizable Pokémon, Roblox, or existing game character trade dress; capture balls; blocky avatar proportions; weapons; armor; teeth; combat; angry eyes; baby proportions; extra fins, tails, limbs, or floating detached objects.
```

## Higgsfield 生成與後製鏈

### 生成設定

- 工具：Higgsfield Plugin。
- 模型：`seedance_2_5`。
- 模式：`omni_reference`。
- 參考媒體：當時 Railway 自託管的 `hero-ocean.jpg`（`start_image`）與 `tideglow-companion.png`（`image`）。
- 每個工作：`duration: 8`、`count: 1`、`resolution: 720p`、`bitrate_mode: high`、`generate_audio: false`。
- 桌面三段：`aspect_ratio: 16:9`；手機三段：`aspect_ratio: 9:16`。
- 三個故事：破浪啟航、夥伴領航、知識護盾。桌面與手機各有專用提示詞；手機提示詞另外要求主體避開外側 8% 裁切區，並保留安靜的文字安全區。
- 完整創意文字規格收錄於 `HIGGSFIELD_VIDEO_BRIEF.md`；上表的工作 ID 才是發布檔與實際生成工作的權威對應。

### 網頁版轉碼

每個 Higgsfield MP4 下載後，以等價於下列命令重新編碼並覆寫為發布檔：

```sh
ffmpeg -i INPUT.mp4 -c:v libx264 -preset medium -crf 22 \
  -pix_fmt yuv420p -movflags +faststart -an OUTPUT.mp4
```

這一步會改變位元流與 SHA-256，也會使成品容器只顯示 FFmpeg/Lavf 標籤；它不改變影片故事來源。

## 可驗證範圍與剩餘不確定性

- 已驗證：四個 ImageGen 原始輸出 ID、精確提示詞、原圖與發布檔雜湊、縮放／格式轉換；六個 Higgsfield 工作 ID、模型與生成設定、發布影片格式；poster 的來源時間與完整雜湊。
- Higgsfield 雲端原始 MP4 在下載後被本機轉碼檔覆寫，因此本專案沒有保留「轉碼前」的 SHA-256；工作 ID 與原始下載檔名仍保留於生成紀錄。
- MP4 本身沒有嵌入可單獨驗證的 Higgsfield creator tag；若工作紀錄遺失，只靠目前檔案 metadata 無法重建供應商來源。
- 本紀錄證明使用的工具與製作鏈，但不構成任何平台授權條款的法律意見；若要再散布或商用，仍應依當時 OpenAI 與 Higgsfield 帳戶條款確認。

## 2026-10-24 家庭整合素材

`public/garden/` 沿用使用者既有注音航海團專案的主題場景、五位動物、錄音與來源說明。本次沒有重新生成圖像或錄音。主題答案圖使用原有九宮格場景的 CSS 裁切；現有神獸以 CSS 加入陪伴動作。

來源為本機最新的 `https-doudou-puppy-garden-production-up/work/site`，對應 https://doudou-puppy-garden-production.up.railway.app/。錄音沿用該專案已有的 Higgsfield 檔案，MOE 來源說明保留於 `public/garden/credits/`。本紀錄只說明複用來源，沒有新增供應商生成工作。

## 玩家入口照片（2026-10-24）

`public/players/quintus.jpg` 與 `public/players/doudou.jpg` 來自使用者於本次對話提供並指定使用的兩張照片。依使用者說明，灰色帽 T 照片用於 Quintus，粉紅背景女孩與狗的照片用於荳荳。保留 JPEG 原始像素資料，只移除可移除的 EXIF/XMP 等描述性中繼資料；原始相簿檔案未修改。

畫面裁切、推近、漂浮及星光均由 CSS 呈現，未生成或改造臉部。入口提供暫停動態，並遵守系統減少動態設定。

## 六場景首頁影片（2026-10-24）

保留原三場景，新增星鯨巡遊、極光群島、流星許願三段 Seedance 2.5 影片。參考圖為本站既有 `hero-ocean.jpg`；未上傳玩家照片。完整提示詞、工作 ID、設定及原始影片 SHA-256 見 `outputs/hero-generation-records.json`。新增素材雜湊與大小見 `outputs/hero-asset-manifest.json`。

三段均為 8.04 秒、24 fps、H.264、yuv420p、無音軌，使用 FFmpeg libx264 medium CRF 23、faststart。桌面轉碼為 1280×720；手機從同一生成影片置中裁切 9:16，縮放為 540×960，並非另外生成的直式影片。Poster 取各版本第 2 秒 JPEG（q:v 3）。原始片段已檢查 0／2／4／6 秒畫面，網頁版以 Chromium 實際解碼播放驗證。

| 素材 | 位元組 | SHA-256 |
|---|---:|---|
| `hero-starwhale-desktop.mp4` | 935455 | `d80ef2b491bce7b1d91cfaf473665dce0fb564e891197c32442222bffb5a94bb` |
| `hero-starwhale-mobile.mp4` | 498040 | `e13e2914497b07110ed52df3482b247585748027af92a3daed0afdfa773a982b` |
| `hero-starwhale-desktop-poster.jpg` | 66080 | `1d8b5adb584f539a5c636edca2059225b810e0fefe5152b4c78245e269c81788` |
| `hero-starwhale-mobile-poster.jpg` | 33307 | `1ddd92dba72c6677d0f50a4c1980bf0e3bf33b085b6c7fee33608fd8d38a2085` |
| `hero-aurora-desktop.mp4` | 1289586 | `8aec5fc6f65ff8edc40c034bcc38d65b04890ef2b8968df166be97d6315c1070` |
| `hero-aurora-mobile.mp4` | 661838 | `0cf4cf93574a86cfadba65c99341be3d9761e15b16f88e2b2315af20804f8686` |
| `hero-aurora-desktop-poster.jpg` | 80443 | `bcfcb271eb12138b9a565b5982d09512259d7db8ad704caacfcffb5168129051` |
| `hero-aurora-mobile-poster.jpg` | 41736 | `504c93ef615978ee28ed6e26a99d6c150ce5b74bcdcbe461fdc32a96d42a515c` |
| `hero-meteor-desktop.mp4` | 1294586 | `525f809e36163364cf230c875ba13d681333d316632c5c32e2925d597b496dec` |
| `hero-meteor-mobile.mp4` | 680029 | `e76d6f976d45639c77d00e8351dc965151205b9d2e149126b8274e29e493ee00` |
| `hero-meteor-desktop-poster.jpg` | 81400 | `c422cfd6c552036f4f33f05be18a8d3c983bb4eb540df34253175478d36cddfa` |
| `hero-meteor-mobile-poster.jpg` | 44595 | `0dad3ea4bf98c8b84e2c5ebb92c4a459e4830d588d4c90faaadbe7f25ebe8a53` |
