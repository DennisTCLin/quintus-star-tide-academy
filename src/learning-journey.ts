import type { Profile } from "./game-view";
import { buildingSpec, cityLevel, plotCount, RESOURCE_KEYS, type BuildingKind, type Stock } from "./territory";

const EMPTY: Stock = { wood: 0, stone: 0, star: 0 };
export type GoalRequest = { goal: BuildingKind | null; nonce: number };

/** Snapshot-only projection. No production estimate, settlement, timer or fetch. */
export function materialSnapshot(profile: Profile) {
  const stored = profile.territory?.resources ?? EMPTY;
  const pending = profile.learningRewards?.pending ?? EMPTY;
  return { stored, pending, waiting: RESOURCE_KEYS.some(key => pending[key] > 0) };
}

export function buildingGoal(profile: Profile) {
  const target = buildingSpec(profile.learningRewards?.goal);
  const territory = profile.territory;
  const { stored, pending } = materialSnapshot(profile);
  const level = territory ? cityLevel(territory) : 1;
  const freePlot = territory
    ? Array.from({ length: plotCount(territory) }, (_, plot) => plot)
      .find(plot => !territory.buildings.some(b => b.plot === plot)) ?? null
    : null;
  const missing = Object.fromEntries(RESOURCE_KEYS.map(key => [key,
    Math.max(0, (target?.cost[key] ?? 0) - stored[key]),
  ])) as Stock;
  const state = !territory ? "unopened" : !target ? "none"
    : target.unlock > level ? "locked"
    : territory.buildings.length >= 48 || territory.nextId >= 1_000_000 ? "capacity"
    : freePlot === null ? "full"
    : RESOURCE_KEYS.some(key => missing[key] > 0) ? "materials" : "ready";
  const message = state === "unopened" ? "先開啟領地，已獲得的建材會自動入庫。"
    : state === "none" ? "選一座喜歡的建築，讓學習有個小目標。"
    : state === "locked" ? `需要領地 ${target!.unlock} 級；建材可以先存好。`
    : state === "capacity" ? territory!.nextId >= 1_000_000
      ? "建築紀錄已達上限，可以移動或升級現有建築。"
      : "建築總數已達上限；先到收納屋整理不需要的建築。"
    : state === "full" ? "目前沒有空地，可以擴建或收納建築。"
    : state === "materials" ? "建材還在累積中；學習、生產和委託都能補齊。"
    : "庫存已足夠，選個位置就能建造。";
  const action = state === "unopened" ? "開啟我的領地"
    : state === "none" ? "選擇建造目標"
    : state === "locked" ? "查看解鎖條件"
    : state === "capacity" ? "查看收納與現有建築"
    : state === "full" ? "查看領地空間"
    : state === "materials" ? "查看所需建材" : "前往建造目標";
  return { target, level, freePlot, stored, pending, missing, state, message, action };
}
