import {
  BUILDINGS,
  RESOURCE_KEYS,
  MAX_STOCK,
  territoryTransition,
  type BuildingKind,
  type Stock,
  type Territory,
} from "./territory";

export const MATERIAL_QUESTIONS = 5;
export const LEARNING_MATERIALS: Stock = { wood: 20, stone: 12, star: 6 };
/** Bounded attribution saved with the run in the same answer transaction. */
export type RunMaterials = { credited: number; packs: number };
export type LearningRewards = {
  packs?: number;
  progress: number;
  pending: Stock;
  goal: BuildingKind | null;
};
type RewardProfile = {
  learningRewards?: LearningRewards;
  territory?: Territory;
};
export const freshLearningRewards = (): LearningRewards => ({
  progress: 0,
  pending: { wood: 0, stone: 0, star: 0 },
  goal: null,
});
export function validateLearningRewards(
  value: unknown,
): asserts value is LearningRewards {
  const s = value as LearningRewards;
  if (
    !s ||
    typeof s !== "object" ||
    (s.packs !== undefined &&
      (!Number.isSafeInteger(s.packs) || s.packs < 0)) ||
    !Number.isInteger(s.progress) ||
    s.progress < 0 ||
    s.progress >= MATERIAL_QUESTIONS ||
    !s.pending ||
    !RESOURCE_KEYS.every(
      (k) => Number.isSafeInteger(s.pending[k]) && s.pending[k] >= 0,
    ) ||
    !(
      s.goal === null ||
      BUILDINGS.some((b) => b.id === s.goal && b.id !== "hall")
    )
  )
    throw Error("學習建材資料不正確，原有進度沒有更動");
}
/** Transfer only what fits; unopened/full territory never discards earned materials. */
export function depositLearningMaterials(p: RewardProfile, now = Date.now()) {
  const s = p.learningRewards;
  if (!s || !p.territory || !RESOURCE_KEYS.some((k) => s.pending[k] > 0))
    return;
  p.territory = territoryTransition(
    p.territory,
    { action: "harvest" },
    now,
    {},
  );
  for (const k of RESOURCE_KEYS) {
    const amount = Math.min(s.pending[k], MAX_STOCK - p.territory.resources[k]);
    p.territory.resources[k] += amount;
    s.pending[k] -= amount;
  }
}
/** Called only after a server-validated, newly credited answer. */
export function awardLearningMaterials(p: RewardProfile, now = Date.now()) {
  const s = p.learningRewards ?? (p.learningRewards = freshLearningRewards());
  s.progress++;
  const completed = s.progress === MATERIAL_QUESTIONS;
  if (completed) {
    s.progress = 0;
    s.packs = (s.packs ?? 0) + 1;
    for (const k of RESOURCE_KEYS) {
      if (!Number.isSafeInteger(s.pending[k] + LEARNING_MATERIALS[k]))
        throw Error("建材數量超出可儲存範圍");
      s.pending[k] += LEARNING_MATERIALS[k];
    }
  }
  depositLearningMaterials(p, now);
  return completed;
}
export function setLearningGoal(p: RewardProfile, goal: unknown) {
  if (goal !== null && !BUILDINGS.some((b) => b.id === goal && b.id !== "hall"))
    throw Error("找不到這個建築目標");
  const s = p.learningRewards ?? (p.learningRewards = freshLearningRewards());
  s.goal = goal as BuildingKind | null;
}
