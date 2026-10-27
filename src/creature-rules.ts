import type { CaptureTrial } from "./capture-trial";
import { RARITY_ORDER, type CharacterRarity } from "./characters";

export type CombatStats = { level: number; hp: number; attack: number; defense: number };
export type EncounterCombat = { version: 1 | 2; ally: CombatStats; foe: CombatStats };
export const NATIVE_LEVELS: Readonly<Record<CharacterRarity, number>> = Object.freeze({ E: 1, D: 5, C: 10, B: 15, A: 20, S: 30, SS: 40, SSS: 50 });
const LEGACY_CAPTURE_RATES: Readonly<Record<CharacterRarity, number>> = { E: 30, D: 24, C: 18, B: 12, A: 9, S: 6, SS: 4, SSS: 2 };
export const CAPTURE_RATES: Readonly<Record<CharacterRarity, number>> = Object.freeze({ E: 30, D: 24, C: 18, B: 12, A: 9, S: 2, SS: 1, SSS: 0.5 });
/** Absent version belongs to already-settled historical receipts. Never rewrite them. */
export function validCaptureRate(value: { version?: unknown; chance?: unknown }, rarity: CharacterRarity): boolean {
  return value.version === undefined ? value.chance === LEGACY_CAPTURE_RATES[rarity]
    : value.version === 3 ? value.chance === 100 : value.version === 2 && value.chance === CAPTURE_RATES[rarity];
}
export type CaptureOutcome = {
  version?: 2 | 3;
  trial?: CaptureTrial;
  monster: string; chance: number;
  outcome: "pending" | "joined" | "duplicate" | "escaped" | "unavailable";
  reason?: "practice" | "old-day" | "daily-limit" | "legacy" | "capacity";
  copies?: number;
};

// Version 1 is immutable: existing voyages retain these values through level-ups.
export function combatStats(rarity: CharacterRarity, level: number): CombatStats {
  const rank = RARITY_ORDER.indexOf(rarity);
  if (rank < 0 || !Number.isInteger(level) || level < 1 || level > 1000) throw Error("能力等級無效");
  return { level, hp: 100 + rank * 6 + (level - 1) * 8, attack: 22 + rank * 2 + (level - 1) * 2, defense: 8 + rank + level - 1 };
}

/** V2: native strength is bounded separately from earned training. Never change V1 above. */
export function nativeCombatStats(rarity: CharacterRarity, level: number): CombatStats {
  const rank = RARITY_ORDER.indexOf(rarity);
  const trained = level - NATIVE_LEVELS[rarity];
  if (rank < 0 || !Number.isInteger(trained) || trained < 0 || trained > 999) throw Error("能力等級無效");
  return { level, hp: 100 + rank * 12 + trained * 8, attack: 22 + rank * 3 + trained * 2, defense: 8 + rank * 2 + trained };
}

export function encounterStats(version: 1 | 2, rarity: CharacterRarity, trainingLevel: number): CombatStats {
  return version === 1 ? combatStats(rarity, trainingLevel) : nativeCombatStats(rarity, NATIVE_LEVELS[rarity] + trainingLevel - 1);
}

export const baseDamage = (attacker: CombatStats, defender: CombatStats) => Math.max(1, attacker.attack - Math.floor(defender.defense / 2));
export function sameStats(value: unknown, expected: CombatStats): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as CombatStats;
  return v.level === expected.level && v.hp === expected.hp && v.attack === expected.attack && v.defense === expected.defense;
}

export const CAPTURE_SKIP_TEXT = {
  practice: "練習航程不使用降服機會。",
  "old-day": "這是先前日期的航程，開始新航程才有降服機會。",
  "daily-limit": "這是舊版已結算的結果。新挑戰每次成功都有降服機會。",
  legacy: "這趟沿用先前的戰鬥規則，下一趟開始就能降服怪物。",
  capacity: "這種夥伴的卡片已達上限，這次沒有增加卡片。",
};
