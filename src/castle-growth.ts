import { MAX_COMPANION_XP, xpForLevel } from "./companion-growth";

export const CASTLE_STYLES = [
  { id: "star-tide", name: "星潮", description: "星形尖塔，迎接每一次出航。", roof: "#398fba", light: "#9ddbe5", emblem: "star" },
  { id: "moon-bay", name: "月灣", description: "月牙圓頂，收藏安靜的星光。", roof: "#766bb0", light: "#c6b8ea", emblem: "moon" },
  { id: "coral", name: "珊瑚", description: "珊瑚階塔，像海底的花園。", roof: "#c66c70", light: "#f3baa2", emblem: "coral" },
  { id: "forest", name: "森語", description: "葉冠屋頂，和花樹一起長大。", roof: "#3f8772", light: "#a4d6ac", emblem: "leaf" },
  { id: "cloud-sail", name: "雲帆", description: "白帆高塔，向雲海出發。", roof: "#477e9c", light: "#e3f2e7", emblem: "sail" },
  { id: "dawn", name: "晨光", description: "日輪拱頂，迎接暖暖的早晨。", roof: "#bf8742", light: "#f8db89", emblem: "sun" },
] as const;
export type CastleStyleId = (typeof CASTLE_STYLES)[number]["id"];
export const castleStyle = (id?: string) => CASTLE_STYLES.find(s => s.id === id) ?? CASTLE_STYLES[0];
export const isCastleStyle = (id: unknown): id is CastleStyleId => typeof id === "string" && CASTLE_STYLES.some(s => s.id === id);

// Add future stages here together with map geometry and migration coverage.
// Capacity is persisted as expansion; eligibility never recalculates earned land.
export const CASTLE_STAGES = [
  { name: "星海小堡", plots: 8, companionLevel: 1, detail: "一座小堡，開始我們的家。" },
  { name: "雙翼城堡", plots: 16, companionLevel: 2, detail: "長出兩側城翼，多 8 塊土地。" },
  { name: "星海大城", plots: 24, companionLevel: 5, detail: "添上守望塔與花園，再多 8 塊土地。" },
] as const;
export const MAX_CASTLE_EXPANSION = CASTLE_STAGES.length - 1;
export const MAX_TERRITORY_PLOTS = CASTLE_STAGES[MAX_CASTLE_EXPANSION].plots;
export const castleStage = (expansion: number) => CASTLE_STAGES[Math.min(MAX_CASTLE_EXPANSION, Math.max(0, Math.floor(expansion)))];
export function castleGrowth(expansion: number, xp: Readonly<Record<string, number>>) {
  const best = Object.entries(xp).filter(([, n]) => Number.isSafeInteger(n) && n >= 0 && n <= MAX_COMPANION_XP)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const next = CASTLE_STAGES[expansion + 1];
  const required = next ? xpForLevel(next.companionLevel) : 0;
  const earned = best?.[1] ?? 0;
  return { next, earned, companionId: best?.[0], required, remaining: Math.max(0, required - earned), eligible: !!next && earned >= required };
}
