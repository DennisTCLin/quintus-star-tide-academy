import { RELEASED_WAVE4_MONSTERS } from "./monster-wave4";
import { chooseRarity, ENCOUNTER_WEIGHTS } from "./rarity-odds";
import type { Character, CharacterRarity } from "./characters";
import { ELEMENTS, type ElementName } from "./elements";

export const MONSTER_FAMILIES = [
  { id: "cloud", name: "雲獸", icon: "☁️", habitat: "漂浮雲海", phase: "雲霧漸漸散開了" },
  { id: "crab", name: "巨蟹", icon: "🦀", habitat: "星潮海岸", phase: "巨蟹收起了大鉗" },
  { id: "golem", name: "晶像", icon: "💎", habitat: "星晶遺跡", phase: "晶石護甲逐漸暗下來了" },
  { id: "moth", name: "燈蛾", icon: "🦋", habitat: "星燈花谷", phase: "燈翼輕輕收攏了" },
  { id: "newt", name: "靈螈", icon: "🦎", habitat: "月泉濕地", phase: "靈螈放鬆了尾巴" },
  { id: "pangolin", name: "鱗獸", icon: "🛡️", habitat: "古鱗山道", phase: "鱗甲慢慢放鬆了" },
  { id: "sprite", name: "菇靈", icon: "🍄", habitat: "星傘密林", phase: "菇靈收起了護傘" },
  { id: "drake", name: "海龍", icon: "🐉", habitat: "迴潮龍灣", phase: "海龍停下了盤旋" },
  {id:"titan",name:"星械",icon:"⚙️",habitat:"星鑄要塞",phase:"機械核心漸漸平穩了"},
  {id:"groveboss",name:"古森巨獸",icon:"🌳",habitat:"巨木禁林",phase:"巨獸收攏了枝甲"},
  {id:"abyssboss",name:"深海巨獸",icon:"🌊",habitat:"冰淵海溝",phase:"深海巨獸放鬆了護甲"},
] as const;
export const MONSTER_FORMS = [
  { id: "scout", name: "初階", levels: "練習提升 0–3 級", minLevel: 1, maxLevel: 4 },
  { id: "warden", name: "高階守衛", levels: "練習提升 4 級起", minLevel: 5, maxLevel: 1000 },
] as const;
export type MonsterForm = (typeof MONSTER_FORMS)[number]["id"];
export type Monster = {
  id: string; number: number; family: number; form: MonsterForm; name: string;
  rarity: CharacterRarity; element: ElementName; image: string; thumbnail?: string; feature: string; move: string;
};
const affinities = ["metal", "wood", "water", "fire", "earth"] as const;
export const MONSTER_ART_VERSION = "82e19a5a7587";
// Stable IDs refer to the art, never to the current display order. Legacy numeric
// encounters remain in companion-growth.ts and are not remapped on load.
const entries = [
  ["金羽雲靈", "銀白羽毛藏著金色羽刃，振翅時像小小的流星。", "金羽旋風"],
  ["青枝雲鹿", "雲朵鬃毛裡開著小花，樹枝般的鹿角能帶來新芽。", "青枝飛葉"],
  ["碧波雲鰭", "半透明的雙鰭像海浪，長尾巴會留下亮亮的水紋。", "碧波迴旋"],
  ["焰尾雲狐", "耳尖和捲尾燃著暖暖火光，跑起來會灑出火星。", "焰尾突進"],
  ["砂角雲羊", "砂岩彎角十分堅固，身旁的小石頭會跟著牠轉。", "砂石護環"],
  ["金翼天隼", "金屬巨翼劃過雲層，是守望高空的威風獵手。", "金翼破雲"],
  ["蒼木雲龍", "枝角與葉翼連成一片森林，飛過之處綠意甦醒。", "蒼木龍捲"],
  ["滄海雲鯨", "捲起巨浪般的雲身，深藍雙鰭能引導整片水流。", "滄海奔流"],
  ["赤焰天凰", "火紅雙翼照亮夜空，金色尾羽像一條流動星河。", "天凰火羽"],
  ["磐角雲王", "厚實岩甲包住肩膀，巨角下盤旋著一圈砂雲。", "磐岩風暴"],
  ["銀甲齒輪蟹", "圓殼像一面金屬盾，大鉗與齒輪一起閃閃發亮。", "銀鉗夾擊"],
  ["苔枝寄居蟹", "把小樹和蘑菇種在殼上，鉗子像彎彎的樹根。", "苔枝纏繞"],
  ["泡珠潮蟹", "透明貝殼藏著珍珠，揮鉗時會冒出一串水泡。", "泡珠衝浪"],
  ["熔殼火蟹", "火山般的背殼冒著熱氣，大鉗映出橘紅光芒。", "熔鉗火花"],
  ["砂丘岩蟹", "岩殼有一層層砂紋，鏟形大鉗擅長推開沙丘。", "砂丘推進"],
  ["金城堡壘蟹", "背著金色尖塔城堡，巨大的金屬鉗像兩面城門。", "金城重鉗"],
  ["古樹森王蟹", "背上的古樹長成綠色傘蓋，粗壯樹根化成蟹鉗。", "森王根陣"],
  ["深藍珊瑚王", "藍色珊瑚像海底宮殿，雙鉗捲起彎月般的浪花。", "深海月潮"],
  ["黑曜熔岩蟹", "黑曜石巨殼包住熔岩，裂縫透出明亮的火光。", "熔岩爆浪"],
  ["峽谷巨岩蟹", "背甲像一整座峽谷，琥珀石柱隨腳步微微震動。", "峽谷震鉗"],
  ["金晶幼像", "鑽石般的胸口閃著白光，金色肩晶像小小護盾。", "金晶衝拳"],
  ["藤玉幼像", "綠藤把玉石連在一起，頭頂葉片隨心情晃動。", "藤玉伸展"],
  ["水晶幼像", "透亮身體像流動的水，胸前藍色寶珠輕輕旋轉。", "水晶泡擊"],
  ["赤晶幼像", "紅晶石與黑岩相連，額頭火苗在出招時變亮。", "赤晶火拳"],
  ["琥珀幼像", "圓圓的岩石手腳很穩，肩上晶洞裝滿金色光點。", "琥珀踏步"],
  ["白金晶皇", "巨型金晶排成王冠，白金重甲守護著鑽石核心。", "白金星斬"],
  ["古森玉巨像", "樹冠般的晶角高高展開，藤臂守護古老森林。", "古森巨掌"],
  ["冰瀑晶巨像", "冰藍披甲像凝結的瀑布，巨拳帶著晶亮水紋。", "冰瀑重擊"],
  ["熔冠赤巨像", "熔岩王冠燃起赤光，黑色重甲護住炙熱核心。", "熔冠烈拳"],
  ["山嶽琥珀王", "肩背長出山峰與琥珀石柱，每一步都穩如大山。", "山嶽震掌"],
  ["銀鈴月蛾", "銀色月牙翅與鈴形觸角，振翅時灑出細碎星光。", "月翼銀鈴"],
  ["蘭葉燈蛾", "花瓣與綠葉交疊成翅，枝形觸角尋找花香。", "蘭葉輕舞"],
  ["水珠月蛾", "透明水滴翅包著珍珠光，尾部像一滴月光。", "月珠水幕"],
  ["暖燈火蛾", "小燈籠般的腹部亮著暖火，翅尖帶著火苗。", "暖燈火舞"],
  ["晶角琥蛾", "圓翅刻著岩石紋路，琥珀觸角閃閃發亮。", "琥光護翼"],
  ["銀輪蛾皇", "齒輪光環襯著刻紋巨翼，銀刃沿著翅緣展開。", "銀輪星刃"],
  ["古蕨蛾后", "巨大的蕨葉翅圍著花枝王冠，守望整座花谷。", "古蕨花陣"],
  ["瀑翼潮后", "水晶雙翼垂下細小瀑布，珍珠王冠映著月色。", "月潮瀑翼"],
  ["曜日燈凰", "火焰巨翼圍繞明亮燈心，振翅像日光升起。", "曜日燈焰"],
  ["岩冠晶蛾", "層層晶洞巨翼托著岩冠，沉穩守護星燈花谷。", "岩冠晶幕"],
  ["銀鰓靈螈", "小劍般的銀色外鰓立在臉旁，短腿踏出輕快步伐。", "銀鰓閃擊"],
  ["蕨尾靈螈", "葉片外鰓隨風擺動，細枝尾巴長著嫩芽。", "蕨尾新芽"],
  ["泡珠靈螈", "珍珠外鰓與透亮尾鰭，游過時留下一串泡泡。", "泡珠彈跳"],
  ["燼尾火螈", "暖紅外鰓像火星，彎尾亮著不燙人的小火光。", "燼尾火圈"],
  ["砂鰓靈螈", "圓石外鰓圍著笑臉，琥珀背甲藏著細沙。", "砂鰓守護"],
  ["白金槍螈", "白金盾甲包住身體，長槍般的外鰓閃著銀光。", "白金槍陣"],
  ["古柳森螈", "柳根鬚鰓垂向水面，森林長尾帶來新生綠意。", "古柳纏枝"],
  ["深潮冠螈", "珊瑚王冠與瀑布尾鰭，緩緩引領月泉水流。", "深潮湧泉"],
  ["熔甲炎螈", "熔岩護甲包著暖紅身軀，背上的火帆高高展開。", "熔甲烈帆"],
  ["山晶巨螈", "水晶山峰般的外鰓與寬大岩尾，站得穩穩當當。", "山晶尾陣"],
  ["銀錢鱗獸", "圓圓銀錢鱗片蓋住背部，星形鼻尖四處嗅探。", "銀錢滾擊"],
  ["松果鱗獸", "松果鱗片冒出新芽，苔綠小爪踏過落葉。", "松果護身"],
  ["珠貝鱗獸", "貝殼鱗片藏著珍珠光，波浪尾巴輕輕捲起。", "珠貝浪圈"],
  ["炭星鱗獸", "煤石鱗片間透著星火，背部小孔冒出暖暖光點。", "炭星突進"],
  ["蜜晶鱗獸", "蜜色晶鱗圍著圓身，砂岩小爪擅長挖寶。", "蜜晶護環"],
  ["金盾鱗騎", "重疊金盾構成護甲，巨型尾甲守住整條山道。", "金盾尾掃"],
  ["古木鱗衛", "樹皮厚甲與濃綠冠葉，肩背像一座移動森林。", "古木護陣"],
  ["冰礁鱗王", "冰藍鱗甲排列如浪，珊瑚巨角映著海底光芒。", "冰礁寒浪"],
  ["熔脊鱗王", "黑岩厚甲包著熔光，巨尾上的火脊層層豎起。", "熔脊震擊"],
  ["山嶺鱗皇", "巨大岩鱗上長出晶柱，寬厚背脊像連綿山嶺。", "山嶺護壁"],
  ["銀傘菇靈", "銀鈴傘帽遮著圓臉，短短金屬手臂喜歡打招呼。", "銀傘回音"],
  ["花帽菇靈", "花瓣傘帽與葉片披風，橡實小包收藏森林禮物。", "花帽飛葉"],
  ["水滴菇靈", "透明水滴傘帽搖搖晃晃，珍珠小手亮晶晶。", "水滴泡傘"],
  ["炭足火菇", "橘紅傘帽像溫暖夜燈，木炭小腳踏出火花。", "火帽跳躍"],
  ["晶洞菇靈", "晶洞傘帽藏著琥珀，厚厚岩靴走得很穩。", "晶洞護傘"],
  ["金塔菇騎", "金屬塔形傘冠高高聳立，盾形雙手守護同伴。", "金塔盾陣"],
  ["古橡菇賢", "寬闊森林傘冠與苔蘚長鬚，陪伴古樹慢慢成長。", "古橡根網"],
  ["瀑傘潮靈", "瀑布沿著巨傘流下，珊瑚法杖引來清亮潮聲。", "瀑傘潮幕"],
  ["熔頂巨菇", "火山口般的傘冠亮著火光，黑曜拳頭十分堅固。", "熔頂火環"],
  ["峽岩菇王", "層層砂岩傘冠護住琥珀身軀，穩穩站在峽谷間。", "峽岩巨傘"],
  ["銀羅盤龍", "銀色細鰭像羅盤指針，星冠與捲尾指向航路。", "銀針旋流"],
  ["海蕨幼龍", "葉角與蕨鰭隨水飄動，細長尾巴捲著海草。", "海蕨環流"],
  ["珠泡幼龍", "珍珠身軀與透明浪鰭，尾尖輕輕吐出泡泡。", "珠泡潮舞"],
  ["燼鬃幼龍", "火焰小鬃毛圍著額頭，橘色玻璃鰭閃著暖光。", "燼鬃旋舞"],
  ["砂甲幼龍", "砂石甲片與琥珀小角，彎尾像一條金色海岸。", "砂甲環護"],
  ["白金星龍", "白金刃鰭與金色頭冠，捲尾托著細碎星光。", "白金星環"],
  ["古灣森龍", "紅樹般的枝角向外伸展，森林長鰭拖出綠色水紋。", "古灣根潮"],
  ["深淵瀑龍", "發光珊瑚王冠與巨大瀑布鰭，引領深海的潮汐。", "深淵瀑潮"],
  ["曜日炎龍", "日焰王冠與流動鳳羽鰭，身體像一條暖金星河。", "曜日炎潮"],
  ["化石岩龍", "層疊峽岩護甲裹著古老身軀，金晶長鰭照亮龍灣。", "化石晶潮"],
] as const;

const legacyCatalog: readonly Monster[] = entries.map(([name, feature, move], i) => {
  const family = Math.floor(i / 10), form = MONSTER_FORMS[Math.floor(i / 5) % 2].id;
  const id = `${MONSTER_FAMILIES[family].id}-${form}-${affinities[i % 5]}`;
  const tiers = form === "scout" ? ["E", "E", "D", "D", "C"] as const : ["B", "B", "A", "A", "S"] as const;
  const rarity = tiers[(i % 5 + family) % 5];
  return { rarity, id, number: i + 1, family, form, name, feature, move, element: ELEMENTS[i % 5].name,
    image: `/assets/monsters/${id}.webp?v=${i < 30 ? MONSTER_ART_VERSION : "wave3-20261025"}`,
    ...(i >= 30 ? { thumbnail: `/assets/monsters/${id}-320.webp?v=wave3-20261025` } : {}) };
});
export const MONSTER_CATALOG: readonly Monster[] = [...legacyCatalog,...RELEASED_WAVE4_MONSTERS.map((m,i)=>({
  ...m,number:81+i,family:8+Math.floor(i/10),form:"warden" as const,
  image:`/assets/monsters/wave4/${m.id}.webp`,thumbnail:`/assets/monsters/wave4/${m.id}-320.webp`,
}))];
const byId = new Map(MONSTER_CATALOG.map(monster => [monster.id, monster]));
export const monsterById = (id: unknown): Monster | undefined => typeof id === "string" ? byId.get(id) : undefined;
export const monsterForm = (monster: Monster) => MONSTER_FORMS.find(form => form.id === monster.form)!;
export const monsterEligible = (monster: Monster, level: number) => level >= monsterForm(monster).minLevel && level <= monsterForm(monster).maxLevel;

export function chooseMonster(level: number, seed: number, previousFamily?: number, element?: ElementName): Monster {
  const eligible = MONSTER_CATALOG.filter(monster => monsterEligible(monster, level) && (element === undefined || monster.element === element));
  const otherFamilies = eligible.filter(monster => monster.family !== previousFamily);
  // Any fallback stays inside the selected biome and training-stage pool.
  const pool = otherFamilies.length ? otherFamilies : eligible;
  if (!pool.length || !Number.isFinite(seed)) throw Error("沒有符合這條航線的怪物");
  // Two disjoint portions of the server seed choose tier and member. The tier
  // budget stays fixed as species are added; previous-family exclusion stays local.
  const value = Math.abs(Math.floor(seed));
  const rarity = chooseRarity(pool, ENCOUNTER_WEIGHTS, (value % 10000) / 10000);
  const tier = pool.filter(monster => monster.rarity === rarity);
  return tier[Math.floor(value / 10000) % tier.length];
}

// Acquisition remains separate: these cards can be befriended in voyages, not drawn or bought.
export const MONSTER_COMPANIONS: Character[] = MONSTER_CATALOG.map(monster => ({
  id: monster.id, catalogNumber: (monster.number <= 30 ? 55 : 105) + monster.number, name: monster.name, nameEn: monster.id,
  title: `${MONSTER_FAMILIES[monster.family].name}族的冒險夥伴`, rarity: monster.rarity, unlockAt: 0,
  image: monster.image, ...(monster.thumbnail ? { thumbnail: monster.thumbnail } : {}), alt: monster.name, element: monster.element, personality: "勇敢",
  story: monster.feature, artBrief: monster.feature, palette: "", tags: ["降服夥伴"],
}));
