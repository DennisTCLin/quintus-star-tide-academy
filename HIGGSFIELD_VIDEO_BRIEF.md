# 星潮學院 Higgsfield 首頁影片規格

> 文件狀態：這是創意方向與目標規格，不是成品 metadata 清單。實際發布的六段影片由 Higgsfield `seedance_2_5` 以 720p 產生後再經 FFmpeg 轉碼；桌面為 1280×720、手機為 720×1280。部分手機檔超過下列 1.3 MB 目標。工作 ID、實際尺寸、大小、後製鏈與 SHA-256 以 [ART_PROVENANCE.md](./ART_PROVENANCE.md) 為準。

用途：三段連續的首頁航線影片。Higgsfield 只用於製作；輸出後由星潮學院自行託管，不在正式網站嵌入第三方 SDK、追蹤器或播放器。

## 統一設定

- 桌面：16:9、1080p、24 fps、每段 6–8 秒、無音軌。
- 手機：9:16、1080×1920、24 fps、每段 6–8 秒、無音軌。
- 先用 720p 草稿檢查角色一致性、文字安全區與動作，再輸出定稿。
- 動作節奏：前 0.5 秒接近靜止；中段只有一個主要動作；最後 0.7 秒減速並接近靜止。
- 完全原創；不可出現 Roblox、Blox Fruits、Pokémon 或其他遊戲／動畫的角色、標誌、介面、道具輪廓或視覺識別。
- 不要文字、浮水印、武器、砲彈、爆炸、沉船、受傷、追逐、驚嚇、閃爍、鏡頭震動、快速剪接或身體變形。

## 01 破浪啟航

```text
An entirely original cobalt-blue explorer ship with restrained gold trim glides steadily from the lower-right foreground toward a distant golden lighthouse and floating academy islands. An original friendly teal fox-dragon companion with a white chest, fin-like ears, cyan luminous tail and small gold compass charm stands securely on the prow; its ears and tail fur move gently in the sea breeze. A thin cyan navigation wake draws one elegant curve across the turquoise water. Sunrise, painterly clouds, quiet cloud-whales far in the distance, tactile sailcloth and polished wood, radiant amber rim light with deep navy foreground water. Slow cinematic dolly-in with only a subtle six-degree truck to the right, stable horizon, no handheld movement. Motion begins softly, reaches a calm cruising pace, then decelerates into a nearly still composition. Keep the entire left 42 percent dark, calm, low-detail and free of characters or bright objects for readable white website text; keep the ship and companion within the right 38 percent. Premium stylized 3D game-cinematic illustration with a soft painterly finish, adventurous, intelligent and welcoming for a fourth-grade child without looking preschool-like. End with one gentle lighthouse pulse and the ship wake settling for a soft dissolve. No words, letters, numerals, logos, interface, watermark, copyrighted characters, block-style avatars, capture-ball imagery, recognizable trade dress, weapons, projectiles, collision, explosions, scary creatures, flashing lights, rapid cuts, camera shake, distorted faces, extra limbs or clutter in the text-safe area.
```

## 02 夥伴領航

```text
In the same original ocean-academy world, the same friendly teal fox-dragon companion stands on the right side of the cobalt-and-gold ship's prow and gently touches its small compass charm with one paw. The charm answers with a soft cyan glow, and five small nonverbal constellation symbols unfold above the railing like a calm navigation map: one geometric number star, one open-page wave, one speech-bubble breeze, one leaf-and-moon orbit and one island-compass outline. The symbols are abstract icons only, never text, and appear one at a time with slow breathing light. A child captain remains a small relaxed silhouette farther behind, never a facial close-up. Warm sunrise on the right, deep navy sea and soft teal mist on the left. Very slow clockwise arc of only eight to ten degrees with a shallow push-in; the companion blinks once, tilts its head slightly, then returns to a confident resting pose. Keep the left 42 percent dark, simple and free of glowing symbols for continuous headline readability. Sophisticated, curious, trustworthy and magical but calm. Finish with the five symbols gathering into one small cyan navigation star above the compass, held nearly still. No words, letters, numerals, logos, interface, watermark, franchise resemblance, anime mimicry, recognizable trade dress, capture-ball imagery, baby proportions, weapons, combat, aggressive expression, flashing, rapid particles, sudden zoom, camera shake, morphing anatomy, extra limbs or clutter behind the text.
```

## 03 知識護盾

```text
In the same original ocean-fantasy academy, the cobalt-and-gold explorer ship approaches a grand floating academy training gate on the right half of frame. A harmless rolling wave made of translucent cyan light rises ahead, and the same friendly teal fox-dragon companion calmly activates a circular knowledge shield from its gold compass charm. Five small constellation points illuminate around the shield one by one; the shield redirects the luminous wave upward into a graceful aurora arch, and the academy gate opens with a restrained warm golden beacon. This is a friendly defensive navigation challenge, never an attack. A distant unarmed training skiff gives a small respectful sail-tip acknowledgement; no one is hit, chased, frightened or defeated. Deep navy water, teal shield light, warm amber gate light, floating ruins and cloud sea. Begin at low deck height with a slow stable push toward the shield, then make a gentle crane-up and pull-back-wide during the last two seconds, revealing a safe open route and sunrise horizon that can dissolve back to the first shot. Keep the left 42 percent dark, low-detail and quiet throughout; place all shield action center-right to far right. Premium stylized 3D cinematic illustration with tactile materials and painterly edges; brave, clever and exhilarating but never frightening. No words, letters, numerals, logos, interface, watermark, recognizable franchise designs, block-style avatars, capture-ball imagery, cannons, weapons, projectiles, explosions, impact, sinking ships, fire, injury, menacing enemies, dark storm, flashing, rapid cuts, camera shake, distorted faces, extra limbs or clutter behind the text.
```

## 手機構圖附加句

三個 prompt 的構圖段落均附加：

```text
Mobile 9:16 composition: keep the main ship, companion or shield action between 52 and 84 percent of frame width; preserve a dark quiet text-safe field from 6 to 88 percent of frame width and from 14 to 61 percent of frame height; no important face, compass, shield edge or lighthouse within the outer eight percent crop zone.
```

## 網頁輸出

- H.264 MP4、faststart、24 fps、無音軌。
- 桌面每段以 2.5 MB 為上限；手機每段以 1.3 MB 為上限。
- 每段另輸出一張不含文字的 JPEG poster，150 KB 以下。
- 第一段海報可沿用 `public/assets/hero-ocean.jpg`；第二段取角色抬頭但星圖尚未全亮的影格；第三段取護盾剛形成、未到最亮峰值的影格。
