import type { MilestoneState } from './core'
import type { ElementName } from './elements'

export const RARITY_ORDER = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'] as const
export type CharacterRarity = (typeof RARITY_ORDER)[number]

export const RARITY_COUNTS: Record<CharacterRarity, number> = {
  E: 12,
  D: 10,
  C: 8,
  B: 7,
  A: 5,
  S: 4,
  SS: 3,
  SSS: 1,
}

export const RARITY_META: Record<CharacterRarity, { glyph: string; label: string; description: string }> = {
  E: { glyph: '•', label: 'E · 初探', description: '乾淨鮮明的自然材質' },
  D: { glyph: '◇', label: 'D · 潮痕', description: '雙材質與細緻潮紋' },
  C: { glyph: '△', label: 'C · 海璃', description: '海玻璃結構與中度紋理' },
  B: { glyph: '⬡', label: 'B · 流光', description: '分層材質與柔和生物光' },
  A: { glyph: '✦', label: 'A · 航圖', description: '星圖細節與精緻表面' },
  S: { glyph: '✧', label: 'S · 極光', description: '極光漸層與半透明結構' },
  SS: { glyph: '✦✦', label: 'SS · 星海', description: '虹彩海璃與精密航圖紋' },
  SSS: { glyph: '✦✦✦', label: 'SSS · 萬象', description: '海洋、雲霧與星光的唯一交織' },
}

export type Character = {
  id: string
  catalogNumber: number
  name: string
  nameEn: string
  title: string
  rarity: CharacterRarity
  unlockAt: number
  image: string
  alt: string
  element: ElementName
  personality: string
  story: string
  artBrief: string
  palette: string
  series?: string
  supportType?: "focus" | "shield" | "spark"
  signatureMove?: string
  role?: string
  motion?: "hop" | "stride" | "crawl" | "flutter" | "swim" | "float"
  encouragement?: string
  thumbnail?: string
  tags: readonly string[]
}

type CharacterSeed = Omit<Character, 'catalogNumber' | 'alt' | 'tags'> & { tags?: readonly string[] }

const seed = (character: CharacterSeed, index: number): Character => ({
  ...character,
  catalogNumber: index + 1,
  alt: `${character.name}，${character.artBrief}，原創星潮學習夥伴。`,
  tags: character.tags ?? [character.element, character.personality, character.title],
})

// These short hashes are taken from the published 640 px files. They make the
// server's one-year immutable cache safe while keeping the registry readable.
const ARTWORK_VERSIONS: Readonly<Record<string, string>> = {
  aetherdragon: '8cadc29b55ca',
  astraltide: '244a12fc5c0c',
  atlaswhale: 'e03f80b1e46f',
  aurorakirin: '90da3669b0ca',
  aurorawolf: '27865020c654',
  bubbleyak: '5495ba09eebf',
  cloudfinch: 'be7398dfa52b',
  cometcrane: '61f1a89a93e0',
  compasscrab: '269f8bb5901b',
  coralhare: '65b83bb3ca4d',
  cosmicnautilus: '5c28f1176440',
  covegecko: 'b52128055265',
  crystalboar: '9c5d3dee231b',
  currentowl: '0f20f35289cf',
  cyclonedolphin: 'a4241d56490a',
  driftturtle: '98e4e5e14bc5',
  echojelly: '0ffc6da616c8',
  eclipseowl: '53b47d86dfed',
  foamferret: '8e2d243b87a9',
  gullwolf: '79fb12789b9c',
  infinitywhale: '85984a21a991',
  kelpcub: '5f93afc1db4b',
  lanternlynx: 'be109dd0b836',
  mapleopard: '51bc330fe1a3',
  meridiantiger: '287f042ac91a',
  mistotter: 'ea88d22de642',
  moonmanta: '0112f729be85',
  nebulafox: '9ec0aa203761',
  opalgriffin: 'e6a73f3098ec',
  pearlbadger: '58ee090ab847',
  pebblefin: 'c2ae6c567473',
  prismorca: '0d91b7e29c34',
  rainseal: '5ba4f8e78c99',
  reefgryphon: '796e9d648eb0',
  reefrabbit: 'c86e3cab14dd',
  sailskipper: 'e048dc5c7495',
  seaglasspanda: '5c977bfa9764',
  seasprout: 'f945f15dfa63',
  shellmole: '10cc2f14312d',
  solaraxolotl: '62ae8c117ccd',
  starheron: '32aba9dc1752',
  stellarmanta: '76ed42f3e3d1',
  stormibis: '96c060901327',
  sunkenram: '4063785b733d',
  tidellama: '04f42ea3e618',
  tidephoenix: '442b8832093e',
  tideserpent: '77d47f5a6dc8',
}

const artwork = (id: string) => `/assets/companions/${id}.webp?v=${ARTWORK_VERSIONS[id]}`

const CHARACTER_SEEDS: CharacterSeed[] = [
  { id: 'tideglow', name: '潮光獸', nameEn: 'Tideglow', title: '線索領航員', rarity: 'E', unlockAt: 0, image: '/assets/tideglow-companion.png?v=ba59a555c79c', element: '水', personality: '好奇機靈', story: '會把零散線索排成一條可以出發的航線。', artBrief: '青綠色狐龍，雪白胸毛、鰭狀耳與發光蒼藍尾巴', palette: '青綠、晶藍、深藍、白、少量金' },
  { id: 'pebblefin', name: '石礁鰭', nameEn: 'Pebblefin', title: '穩步偵察員', rarity: 'E', unlockAt: 40, image: artwork('pebblefin'), element: '土', personality: '實在專注', story: '總能在微小差異裡找到正確的下一步。', artBrief: '圓潤的水獺與魚鰭混合生物，石灰短毛、翠綠鰭邊與寬扁尾', palette: '石灰、海松綠、靛藍、少量金' },
  { id: 'foamferret', name: '泡沫貂', nameEn: 'Foamferret', title: '快捷記號員', rarity: 'E', unlockAt: 80, image: artwork('foamferret'), element: '水', personality: '活潑細心', story: '用尾巴畫出短短記號，提醒大家別遺漏條件。', artBrief: '修長海貂，奶油白毛、泡沫狀淡青尾巴與小型潮紋', palette: '奶油白、淡青、海藍、少量金' },
  { id: 'seasprout', name: '海芽龜', nameEn: 'Seasprout', title: '慢速思考員', rarity: 'E', unlockAt: 120, image: artwork('seasprout'), element: '木', personality: '沉穩溫和', story: '不拚最快，只把每一步理由想清楚。', artBrief: '小型海龜，海草綠背甲、葉芽狀邊緣與淺青鰭足', palette: '海草綠、淡青、沙金、深藍' },
  { id: 'mistotter', name: '霧潮獺', nameEn: 'Mistotter', title: '重讀導航員', rarity: 'E', unlockAt: 160, image: artwork('mistotter'), element: '水', personality: '耐心親切', story: '會陪你把題目重讀一次，直到關鍵字浮出來。', artBrief: '溫柔海獺，霧藍短毛、乳白肚皮與水滴狀耳鰭', palette: '霧藍、乳白、青灰、少量金' },
  { id: 'sailskipper', name: '帆翼蛙', nameEn: 'Sailskipper', title: '跳步測試員', rarity: 'E', unlockAt: 200, image: artwork('sailskipper'), element: '木', personality: '勇於試驗', story: '喜歡先試一小步，再根據結果修正方向。', artBrief: '小型樹蛙，青瓷皮膚、帆形背鰭與深藍腳掌', palette: '青瓷、海藍、黃綠、少量金' },
  { id: 'kelpcub', name: '藻潮熊', nameEn: 'Kelpcub', title: '重點整理員', rarity: 'E', unlockAt: 260, image: artwork('kelpcub'), element: '木', personality: '厚實有條理', story: '把大題拆成幾個小藻結，一個一個解開。', artBrief: '矮壯小熊，深綠毛、海藻狀圍頸與寬大腳掌', palette: '深綠、青藍、沙褐、少量金' },
  { id: 'shellmole', name: '貝甲鼴', nameEn: 'Shellmole', title: '根據探勘員', rarity: 'E', unlockAt: 320, image: artwork('shellmole'), element: '金', personality: '安靜堅持', story: '會往下挖到「為什麼」，不只記住表面答案。', artBrief: '圓鼻鼴混合貝類，深灰絨毛、珍珠貝背甲與寬爪', palette: '深灰、珍珠白、海綠、少量金' },
  { id: 'starheron', name: '星汐鷺', nameEn: 'Starheron', title: '距離觀測員', rarity: 'E', unlockAt: 380, image: artwork('starheron'), element: '金', personality: '清醒敏銳', story: '退後一步看全貌，常找到原本看不見的關係。', artBrief: '修長幼鷺，淡藍羽毛、星點翼尖與細長深青腿', palette: '淡藍、銀白、深青、少量金' },
  { id: 'reefrabbit', name: '礁月兔', nameEn: 'Reefrabbit', title: '類比找路員', rarity: 'E', unlockAt: 440, image: artwork('reefrabbit'), element: '土', personality: '靈巧溫暖', story: '喜歡找「像什麼」，用熟悉的事幫新知識帶路。', artBrief: '珊瑚礁兔，沙白毛、珊瑚粉長耳內緣與月灣尾', palette: '沙白、珊瑚粉、海藍、少量金' },
  { id: 'bubbleyak', name: '泡泡犛', nameEn: 'Bubbleyak', title: '呼吸節奏員', rarity: 'E', unlockAt: 500, image: artwork('bubbleyak'), element: '土', personality: '穩定樂觀', story: '當題目太擠時，它會帶大家慢慢呼吸再出發。', artBrief: '蓬鬆小犛，灰藍長毛、圓泡狀短角與寬扁鰭耳', palette: '灰藍、水晶青、乳白、少量金' },
  { id: 'covegecko', name: '灣光守宮', nameEn: 'Covegecko', title: '位置記憶員', rarity: 'E', unlockAt: 560, image: artwork('covegecko'), element: '土', personality: '機警靈活', story: '會把重點放到不同位置，幫記憶建立地圖。', artBrief: '寬趾守宮，深青皮膚、湖綠光點與尾端小灣紋', palette: '深青、湖綠、青藍、少量金' },

  { id: 'cloudsail', name: '雲帆鹿', nameEn: 'Cloudsail Deer', title: '耐心觀察員', rarity: 'D', unlockAt: 100, image: '/assets/cloudsail-companion.png?v=e467c7f472c3', element: '木', personality: '沉著寧靜', story: '在需要慢慢看的時候，它會讓時間變得寬鬆。', artBrief: '珍珠白幼鹿，雲霧藍毛、海璃帆形角與雲狀鬃毛', palette: '珍珠白、雲藍、綠松石、深藍、少量金' },
  { id: 'moonmanta', name: '月帆魟', nameEn: 'Moonmanta', title: '大圖定位員', rarity: 'D', unlockAt: 620, image: artwork('moonmanta'), element: '水', personality: '從容開闊', story: '飛高一點看整體，再選一個區塊慢慢理解。', artBrief: '漂浮魟魚，月白腹面、深藍翼面與半透明帆狀翼緣', palette: '月白、深藍、藍紫、少量金' },
  { id: 'driftturtle', name: '漂航龜', nameEn: 'Driftturtle', title: '步驟守門員', rarity: 'D', unlockAt: 680, image: artwork('driftturtle'), element: '土', personality: '穩健可靠', story: '每完成一步就檢查一次，讓錯誤不會跟到後面。', artBrief: '航海龜，青灰甲片、淡綠潮紋與帆布質感前鰭', palette: '青灰、淡綠、帆布米、少量金' },
  { id: 'coralhare', name: '珊枝兔', nameEn: 'Coralhare', title: '聚類整理員', rarity: 'D', unlockAt: 740, image: artwork('coralhare'), element: '木', personality: '敏捷有秩序', story: '把同一類的線索放在一起，讓規律自己現身。', artBrief: '細長兔，暈粉短毛、小珊瑚狀耳緣與貝光尾', palette: '暈粉、珊瑚橘、貝白、海藍' },
  { id: 'gullwolf', name: '海風狼', nameEn: 'Gullwolf', title: '語感傾聽員', rarity: 'D', unlockAt: 800, image: artwork('gullwolf'), element: '木', personality: '警覺友善', story: '會聽句子的節奏，找到哪一處聽起來不夠順。', artBrief: '苗條幼狼，銀灰毛、海鷗翼狀耳簇與潮紋腳部', palette: '銀灰、海藍、白、少量金' },
  { id: 'pearlbadger', name: '珠礁獾', nameEn: 'Pearlbadger', title: '證據收藏員', rarity: 'D', unlockAt: 860, image: artwork('pearlbadger'), element: '金', personality: '認真篤定', story: '每一個答案都要收進一顆「因為」才肯放行。', artBrief: '寬肩小獾，深藍白條紋毛、珍珠點背脊與貝光爪', palette: '深藍、貝白、珍珠青、少量金' },
  { id: 'rainseal', name: '雨紋海豹', nameEn: 'Rainseal', title: '波形朗讀員', rarity: 'D', unlockAt: 920, image: artwork('rainseal'), element: '水', personality: '柔和愛表達', story: '把文字念成高低波形，幫意思變得更清楚。', artBrief: '流線海豹，藍灰皮毛、雨滴狀斑點與珍珠翼鰭', palette: '藍灰、水青、珍珠白、少量金' },
  { id: 'compasscrab', name: '羅盤蟹', nameEn: 'Compasscrab', title: '方向校準員', rarity: 'D', unlockAt: 980, image: artwork('compasscrab'), element: '金', personality: '直率準確', story: '不會催你，只會確認「現在要找的是什麼」。', artBrief: '圓甲蟹，靛藍甲殼、青金羅盤紋與小帆狀側鰭', palette: '靛藍、青金、銅橘、貝白' },
  { id: 'cloudfinch', name: '雲鰭雀', nameEn: 'Cloudfinch', title: '快速回想員', rarity: 'D', unlockAt: 1040, image: artwork('cloudfinch'), element: '火', personality: '輕快樂觀', story: '用一個小圖像把剛學的規則帶回腦海。', artBrief: '圓翼雀鳥，雲白羽毛、半透明青藍翼緣與短金喙', palette: '雲白、青藍、天空藍、少量金' },
  { id: 'tidellama', name: '潮角駝', nameEn: 'Tidellama', title: '比較測量員', rarity: 'D', unlockAt: 1100, image: artwork('tidellama'), element: '土', personality: '平和仔細', story: '會把兩個選項並排，找出真正不同的地方。', artBrief: '蓬鬆幼駝，米白捲毛、海藍波紋長頸與海璃小角', palette: '米白、海藍、青綠、少量金' },

  { id: 'coralflare', name: '珊火鯨', nameEn: 'Coralflare Whale', title: '勇氣補給員', rarity: 'C', unlockAt: 220, image: '/assets/coralflare-companion.png?v=569ac509d10f', element: '火', personality: '勇敢鼓舞', story: '會在答錯後點亮一道暖光，說明再試一次很正常。', artBrief: '深青幼鯨，珊瑚橘發光翼鰭、半透明背帆與星點', palette: '深青、珊瑚橘、玫粉、晶藍、少量金' },
  { id: 'lanternlynx', name: '燈潮猁', nameEn: 'Lanternlynx', title: '黑暗探題員', rarity: 'C', unlockAt: 1160, image: artwork('lanternlynx'), element: '火', personality: '獨立沉著', story: '題目再陌生，也會先點亮已知條件再繼續。', artBrief: '短尾猁，深紫藍毛、燈籠狀耳簇與海璃前腿紋', palette: '深紫藍、發光青、貝白、少量金' },
  { id: 'currentowl', name: '流向鴞', nameEn: 'Currentowl', title: '邏輯巡航員', rarity: 'C', unlockAt: 1220, image: artwork('currentowl'), element: '水', personality: '冷靜審慎', story: '跟著「因為→所以」的流向飛，不被多餘線索吹走。', artBrief: '寬翼鴞，墨藍羽毛、洋流螺旋紋胸羽與海璃眼圈', palette: '墨藍、湖青、銀白、少量金' },
  { id: 'seaglasspanda', name: '海璃貓熊', nameEn: 'Seaglass Panda', title: '分類清單員', rarity: 'C', unlockAt: 1280, image: artwork('seaglasspanda'), element: '金', personality: '友善有系統', story: '把復雜資訊收進清楚的分類盒，不再一團亂。', artBrief: '圓潤貓熊，白青雙色毛、海璃耳緣與幾何潮紋四肢', palette: '貝白、深青、海璃綠、少量金' },
  { id: 'cyclonedolphin', name: '旋潮豚', nameEn: 'Cyclonedolphin', title: '方法轉換員', rarity: 'C', unlockAt: 1340, image: artwork('cyclonedolphin'), element: '水', personality: '機敏愛嘗試', story: '這條路不通就轉一圈，帶回另一種解法。', artBrief: '幼海豚，亮青灰皮膚、旋渦背鰭與海璃彎月尾', palette: '亮青、銀灰、深藍、少量金' },
  { id: 'sunkenram', name: '沉星盤羊', nameEn: 'Sunkenram', title: '規則累積員', rarity: 'C', unlockAt: 1400, image: artwork('sunkenram'), element: '土', personality: '踏實耐性', story: '把一條條規則盤進角裡，需要時就依序取出。', artBrief: '厚毛盤羊，深海藍羊毛、星點螺旋角與淡珊瑚蹄', palette: '深海藍、銀白、淡珊瑚、少量金' },
  { id: 'reefgryphon', name: '礁翼獅鷲', nameEn: 'Reefgryphon', title: '雙角轉換員', rarity: 'C', unlockAt: 1460, image: artwork('reefgryphon'), element: '土', personality: '自信公平', story: '能同時保留兩種看法，直到證據讓方向變清楚。', artBrief: '小型獅鷲，沙金前肢、青藍礁鱗後身與半透明翼鰭', palette: '沙金、青藍、礁綠、貝白' },
  { id: 'echojelly', name: '回音水母', nameEn: 'Echojelly', title: '句型回響員', rarity: 'C', unlockAt: 1520, image: artwork('echojelly'), element: '水', personality: '安靜善聽', story: '它會讓好句子的節奏輕輕回響，幫你記住用法。', artBrief: '飄浮水母，透明藍紫傘蓋、貝光邊緣與柔軟短觸手', palette: '透明藍、薰衣紫、貝白、少量金' },

  { id: 'aurorawolf', name: '極潮狼', nameEn: 'Aurorawolf', title: '專注破浪員', rarity: 'B', unlockAt: 1580, image: artwork('aurorawolf'), element: '火', personality: '堅定沉著', story: '面對難題時維持一條穩定光帶，不被干擾拉走。', artBrief: '流線幼狼，深藍分層毛、青綠極光背線與海璃爪', palette: '深藍、極光綠、青紫、少量金' },
  { id: 'stormibis', name: '霧電朱鷺', nameEn: 'Stormibis', title: '條件掃描員', rarity: 'B', unlockAt: 1640, image: artwork('stormibis'), element: '火', personality: '迅速精準', story: '從題頭掃到題尾，把每個限制條件一一點亮。', artBrief: '高挑朱鷺，霧灰層疊羽、電青翼緣與珍珠長喙', palette: '霧灰、電青、深紫、珍珠白' },
  { id: 'mapleopard', name: '航圖豹', nameEn: 'Mapleopard', title: '關係標記員', rarity: 'B', unlockAt: 1700, image: artwork('mapleopard'), element: '木', personality: '靈敏有策略', story: '把人物、時間與事件連成一張可以追蹤的圖。', artBrief: '輕盈幼豹，深青層毛、金青航圖斑點與海璃尾環', palette: '深青、湖綠、淡金、貝白' },
  { id: 'tideserpent', name: '潮環龍', nameEn: 'Tideserpent', title: '循環推理員', rarity: 'B', unlockAt: 1760, image: artwork('tideserpent'), element: '水', personality: '寧靜靈活', story: '沿著推理環一節一節前進，會主動回頭檢查。', artBrief: '友善短身水龍，青藍分層鱗、海璃鰭鬃與柔光環紋', palette: '青藍、翠綠、深靛、少量金' },
  { id: 'prismorca', name: '稜潮虎鯨', nameEn: 'Prismorca', title: '資訊折光員', rarity: 'B', unlockAt: 1820, image: artwork('prismorca'), element: '金', personality: '開朗聰慧', story: '同一條資訊通過不同角度，會折出更好懂的顏色。', artBrief: '緊湊幼虎鯨，深藍光滑皮膚、稜彩翼鰭邊與珍珠腹線', palette: '深藍、稜彩青紫、珍珠白、少量金' },
  { id: 'cometcrane', name: '彗帆鶴', nameEn: 'Cometcrane', title: '結論降落員', rarity: 'B', unlockAt: 1880, image: artwork('cometcrane'), element: '火', personality: '優雅果斷', story: '先在空中繞一圈收集證據，再穩穩降落到結論。', artBrief: '細長鶴鳥，星白分層羽、彗青尾羽與半透明帆翼緣', palette: '星白、彗青、夜藍、少量金' },
  { id: 'crystalboar', name: '璃甲野豬', nameEn: 'Crystalboar', title: '原理衝浪員', rarity: 'B', unlockAt: 1940, image: artwork('crystalboar'), element: '金', personality: '豪爽堅定', story: '不靠猜測，用一個紮實原理衝開複雜表面。', artBrief: '結實幼野豬，深綠層毛、海璃肩甲與珍珠短獠牙', palette: '深綠、海璃青、珍珠白、少量金' },

  { id: 'nebulafox', name: '星霧狐', nameEn: 'Nebulafox', title: '假設航路員', rarity: 'A', unlockAt: 2020, image: artwork('nebulafox'), element: '水', personality: '想像縝密', story: '會先提出一個可驗證的猜想，再逐步用證據校準。', artBrief: '修長星狐，夜藍多層毛、星座雀斑與蛋白石尾尖', palette: '夜藍、星紫、蛋白青、拉絲淡金' },
  { id: 'atlaswhale', name: '天圖鯨', nameEn: 'Atlaswhale', title: '系統建圖員', rarity: 'A', unlockAt: 2100, image: artwork('atlaswhale'), element: '土', personality: '寬厚博學', story: '背上的細線會把多個知識點連成一張系統圖。', artBrief: '寬翼天空鯨，深青多層皮膚、銀青天圖細線與蛋白石背帆', palette: '深青、銀青、蛋白白、少量淡金' },
  { id: 'opalgriffin', name: '歐泊獅鷲', nameEn: 'Opalgriffin', title: '多角校對員', rarity: 'A', unlockAt: 2180, image: artwork('opalgriffin'), element: '金', personality: '自律公正', story: '每得到一個答案，都會換一個角度再檢查一次。', artBrief: '優雅幼獅鷲，珍珠毛羽、歐泊翼鰭與星圖雀斑前肢', palette: '珍珠白、歐泊青粉、深藍、淡金' },
  { id: 'solaraxolotl', name: '曙光六角龍', nameEn: 'Solar Axolotl', title: '重試再生員', rarity: 'A', unlockAt: 2260, image: artwork('solaraxolotl'), element: '火', personality: '樂觀有韌性', story: '每次重試都長出一個新方法，不把錯誤當成失敗。', artBrief: '六角龍狀水生夥伴，曙光桃色皮膚、蛋白石外鰓與星圖淡斑', palette: '曙光桃、蛋白白、青藍、拉絲淡金' },
  { id: 'meridiantiger', name: '經緯潮虎', nameEn: 'Meridiantiger', title: '路徑比對員', rarity: 'A', unlockAt: 2340, image: artwork('meridiantiger'), element: '金', personality: '強健理性', story: '會比較兩條解題路徑，選出最清楚又能說明的那條。', artBrief: '青藍幼虎，分層短毛、經緯航圖條紋與蛋白石眼紋', palette: '青藍、夜藍、蛋白白、拉絲淡金' },

  { id: 'aurorakirin', name: '極航麟', nameEn: 'Aurorakirin', title: '整合領航員', rarity: 'S', unlockAt: 2440, image: artwork('aurorakirin'), element: '木', personality: '沉靜遠見', story: '把散落方法整合成一條柔和極光，照向可行的結論。', artBrief: '原創麟鹿混合夥伴，半透明青紫鬃毛、極光漸層鱗與雕刻潮紋角', palette: '極光青紫、深藍、貝白、少量金' },
  { id: 'eclipseowl', name: '蝕光夜鴞', nameEn: 'Eclipseowl', title: '反例審查員', rarity: 'S', unlockAt: 2540, image: artwork('eclipseowl'), element: '火', personality: '深思不急', story: '主動飛進陰影找反例，讓可信的答案更紮實。', artBrief: '大翼夜鴞，夜藍羽毛、蝕光金青翼環與半透明雕刻尾羽', palette: '夜藍、晶青、暖金、極光紫' },
  { id: 'stellarmanta', name: '星界帆魟', nameEn: 'Stellarmanta', title: '跨域連結員', rarity: 'S', unlockAt: 2640, image: artwork('stellarmanta'), element: '水', personality: '自由聯想', story: '從數學飛到科學，再飛回語文，找出知識的共通骨架。', artBrief: '廣翼星魟，半透明深青翼面、極光邊緣與精細星潮蝕刻', palette: '星界藍、極光綠紫、銀白、少量金' },
  { id: 'tidephoenix', name: '潮汐鳳鳥', nameEn: 'Tidephoenix', title: '反思煥新員', rarity: 'S', unlockAt: 2740, image: artwork('tidephoenix'), element: '火', personality: '溫暖堅韌', story: '每次航程結束都會收起一根新羽，記住這次學會的方法。', artBrief: '非火焰的海洋鳳鳥，青藍半透明羽、珊瑚暖光翼根與潮紋蝕刻尾', palette: '青藍、極光綠、珊瑚暖橘、少量金' },

  { id: 'aetherdragon', name: '蒼穹璃龍', nameEn: 'Aetherdragon', title: '知識架構員', rarity: 'SS', unlockAt: 2860, image: artwork('aetherdragon'), element: '金', personality: '聯想縝密', story: '用晶體航圖架起多層結構，讓複雜知識仍能清楚穿行。', artBrief: '溫和四足璃龍，虹彩海璃鱗、精密航圖翼膜與柔和次表面光', palette: '蒼藍、虹彩海璃、星白、精細淡金' },
  { id: 'cosmicnautilus', name: '宙海鸚鵡螺', nameEn: 'Cosmic Nautilus', title: '時序追蹤員', rarity: 'SS', unlockAt: 2980, image: artwork('cosmicnautilus'), element: '水', personality: '寧靜精確', story: '沿著螺旋記錄事件先後，看清變化究竟從哪裡開始。', artBrief: '漂浮鸚鵡螺，虹彩晶體螺殼、精密時序航圖紋與短柔觸手', palette: '宇宙藍紫、虹彩晶體、湖青、少量金' },
  { id: 'infinitywhale', name: '無垠星鯨', nameEn: 'Infinitywhale', title: '長程回顧員', rarity: 'SS', unlockAt: 3100, image: artwork('infinitywhale'), element: '水', personality: '沉穩寬廣', story: '會把很長的學習路縮成一條柔亮星軌，讓成長變得看得見。', artBrief: '流線大小適中星鯨，虹彩深海皮膚、晶體翼鰭與多層柔光星軌紋', palette: '深海藍、星紫、湖青、晶白、少量金' },

  { id: 'astraltide', name: '星潮萬象獸', nameEn: 'Astraltide', title: '萬象合航員', rarity: 'SSS', unlockAt: 3240, image: artwork('astraltide'), element: '土', personality: '寧靜包容', story: '不是最強的夥伴，而是把海洋、雲霧與星光三種視角放在一起的合航者。', artBrief: '原創鯨、狐與鳥的優雅混合生物，海洋到雲霧再到星光的連續材質轉換、複雜但清楚的萬象紋', palette: '深海藍、雲白、星紫、極光青、極少量金' },
]

export const CHARACTERS: readonly Character[] = CHARACTER_SEEDS.map(seed)
export const DEFAULT_CHARACTER_ID = 'tideglow'
export const EQUIPPED_CHARACTER_KEY = 'star-tide-academy.equipped-character.v1'

const characterMap = new Map(CHARACTERS.map((character) => [character.id, character]))

export function isCharacterId(value: unknown): value is string {
  return typeof value === 'string' && characterMap.has(value)
}

export function getCharacter(id: string): Character | undefined {
  return characterMap.get(id)
}

export function isCharacterUnlocked(character: Character, progress: Pick<MilestoneState, 'masteryPoints'>): boolean {
  return progress.masteryPoints >= character.unlockAt
}

export function getUnlockLabel(character: Character, points: number): string {
  if (points >= character.unlockAt) return '已解鎖'
  const remaining = character.unlockAt - points
  return `再完成 ${Math.ceil(remaining / 20)} 題新挑戰（${remaining} 精熟點）`
}

export type CharacterStatusFilter = 'all' | 'unlocked' | 'locked'
export type CharacterSort = 'catalog' | 'rarity' | 'name'

export function filterAndSortCharacters(
  characters: readonly Character[],
  options: {
    query?: string
    rarity?: CharacterRarity | 'all'
    status?: CharacterStatusFilter
    sort?: CharacterSort
    points: number
  },
): Character[] {
  const query = options.query?.trim().toLocaleLowerCase('zh-Hant') ?? ''
  const rarity = options.rarity ?? 'all'
  const status = options.status ?? 'all'
  const result = characters.filter((character) => {
    if (rarity !== 'all' && character.rarity !== rarity) return false
    const unlocked = options.points >= character.unlockAt
    if (status === 'unlocked' && !unlocked) return false
    if (status === 'locked' && unlocked) return false
    if (!query) return true
    return [character.name, character.nameEn, character.title, character.element, character.personality, ...character.tags]
      .some((value) => value.toLocaleLowerCase('zh-Hant').includes(query))
  })
  const sort = options.sort ?? 'catalog'
  return result.sort((left, right) => {
    if (sort === 'name') return left.name.localeCompare(right.name, 'zh-Hant')
    if (sort === 'rarity') {
      const tierDifference = RARITY_ORDER.indexOf(right.rarity) - RARITY_ORDER.indexOf(left.rarity)
      if (tierDifference) return tierDifference
    }
    return left.catalogNumber - right.catalogNumber
  })
}

export function readEquippedCharacter(raw: string | null): string {
  return isCharacterId(raw) ? raw : DEFAULT_CHARACTER_ID
}

