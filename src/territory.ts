import { castleGrowth, castleStage, isCastleStyle, MAX_CASTLE_EXPANSION, type CastleStyleId } from "./castle-growth";
import { ELEMENTS, type ElementName } from "./elements";

export const RESOURCE_KEYS = ["wood", "stone", "star"] as const;
export type Resource = (typeof RESOURCE_KEYS)[number];
export type Stock = Record<Resource, number>;
export const RESOURCE_LABELS = { wood: "靈木", stone: "雲石", star: "星砂" };
export const MAX_STOCK = 50_000;
export const OFFLINE_HOURS = 8;
const HOUR = 3_600_000;
export type BuildingKind =
  | "hall"
  | "grove"
  | "quarry"
  | "well"
  | "workshop"
  | "bakery"
  | "greenhouse"
  | "observatory"
  | "harbor"
  | "academy"
  | "fountain"
  | "statue"
  | "lantern"
  | "garden"
  | "bridge"
  | "pavilion";
export type BuildingSpec = {
  id: BuildingKind;
  name: string;
  description: string;
  element: ElementName;
  cost: Stock;
  production: Stock;
  unlock: number;
  art: number;
  decor: boolean;
};
const stock = (wood = 0, stone = 0, star = 0): Stock => ({ wood, stone, star });
export const BUILDINGS: BuildingSpec[] = [
  [
    "hall",
    "星潮城堡",
    "領地的家。永遠提供三種資源，隨時都能重新出發。",
    "土",
    0,
    0,
    0,
    120,
    100,
    60,
    1,
    false,
  ],
  [
    "grove",
    "靈木林場",
    "照料發光的樹木，收集建造需要的靈木。",
    "木",
    40,
    20,
    0,
    180,
    0,
    0,
    1,
    false,
  ],
  [
    "quarry",
    "雲石工地",
    "從雲端岩層採集潔白的建築石材。",
    "金",
    40,
    30,
    0,
    0,
    160,
    0,
    1,
    false,
  ],
  [
    "well",
    "星泉",
    "收集星光倒映，在泉水中凝成星砂。",
    "水",
    35,
    35,
    20,
    0,
    0,
    100,
    1,
    false,
  ],
  [
    "workshop",
    "星匠工坊",
    "讓巧思化為實物，供應靈木與雲石。",
    "火",
    90,
    60,
    30,
    120,
    100,
    0,
    2,
    false,
  ],
  [
    "bakery",
    "暖光烘焙屋",
    "溫暖的香氣，讓居民每天都期待回家。",
    "火",
    70,
    50,
    30,
    0,
    0,
    130,
    2,
    false,
  ],
  [
    "greenhouse",
    "月芽溫室",
    "在玻璃屋裡種下星海的奇花異草。",
    "木",
    120,
    80,
    50,
    260,
    0,
    60,
    3,
    false,
  ],
  [
    "observatory",
    "望星台",
    "追尋星軌，把遠方的星光收藏起來。",
    "金",
    100,
    150,
    80,
    0,
    0,
    240,
    4,
    false,
  ],
  [
    "harbor",
    "白帆港灣",
    "和平商船帶回各地的建築材料。",
    "水",
    180,
    120,
    90,
    180,
    150,
    90,
    5,
    false,
  ],
  [
    "academy",
    "雲上學院",
    "分享發現，讓知識和美好一起生長。",
    "土",
    200,
    200,
    120,
    220,
    180,
    120,
    6,
    false,
  ],
  [
    "fountain",
    "琉光噴泉",
    "清澈的水花與鄰近的木系建築相生。",
    "水",
    25,
    40,
    15,
    0,
    0,
    0,
    1,
    true,
  ],
  [
    "statue",
    "小龍雕像",
    "以金色小龍守護每一次新的開始。",
    "金",
    20,
    60,
    30,
    0,
    0,
    0,
    2,
    true,
  ],
  [
    "lantern",
    "星燈小徑",
    "為歸來的朋友點亮暖金色的燈。",
    "火",
    20,
    15,
    10,
    0,
    0,
    0,
    1,
    true,
  ],
  [
    "garden",
    "繁花庭園",
    "花叢與拱門，留一處慢慢散步的地方。",
    "木",
    35,
    20,
    10,
    0,
    0,
    0,
    1,
    true,
  ],
  [
    "bridge",
    "雲石小橋",
    "讓柔和的曲線串起喜歡的風景。",
    "土",
    30,
    45,
    10,
    0,
    0,
    0,
    2,
    true,
  ],
  [
    "pavilion",
    "聽潮涼亭",
    "和夥伴坐下，聽海風經過白色石柱。",
    "土",
    80,
    70,
    40,
    0,
    0,
    0,
    3,
    true,
  ],
].map((r, i) => ({
  id: r[0],
  name: r[1],
  description: r[2],
  element: r[3],
  cost: stock(r[4] as number, r[5] as number, r[6] as number),
  production: stock(r[7] as number, r[8] as number, r[9] as number),
  unlock: r[10],
  decor: r[11],
  art: i,
})) as BuildingSpec[];
export const buildingSpec = (id: unknown) => BUILDINGS.find((b) => b.id === id);
export type PlacedBuilding = {
  id: number;
  kind: BuildingKind;
  level: number;
  plot: number | null;
  resident: string | null;
};
export type Territory = {
  version: 1;
  resources: Stock;
  carry: Stock;
  lastSettled: number;
  renown: number;
  expansion: number;
  castleStyle?: CastleStyleId;
  buildings: PlacedBuilding[];
  nextId: number;
  commissions: number;
  harvested: number;
  achievements: string[];
  theme: "day" | "night";
};
export const LEVELS = [0, 24, 70, 150, 280, 460, 700, 1000, 1400, 1900];
export const cityLevel = (t: Territory) =>
  LEVELS.filter((n) => t.renown >= n).length;
export const plotCount = (t: Territory) => castleStage(t.expansion).plots;
export const buildingCost = (b: BuildingSpec, level = 0) =>
  Object.fromEntries(
    RESOURCE_KEYS.map((k) => [k, b.cost[k] * (level + 1)]),
  ) as Stock;
export const affordable = (resources: Stock, cost: Stock) =>
  RESOURCE_KEYS.every((k) => resources[k] >= cost[k]);
export const commission = (t: Territory) => {
  const types = [
    { name: "修繕海岸步道", cost: stock(30, 20, 0), reward: stock(0, 0, 18) },
    { name: "為商船準備木箱", cost: stock(45, 0, 5), reward: stock(0, 25, 12) },
    { name: "佈置星光野餐", cost: stock(15, 25, 10), reward: stock(40, 0, 15) },
  ];
  return types[t.commissions % types.length];
};
export const ACHIEVEMENTS = [
  {
    id: "settler",
    name: "第一座新建築",
    description: "擁有兩座建築",
    goal: (t: Territory) => t.buildings.length >= 2,
    reward: stock(40, 30, 20),
  },
  {
    id: "village",
    name: "熱鬧小鎮",
    description: "擁有六座建築",
    goal: (t: Territory) => t.buildings.length >= 6,
    reward: stock(80, 60, 40),
  },
  {
    id: "gardener",
    name: "風景收藏家",
    description: "收藏三種不同裝飾",
    goal: (t: Territory) =>
      new Set(
        t.buildings
          .filter((b) => buildingSpec(b.kind)?.decor)
          .map((b) => b.kind),
      ).size >= 3,
    reward: stock(70, 70, 50),
  },
  {
    id: "helper",
    name: "和平小幫手",
    description: "完成五次委託",
    goal: (t: Territory) => t.commissions >= 5,
    reward: stock(100, 80, 60),
  },
  {
    id: "island",
    name: "整座島都是家",
    description: "開放全部二十四格土地",
    goal: (t: Territory) => t.expansion === MAX_CASTLE_EXPANSION,
    reward: stock(200, 200, 150),
  },
  {
    id: "master",
    name: "星海建築師",
    description: "領地達到十級",
    goal: (t: Territory) => cityLevel(t) === 10,
    reward: stock(500, 500, 300),
  },
];
export function newTerritory(now: number): Territory {
  return {
    version: 1,
    resources: stock(180, 150, 90),
    carry: stock(),
    lastSettled: now,
    renown: 0,
    expansion: 0,
    buildings: [{ id: 1, kind: "hall", level: 1, plot: 0, resident: null }],
    nextId: 2,
    commissions: 0,
    harvested: 0,
    achievements: [],
    theme: "day",
  };
}
const validInt = (v: unknown, max = 1_000_000) =>
  Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max;
function require(
  ok: unknown,
  message = "領地資料不正確，沒有更動原有進度",
): asserts ok {
  if (!ok) throw Error(message);
}
export function validateTerritory(v: unknown): asserts v is Territory {
  require(v && typeof v === "object" && !Array.isArray(v));
  const t = v as Territory;
  require(
    t.version === 1 &&
      validInt(t.lastSettled, 8_640_000_000_000_000) &&
      validInt(t.renown) &&
      validInt(t.expansion, MAX_CASTLE_EXPANSION) &&
      (t.castleStyle === undefined || isCastleStyle(t.castleStyle)) &&
      validInt(t.commissions) &&
      validInt(t.harvested, 1_000_000_000) &&
      validInt(t.nextId) &&
      t.nextId >= 2 &&
      ["day", "night"].includes(t.theme),
  );
  for (const [s, max] of [
    [t.resources, MAX_STOCK],
    [t.carry, HOUR - 1],
  ] as const)
    require(s && RESOURCE_KEYS.every((k) => validInt(s[k], max)));
  require(
    Array.isArray(t.buildings) &&
      t.buildings.length >= 1 &&
      t.buildings.length <= 48,
  );
  const ids = new Set<number>(),
    plots = new Set<number>();
  for (const b of t.buildings) {
    require(
      b &&
        buildingSpec(b.kind) &&
        validInt(b.id) &&
        b.id > 0 &&
        b.id < t.nextId &&
        !ids.has(b.id) &&
        validInt(b.level, 5) &&
        b.level > 0 &&
        (b.plot === null ||
          (validInt(b.plot, plotCount(t) - 1) && !plots.has(b.plot))) &&
        (b.resident === null ||
          (typeof b.resident === "string" &&
            /^[a-z][a-z0-9-]{0,49}$/.test(b.resident))),
    );
    ids.add(b.id);
    if (b.plot !== null) plots.add(b.plot);
  }
  const halls = t.buildings.filter((b) => b.kind === "hall");
  require(halls.length === 1 && halls[0].plot !== null && halls[0].level === 1);
  require(
    Array.isArray(t.achievements) &&
      t.achievements.length <= ACHIEVEMENTS.length &&
      new Set(t.achievements).size === t.achievements.length &&
      t.achievements.every((id) => ACHIEVEMENTS.some((a) => a.id === id)),
  );
}
export function hasSynergy(t: Territory, b: PlacedBuilding): boolean {
  if (b.plot === null) return false;
  const target = buildingSpec(b.kind)!.element;
  return t.buildings.some(
    (other) =>
      other.id !== b.id &&
      other.plot !== null &&
      Math.abs(Math.floor(other.plot / 6) - Math.floor(b.plot! / 6)) +
        Math.abs((other.plot % 6) - (b.plot! % 6)) ===
        1 &&
      ELEMENTS.find((e) => e.name === buildingSpec(other.kind)!.element)
        ?.generates === target,
  );
}
export function production(t: Territory): Stock {
  const rate = stock();
  for (const b of t.buildings) {
    if (b.plot === null) continue;
    const base = buildingSpec(b.kind)!.production,
      bonus = hasSynergy(t, b) ? 11 : 10;
    for (const k of RESOURCE_KEYS) rate[k] += (base[k] * b.level * bonus) / 10;
  }
  return rate;
}
export function pendingResources(t: Territory, now: number): Stock {
  const elapsed = Math.min(
      OFFLINE_HOURS * HOUR,
      Math.max(0, now - t.lastSettled),
    ),
    rate = production(t);
  return Object.fromEntries(
    RESOURCE_KEYS.map((k) => [
      k,
      Math.min(
        MAX_STOCK - t.resources[k],
        Math.floor((elapsed * rate[k] + t.carry[k]) / HOUR),
      ),
    ]),
  ) as Stock;
}
function settle(t: Territory, now: number) {
  const elapsed = Math.min(
      OFFLINE_HOURS * HOUR,
      Math.max(0, now - t.lastSettled),
    ),
    rate = production(t);
  for (const k of RESOURCE_KEYS) {
    const total = elapsed * rate[k] + t.carry[k],
      whole = Math.floor(total / HOUR),
      amount = Math.min(MAX_STOCK - t.resources[k], whole);
    t.resources[k] += amount;
    t.carry[k] = total % HOUR;
    t.harvested = Math.min(1_000_000_000, t.harvested + amount);
  }
  t.lastSettled = Math.max(t.lastSettled, now);
}
function spend(t: Territory, cost: Stock) {
  require(affordable(
    t.resources,
    cost,
  ), "資源還不夠，可以先收取產出或等主城補充。");
  for (const k of RESOURCE_KEYS) t.resources[k] -= cost[k];
}
function grant(t: Territory, reward: Stock) {
  for (const k of RESOURCE_KEYS)
    t.resources[k] = Math.min(MAX_STOCK, t.resources[k] + reward[k]);
}
function fame(t: Territory, n: number) {
  t.renown = Math.min(1_000_000, t.renown + n);
}
export type TerritoryCommand = Record<string, unknown> & { action?: unknown };
/** Pure atomic transition: reject without mutating input; server owns time, ownership and growth XP. */
export function territoryTransition(
  current: Territory | undefined,
  c: TerritoryCommand,
  now: number,
  owned: Record<string, number>,
  growthXp: Readonly<Record<string, number>> = {},
): Territory {
  require(validInt(now, 8_640_000_000_000_000));
  const allowed: Record<string, string[]> = {
    start: [],
    harvest: [],
    build: ["kind", "plot"],
    upgrade: ["building"],
    move: ["building", "plot"],
    store: ["building"],
    demolish: ["building"],
    resident: ["building", "pet"],
    expand: [],
    commission: [],
    achievement: ["achievement"],
    theme: ["theme"],
    "castle-style": ["style"],
  };
  require(typeof c.action === "string" &&
    Object.prototype.hasOwnProperty.call(
      allowed,
      c.action,
    ), "找不到這個領地操作");
  require(Object.keys(c).every((k) =>
    ["type", "player", "action", ...allowed[c.action as string]].includes(k),
  ), "領地操作含有不支援的欄位");
  if (!current) {
    require(c.action === "start", "請先開啟你的領地");
    return newTerritory(now);
  }
  validateTerritory(current);
  const t = structuredClone(current);
  settle(t, now);
  const b = t.buildings.find((b) => b.id === c.building);
  const place = (plot: unknown) => {
    require(validInt(plot, plotCount(t) - 1), "這塊土地還沒有開放");
    require(!t.buildings.some(
      (x) => x.plot === plot && x.id !== b?.id,
    ), "這塊土地已有建築");
    return plot as number;
  };
  switch (c.action) {
    case "start":
    case "harvest":
      break;
    case "build": {
      const spec = buildingSpec(c.kind);
      require(spec && spec.id !== "hall", "無法建造這個建築");
      require(cityLevel(t) >= spec.unlock, "領地等級還不夠");
      require(t.buildings.length < 48 &&
        t.nextId < 1_000_000, "收納空間已滿，請先拆解不需要的收納建築");
      const plot = place(c.plot);
      spend(t, spec.cost);
      t.buildings.push({
        id: t.nextId++,
        kind: spec.id,
        level: 1,
        plot,
        resident: null,
      });
      fame(t, 8);
      break;
    }
    case "upgrade":
      require(b &&
        b.kind !== "hall" &&
        b.level < 5, "這座建築已經完成所有升級");
      spend(t, buildingCost(buildingSpec(b.kind)!, b.level));
      fame(t, 10 * b.level);
      b.level++;
      break;
    case "move":
      require(b, "找不到這座建築");
      b.plot = place(c.plot);
      break;
    case "store":
      require(b && b.kind !== "hall", "主城需要留在島上");
      b.plot = null;
      break;
    case "demolish":
      require(b &&
        b.kind !== "hall" &&
        b.plot === null, "只能拆解收納屋中的建築");
      grant(
        t,
        Object.fromEntries(
          RESOURCE_KEYS.map((k) => [
            k,
            Math.floor(buildingSpec(b.kind)!.cost[k] / 2),
          ]),
        ) as Stock,
      );
      t.buildings = t.buildings.filter((x) => x.id !== b.id);
      break;
    case "resident":
      require(b, "找不到這座建築");
      require(c.pet === null ||
        (typeof c.pet === "string" &&
          /^[a-z][a-z0-9-]{0,49}$/.test(c.pet) &&
          Object.prototype.hasOwnProperty.call(owned, c.pet) &&
          owned[c.pet] > 0), "只能邀請目前擁有的夥伴");
      if (c.pet !== null)
        for (const x of t.buildings)
          if (x.resident === c.pet) x.resident = null;
      b.resident = c.pet as string | null;
      break;
    case "expand": {
      const progress = castleGrowth(t.expansion, growthXp);
      require(progress.next, "整座島都已經開放");
      require(progress.eligible, `任一夥伴靠練習提升 ${progress.next.companionLevel - 1} 級，就能免費擴建`);
      t.expansion++;
      fame(t, 25);
      break;
    }
    case "castle-style":
      require(isCastleStyle(c.style), "請選擇一款城堡外觀");
      t.castleStyle = c.style;
      break;
    case "commission": {
      require(t.commissions < 1_000_000, "委託已完成");
      const job = commission(t);
      spend(t, job.cost);
      grant(t, job.reward);
      t.commissions++;
      fame(t, 6);
      break;
    }
    case "achievement": {
      const a = ACHIEVEMENTS.find((x) => x.id === c.achievement);
      require(a &&
        a.goal(t) &&
        !t.achievements.includes(a.id), "這個里程碑還無法領取");
      grant(t, a.reward);
      t.achievements.push(a.id);
      break;
    }
    case "theme":
      require(c.theme === "day" || c.theme === "night");
      t.theme = c.theme;
      break;
  }
  validateTerritory(t);
  return t;
}
