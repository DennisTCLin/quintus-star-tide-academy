import type { IslandRoute } from "./subject-islands";
import type { EncounterCombat } from "./creature-rules";
import { NATIVE_LEVELS } from "./creature-rules";
import type { CharacterRarity } from "./characters";
// Public progression math only. Question answers stay in the server bundle.
export const QUESTION_XP = 10;
export const MAX_COMPANION_XP = 10_000_000;
export type CompanionGrowth = { xp: Record<string, number>; day: string; credited: string[] };
export type QuizEncounter = { route?: IslandRoute; combat?: EncounterCombat; monster: number; level: number; earned: number; variant?: string };
export const MONSTERS = [
  { name: "雷雲小怪", phase: "雷雲散開了", icon: "☁️" },
  { name: "珊瑚巨蟹", phase: "巨蟹收起了大鉗", icon: "🦀" },
  { name: "星晶魔像", phase: "星晶護甲亮起了裂紋", icon: "💎" },
] as const;
export const xpForLevel = (level: number) => 25 * (level - 1) * (level + 2) / 2;
export function growthProgress(xp = 0) {
  const level = Math.max(1, Math.floor((Math.sqrt(9 + 8 * xp / 25) - 1) / 2));
  const floor = xpForLevel(level), ceiling = xpForLevel(level + 1);
  return { level, current: xp - floor, needed: ceiling - floor, remaining: ceiling - xp, percent: (xp - floor) / (ceiling - floor) * 100 };
}
/** XP remains earned practice only; acquisition never fabricates XP or unlocks. */
export function creatureProgress(rarity: CharacterRarity, xp = 0) {
  const training = growthProgress(xp);
  const baseLevel = NATIVE_LEVELS[rarity];
  return { ...training, baseLevel, trainingLevel: training.level, gainedLevels: training.level - 1, level: baseLevel + training.level - 1 };
}
export const encounterDamage = (level: number) => 20 + (level - 1) * 2;
export const completedHits = (run: { index: number; settled: boolean; answers?: boolean[] }) => run.answers ? run.answers.filter(Boolean).length : run.index + Number(run.settled);
export function legacyEncounter(id: string): QuizEncounter {
  let seed = 0;
  for (const ch of id) seed = (Math.imul(seed, 31) + ch.charCodeAt(0)) >>> 0;
  return { monster: seed % MONSTERS.length, level: 1, earned: 0 };
}
export function growthStyle(level: number) {
  return level >= 5 ? "星耀連擊" : level >= 2 ? "元素突擊" : "星光突擊";
}
export const nextGrowthStyle = (level: number) => level < 2 ? "練習提升 1 級，解鎖元素突擊" : level < 5 ? "練習提升 4 級，解鎖星耀連擊" : "每次升級，生命 +8、攻擊 +2、防禦 +1";
