import { RESOURCE_KEYS, territoryTransition, type Stock, type Territory } from "./territory";
import { depositLearningMaterials, type LearningRewards } from "./learning-rewards";

export const FURNITURE = [
  { id: "bed", name: "星夢小床", category: "furniture", width: 25, cost: { wood: 40, stone: 12, star: 12 }, activity: "sleep" },
  { id: "chair", name: "星潮軟椅", category: "furniture", width: 17, cost: { wood: 12, stone: 6, star: 2 }, activity: "sit" },
  { id: "table", name: "月光茶几", category: "furniture", width: 23, cost: { wood: 24, stone: 12, star: 6 }, activity: "visit" },
  { id: "rug", name: "星海地毯", category: "rug", width: 32, cost: { wood: 10, stone: 0, star: 6 }, activity: "rest" },
  { id: "shelf", name: "故事書櫃", category: "furniture", width: 22, cost: { wood: 30, stone: 12, star: 6 }, activity: "visit" },
  { id: "lamp", name: "星光立燈", category: "furniture", width: 14, cost: { wood: 10, stone: 12, star: 12 }, activity: "visit" },
  { id: "plant", name: "花樹盆栽", category: "furniture", width: 16, cost: { wood: 14, stone: 10, star: 4 }, activity: "visit" },
  { id: "toy", name: "月亮搖搖馬", category: "furniture", width: 22, cost: { wood: 30, stone: 6, star: 12 }, activity: "play" },
  { id: "frame", name: "星海掛畫", category: "wall", width: 18, cost: { wood: 10, stone: 6, star: 6 }, activity: "visit" },
  { id: "globe", name: "星球小擺飾", category: "small", width: 10, cost: { wood: 6, stone: 12, star: 12 }, activity: "visit" },
  { id: "cushion", name: "星星抱枕", category: "rug", width: 17, cost: { wood: 8, stone: 0, star: 4 }, activity: "rest" },
  { id: "curtain", name: "星潮窗簾", category: "wall", width: 30, cost: { wood: 20, stone: 0, star: 12 }, activity: "visit" },
] as const;
export type FurnitureKind = (typeof FURNITURE)[number]["id"];
export type FurnitureSpec = (typeof FURNITURE)[number];
export const furnitureSpec = (id: unknown) => FURNITURE.find(x => x.id === id);
export const WALLS = ["ivory", "moon", "botanical"] as const;
export const FLOORS = ["stone", "wood", "mosaic"] as const;
export type RoomFinish = { wall: typeof WALLS[number]; floor: typeof FLOORS[number] };
export type HomeItem = { id: number; kind: FurnitureKind; room: number | null; x: number; y: number; rotation: number; parent: number | null; layer: number };
export type HomeDecor = { version: 1; revision: number; nextId: number; items: HomeItem[]; rooms: RoomFinish[]; resident: string | null; goal: FurnitureKind | null };
export const MAX_HOME_ITEMS = 120;
export const roomCount = (territory?: Territory) => 1 + (territory?.expansion ?? 0);
export function freshHomeDecor(): HomeDecor {
  return { version: 1, revision: 0, nextId: 4, resident: null, goal: "bed", rooms: Array.from({ length: 3 }, () => ({ wall: "ivory", floor: "stone" })), items: [
    { id: 1, kind: "rug", room: 0, x: 48, y: 77, rotation: 0, parent: null, layer: 0 },
    { id: 2, kind: "chair", room: 0, x: 34, y: 69, rotation: 0, parent: null, layer: 0 },
    { id: 3, kind: "cushion", room: 0, x: 64, y: 78, rotation: 0, parent: null, layer: 0 },
  ] };
}
function check(ok: unknown, message = "佈置資料不正確，原有家園沒有更動"): asserts ok { if (!ok) throw Error(message); }
const integer = (n: unknown, min: number, max: number): n is number => Number.isSafeInteger(n) && Number(n) >= min && Number(n) <= max;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: object, keys: string[]) => Object.keys(v).every(k => keys.includes(k));
export function validateHomeDecor(value: unknown, availableRooms = 3): asserts value is HomeDecor {
  check(record(value)); const s = value as unknown as HomeDecor;
  check(s.version === 1 && integer(s.revision, 0, Number.MAX_SAFE_INTEGER - 1) && integer(s.nextId, 1, Number.MAX_SAFE_INTEGER - 1));
  check(s.goal === null || furnitureSpec(s.goal));
  check(s.resident === null || (typeof s.resident === "string" && s.resident.length > 0 && s.resident.length <= 100));
  check(Array.isArray(s.rooms) && s.rooms.length === 3 && s.rooms.every(r => record(r) && WALLS.includes(r.wall as never) && FLOORS.includes(r.floor as never)));
  check(Array.isArray(s.items) && s.items.length <= MAX_HOME_ITEMS && new Set(s.items.map(i => i?.id)).size === s.items.length);
  for (const i of s.items) {
    check(record(i) && integer(i.id, 1, s.nextId - 1)); const spec = furnitureSpec(i.kind); check(spec);
    check(i.room === null || integer(i.room, 0, availableRooms - 1));
    check(integer(i.rotation, 0, 3) && integer(i.layer, -2, 2));
    check(i.parent === null || integer(i.parent, 1, s.nextId - 1));
    if (i.parent !== null) {
      const support = s.items.find(t => t.id === i.parent);
      check(spec.category === "small" && i.room !== null && support?.kind === "table" && support.room === i.room && support.parent === null);
      check(integer(i.x, -6, 6) && integer(i.y, -2, 2));
    } else {
      check(integer(i.x, Math.ceil(8 + spec.width / 2), Math.floor(92 - spec.width / 2)));
      check(integer(i.y, spec.category === "wall" ? 20 : 51, spec.category === "wall" ? 44 : 88));
    }
  }
}
type DecorProfile = { homeDecor?: HomeDecor; territory?: Territory; learningRewards?: LearningRewards; owned: Record<string, number>; growth: { xp: Record<string, number> } };
export function homeDecorTransition(profile: DecorProfile, c: Record<string, unknown>, now: number) {
  const allowed: Record<string, string[]> = { open: [], goal: ["goal"], craft: ["kind"], save: ["baseRevision", "items", "rooms", "resident"] };
  check(typeof c.action === "string" && Object.prototype.hasOwnProperty.call(allowed, c.action), "找不到這個佈置操作");
  check(exact(c, ["type", "player", "action", ...allowed[c.action as string]]));
  const p = structuredClone(profile);
  if (c.action === "open") {
    if (!p.territory) p.territory = territoryTransition(undefined, { action: "start" }, now, p.owned, p.growth.xp);
    if (!p.homeDecor) p.homeDecor = freshHomeDecor();
    depositLearningMaterials(p, now);
  } else {
    check(p.homeDecor && p.territory, "先開啟自己的房間吧");
    const s = p.homeDecor;
    if (c.action === "goal") { check(c.goal === null || furnitureSpec(c.goal)); s.goal = c.goal as FurnitureKind | null; }
    if (c.action === "craft") {
      const spec = furnitureSpec(c.kind); check(spec, "找不到這件家具"); check(s.items.length < MAX_HOME_ITEMS, "收納空間已滿，現有家具仍可自由佈置");
      p.territory = territoryTransition(p.territory, { action: "harvest" }, now, p.owned, p.growth.xp);
      depositLearningMaterials(p, now);
      check(RESOURCE_KEYS.every(k => p.territory!.resources[k] >= spec.cost[k]), "材料還差一點，先預覽想放的位置吧");
      for (const k of RESOURCE_KEYS) p.territory.resources[k] -= spec.cost[k];
      s.items.push({ id: s.nextId++, kind: spec.id, room: null, x: 50, y: spec.category === "wall" ? 30 : 73, rotation: 0, parent: null, layer: 0 });
      depositLearningMaterials(p, now);
    }
    if (c.action === "save") {
      check(c.baseRevision === s.revision, "家園已在另一個畫面更新。請先取消草稿，載入最新佈置。");
      check(Array.isArray(c.items) && c.items.length === s.items.length);
      const items = c.items as HomeItem[];
      check(items.every(i => record(i) && exact(i, ["id", "kind", "room", "x", "y", "rotation", "parent", "layer"]) && s.items.some(old => old.id === i.id && old.kind === i.kind)), "只能擺放已擁有的家具");
      check(c.resident === null || (typeof c.resident === "string" && p.owned[c.resident] > 0), "只能邀請已擁有的夥伴");
      s.items = structuredClone(items); s.rooms = structuredClone(c.rooms) as RoomFinish[]; s.resident = c.resident as string | null;
    }
    s.revision++;
  }
  validateHomeDecor(p.homeDecor, roomCount(p.territory));
  return { homeDecor: p.homeDecor, territory: p.territory, learningRewards: p.learningRewards };
}
export function homeStock(p: { territory?: Territory; learningRewards?: LearningRewards }): Stock {
  return Object.fromEntries(RESOURCE_KEYS.map(k => [k, (p.territory?.resources[k] ?? 0)])) as Stock;
}
export function itemPosition(item: HomeItem, all: HomeItem[]) {
  const parent = item.parent === null ? null : all.find(i => i.id === item.parent);
  return parent ? { x: parent.x + item.x, y: parent.y - 10 + item.y, z: parent.y * 10 + 25 + item.layer } : { x: item.x, y: item.y, z: furnitureSpec(item.kind)?.category === "rug" ? 10 + item.layer : furnitureSpec(item.kind)?.category === "wall" ? 5 + item.layer : item.y * 10 + item.layer * 10 };
}
