// 數學島的進度規則（三遍提取法、迷路的星星、弱點筆記）。
// 雲端整合由 server.ts 保存進度與獎勵；舊來源存檔讀取器僅保留相容用途。
import { CHALLENGE_QUESTIONS, MAX_MISTAKES } from "../challenge-rules";
import { GAME_UNITS as GAMES, ISLAND_UNITS, UNIT_BY_ID, gradeUnits, unitGrade } from "./catalog";
import type { Item } from "./games";

export const ISLAND_KEY = "star-tide.island.v1";
export type Stage = "learn" | "play" | "boss";
export const STAGE_ORDER: Stage[] = ["learn", "play", "boss"];
export const ROUND_SIZE = { play: CHALLENGE_QUESTIONS, boss: CHALLENGE_QUESTIONS, mock: CHALLENGE_QUESTIONS } as const;
/** 完成全站六題挑戰、累計錯誤未達三題，即通關。 */
export const PASS_MARK = (CHALLENGE_QUESTIONS - MAX_MISTAKES + 1) / CHALLENGE_QUESTIONS;
/** 迷路的星星要在不同天連續答對兩次才回到天上。 */
export const GRADUATE_STREAK = 2;
/** 玩一玩一趟 6 題：第 1、3、5、6 題是本單元新題，第 2、4 題留給迷路的星星或抽查。 */
export const PLAY_MIX_SLOTS = [1, 3] as const;

/** 迷路的星星：一種小遊戲一顆。回來時出那種遊戲的新題目（換數字）。 */
export type Star = { k: string; due: string; streak: number; added: string };
export type UnitProgress = { learn?: boolean; play?: boolean; boss?: number };
export type PlayerIsland = {
  units: Record<string, UnitProgress>;
  mock?: number;
  mocks?: Record<string,number>;
  pool: Star[];
  stats: Record<string, { a: number; w: number }>;
  /** Optional, bounded evidence for the ability display; no reward or unlock rules depend on it. */
  recent?: Record<string, boolean[]>;
  /** 當天已經作答過的題目代號：只有當天第一次作答答對才有獎勵（與原遊戲相同）。 */
  day: string;
  attempted: string[];
};
export type IslandSave = { format: "star-tide-island"; version: 1; voice: boolean; players: Record<string, PlayerIsland> };

export const emptyPlayer = (): PlayerIsland => ({ units: {}, pool: [], stats: {}, day: "", attempted: [] });
export const emptySave = (): IslandSave => ({ format: "star-tide-island", version: 1, voice: true, players: {} });

export function dayKey(d = new Date(), offsetDays = 0) {
  const x = new Date(d);
  x.setDate(x.getDate() + offsetDays);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function stageOpen(p: PlayerIsland, unit: string, stage: Stage) {
  const u = p.units[unit] ?? {};
  if (stage === "learn") return true;
  if (stage === "play") return !!u.learn;
  return !!u.play;
}
export const bossBeaten = (p: PlayerIsland, unit: string) => (p.units[unit]?.boss ?? 0) >= PASS_MARK;
/** 島主大挑戰是全範圍模擬考：全學年十八個單元的守關神獸都打敗才開。 */
export const kingOpen = (p: PlayerIsland,grade=1) => gradeUnits(grade).every((u) => bossBeaten(p, u.id));
/** 神獸的愛心數 = 過關要答對的題數。 */
export const heartsFor = (size: number) => Math.ceil(size * PASS_MARK);

/** 這題今天是不是第一次作答；同時把它記成已作答。 */
export function takeFirstAttempt(p: PlayerIsland, id: string, today: string) {
  if (p.day !== today) {
    p.day = today;
    p.attempted = [];
  }
  if (p.attempted.includes(id)) return false;
  p.attempted.push(id);
  return true;
}

export type StarEvent = "lost" | "found" | "home" | null;
/**
 * 記錄一題的第一次作答（每題只記第一次的對錯），任何關卡都算：
 * - 答錯：那種小遊戲的星星迷路（沒有就新增），連對歸零，隔天回來。
 * - 答對：如果那種遊戲的星星今天到期，連對加一、隔天再來；連對兩次就回到天上。
 */
export function recordAnswer(p: PlayerIsland, item: Pick<Item, "k">, ok: boolean, now: Date): StarEvent {
  const today = dayKey(now),
    tomorrow = dayKey(now, 1);
  const st = (p.stats[item.k] ??= { a: 0, w: 0 });
  st.a++;
  if (!ok) st.w++;
  const recent=(p.recent??={});
  recent[item.k]=[...(recent[item.k]??[]),ok].slice(-3);
  const star = p.pool.find((s) => s.k === item.k);
  if (!ok) {
    if (star) {
      star.streak = 0;
      star.due = tomorrow;
    } else p.pool.push({ k: item.k, due: tomorrow, streak: 0, added: today });
    return "lost";
  }
  if (!star || star.due > today) return null;
  star.streak++;
  star.due = tomorrow;
  if (star.streak >= GRADUATE_STREAK) {
    p.pool = p.pool.filter((s) => s !== star);
    return "home";
  }
  return "found";
}

/** 今天到期的星星，越早到期的排越前面。 */
export const dueStars = (p: PlayerIsland, today: string) => p.pool.filter((s) => s.due <= today).sort((a, b) => a.due.localeCompare(b.due));
/** 某座小島上今天到期的星星數（地圖上發光）。 */
export const dueOnIsland = (p: PlayerIsland, unit: string, today: string) => dueStars(p, today).filter((s) => GAMES[s.k]?.unit === unit).length;

/**
 * 玩一玩第 2、4 題要放的小遊戲：先放到期的星星（任何小島都算），
 * 不夠就從「已打敗守關神獸的其他小島」抽一種遊戲做抽查；還不夠就回到本單元。
 */
export function playMixKeys(p: PlayerIsland, unit: string, today: string, rand: () => number = Math.random): { k: string; why: "star" | "check" | "own" }[] {
  const out: { k: string; why: "star" | "check" | "own" }[] = dueStars(p, today)
    .filter((s) => GAMES[s.k] && unitGrade(GAMES[s.k].unit)===unitGrade(unit))
    .slice(0, PLAY_MIX_SLOTS.length)
    .map((s) => ({ k: s.k, why: "star" }));
  const checks = ISLAND_UNITS.filter((u) => u.id !== unit && unitGrade(u.id)===unitGrade(unit) && bossBeaten(p, u.id)).flatMap((u) => u.games);
  const own = UNIT_BY_ID[unit].games;
  while (out.length < PLAY_MIX_SLOTS.length) {
    const pool = checks.filter((k) => !out.some((x) => x.k === k));
    if (pool.length) out.push({ k: pool[Math.floor(rand() * pool.length)], why: "check" });
    else out.push({ k: own[Math.floor(rand() * own.length)], why: "own" });
  }
  return out;
}

export function finishStage(p: PlayerIsland, unit: string, stage: Stage, ratio: number) {
  const u = (p.units[unit] ??= {});
  if (stage === "boss") u.boss = Math.max(u.boss ?? 0, ratio);
  else u[stage] = true;
}

export function weakConcepts(p: PlayerIsland) {
  return Object.entries(p.stats)
    .filter(([, v]) => v.w > 0)
    .map(([k, v]) => ({ k, ...v, rate: v.w / v.a }))
    .sort((a, b) => b.rate - a.rate || b.w - a.w);
}

function isPlayer(x: unknown): x is PlayerIsland {
  const p = x as PlayerIsland;
  return !!p && typeof p.units === "object" && Array.isArray(p.pool) && typeof p.stats === "object" && typeof p.day === "string" && Array.isArray(p.attempted);
}
/** 舊版（一題一顆星星）轉成一種遊戲一顆：保留最早到期、連對最少的那顆。 */
function migratePool(pool: unknown[]): Star[] {
  const out: Star[] = [];
  for (const raw of pool as Record<string, any>[]) {
    const k: string | undefined = raw?.k ?? raw?.item?.k;
    if (typeof k !== "string" || typeof raw.due !== "string") continue;
    const s: Star = { k, due: raw.due, streak: Number(raw.streak) || 0, added: typeof raw.added === "string" ? raw.added : raw.due };
    const old = out.find((x) => x.k === k);
    if (!old) out.push(s);
    else {
      old.due = old.due < s.due ? old.due : s.due;
      old.streak = Math.min(old.streak, s.streak);
    }
  }
  return out;
}
export function parseSave(raw: string | null): IslandSave {
  if (!raw) return emptySave();
  const data = JSON.parse(raw) as IslandSave;
  if (data?.format !== "star-tide-island" || data.version !== 1 || typeof data.players !== "object") throw Error("數學島存檔格式不符");
  for (const [id, p] of Object.entries(data.players)) {
    if (!isPlayer(p)) throw Error(`數學島存檔中 ${id} 的資料不完整`);
    p.pool = migratePool(p.pool);
  }
  return { ...emptySave(), ...data };
}
export type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export const readIsland = (s: Storage) => parseSave(s.getItem(ISLAND_KEY));
export const writeIsland = (s: Storage, save: IslandSave) => s.setItem(ISLAND_KEY, JSON.stringify(save));
