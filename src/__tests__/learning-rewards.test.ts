import {startAfterDecliningCapture} from './helpers/capture';
import { describe, it, expect } from "vitest";
import {
  newFamily,
  validateFamily,
  startRun,
  answerRun,
  nextQuestion,
  abandonRun,
  claimReward,
} from "../adventure";
import { questionById, questionCapacity } from "../learning";
import {
  awardLearningMaterials,
  depositLearningMaterials,
  freshLearningRewards,
  setLearningGoal,
  validateLearningRewards,
} from "../learning-rewards";
import { newTerritory, territoryTransition, MAX_STOCK } from "../territory";
import { MAX_COMPANION_XP } from "../companion-growth";
const day = "2026-10-25";
function answer(s: ReturnType<typeof newFamily>, date = day) {
  const r = s.profiles.quintus.run!,
    q = questionById(r.questions[r.index])!;
  answerRun(s, "quintus", r.id, r.index, q.answer, date);
}
describe("learning to building rewards", () => {
  it("old saves preserve all data and do not retroactively issue packs", () => {
    const s = newFamily(),
      p = s.profiles.quintus;
    p.coins = 333;
    p.tickets = 7;
    p.growth.xp[p.equipped] = 120;
    const before = structuredClone(s);
    expect(validateFamily(s)).toEqual(before);
    expect(p.learningRewards).toBeUndefined();
  });
  it("fifth newly credited answer earns exactly one pack; errors and duplicate clicks cannot count", () => {
    const s = newFamily(),
      p = s.profiles.quintus;
    startAfterDecliningCapture(s, "quintus", "math", "r", 1, false, day);
    for (let i = 0; i < 5; i++) {
      const r = p.run!,
        q = questionById(r.questions[i])!;
      expect(p.learningRewards?.progress ?? 0).toBe(i);
      r.assisted = true;
      r.review[i] = true;
      answer(s);
      expect(() => answer(s)).toThrow();
      if (i < 4) nextQuestion(s, "quintus", "r", i);
    }
    expect(p.growth.xp[p.equipped]).toBe(50);
    expect(p.learningRewards).toEqual({
      progress: 0,
      packs: 1,
      pending: { wood: 20, stone: 12, star: 6 },
      goal: null,
    });
    expect(p.territory).toBeUndefined();
    expect(p.run!.materials).toEqual({ credited: 5, packs: 1 });
  });
  it("partial pack carries across days; practice and a stale voyage grant neither reward", () => {
    const s = newFamily(),
      p = s.profiles.quintus;
    startAfterDecliningCapture(s, "quintus", "math", "r", 1, false, day);
    answer(s);
    nextQuestion(s, "quintus", "r", 0);
    answer(s);
    abandonRun(s, "quintus", "r");
    expect(p.learningRewards!.progress).toBe(2);
    startAfterDecliningCapture(s, "quintus", "math", "practice", 1, true, day);
    answer(s);
    expect(p.learningRewards!.progress).toBe(2);
    expect(p.run!.materials).toEqual({ credited: 0, packs: 0 });
    abandonRun(s, "quintus", "practice");
    startAfterDecliningCapture(s, "quintus", "math", "stale", 1, false, day);
    answer(s, "2026-10-26");
    expect(p.learningRewards!.progress).toBe(2);
    expect(p.run!.materials).toEqual({ credited: 0, packs: 0 });
    abandonRun(s, "quintus", "stale");
    startAfterDecliningCapture(s, "quintus", "math", "new", 1, false, "2026-10-26");
    for (let i = 0; i < 3; i++) {
      answer(s, "2026-10-26");
      if (i < 2) nextQuestion(s, "quintus", "new", i);
    }
    expect(p.learningRewards!.pending).toEqual({
      wood: 20,
      stone: 12,
      star: 6,
    });
  });
  it("same question across new voyage cannot recredit XP or building progress", () => {
    const s = newFamily(),
      p = s.profiles.quintus;
    startAfterDecliningCapture(s, "quintus", "math", "r", 1, false, day);
    const q = p.run!.questions[0];
    answer(s);
    abandonRun(s, "quintus", "r");
    startAfterDecliningCapture(s, "quintus", "math", "again", 2, false, day);
    p.run!.questions[0] = q;
    answer(s);
    expect(p.learningRewards!.progress).toBe(1);
    expect(p.growth.xp[p.equipped]).toBe(10);
    expect(p.run!.materials).toEqual({ credited: 0, packs: 0 });
  });
  it("attributes a carried pack at capped XP, surviving reload and territory changes", () => {
    const s = newFamily(), p = s.profiles.quintus;
    p.growth.xp[p.equipped] = MAX_COMPANION_XP;
    p.learningRewards = { ...freshLearningRewards(), progress: 4 };
    startAfterDecliningCapture(s, "quintus", "math", "capped", 2, false, day);
    answer(s);
    expect(p.run!.encounter.earned).toBe(0);
    expect(p.run!.materials).toEqual({ credited: 1, packs: 1 });
    const loaded = validateFamily(JSON.parse(JSON.stringify(s)));
    expect(loaded.profiles.quintus.run!.materials).toEqual({ credited: 1, packs: 1 });
    p.territory = newTerritory(1000);
    depositLearningMaterials(p);
    expect(p.run!.materials).toEqual({ credited: 1, packs: 1 });
    expect(() => answer(s)).toThrow();
    expect(p.run!.materials).toEqual({ credited: 1, packs: 1 });
  });
  it("leaves older runs unattributed instead of inventing historical earnings", () => {
    const s = newFamily(), p = s.profiles.quintus;
    startAfterDecliningCapture(s, "quintus", "math", "legacy", 2, false, day);
    delete p.run!.materials;
    answer(s);
    expect(validateFamily(s).profiles.quintus.run!.materials).toBeUndefined();
    expect(p.learningRewards!.progress).toBe(1);
  });
  it("six correct answers can complete two carried packs without rewarding the same answer twice", () => {
    const s = newFamily(), p = s.profiles.quintus;
    p.learningRewards = { ...freshLearningRewards(), progress: 4 };
    startAfterDecliningCapture(s, "quintus", "math", "six-packs", 2, false, day);
    for (let i = 0; i < 6; i++) {
      answer(s);
      expect(() => answer(s)).toThrow();
      if (i < 5) nextQuestion(s, "quintus", "six-packs", i);
    }
    expect(p.run!.status).toBe("won");
    expect(p.run!.materials).toEqual({ credited: 6, packs: 2 });
    expect(p.learningRewards!.pending).toEqual({ wood: 40, stone: 24, star: 12 });
    expect(validateFamily(s).profiles.quintus.run!.materials).toEqual(p.run!.materials);
  });
  it("a third cumulative mistake preserves earned materials but cannot earn completion rewards", () => {
    const s = newFamily(), p = s.profiles.quintus;
    p.learningRewards = { ...freshLearningRewards(), progress: 4 };
    startAfterDecliningCapture(s, "quintus", "math", "failed-packs", 2, false, day);
    for (const [i, correct] of [false, true, false, true, false].entries()) {
      const q = questionById(p.run!.questions[i])!;
      answerRun(s, "quintus", "failed-packs", i, correct ? q.answer : (q.answer + 1) % q.options.length, day);
      if (i < 4) nextQuestion(s, "quintus", "failed-packs", i);
    }
    expect(p.run!.status).toBe("failed");
    expect(p.run!.reward).toBe("none");
    expect(p.run!.materials).toEqual({ credited: 2, packs: 1 });
    expect(p.learningRewards!.progress).toBe(1);
    expect(p.learningRewards!.pending).toEqual({ wood: 20, stone: 12, star: 6 });
    expect(validateFamily(s).profiles.quintus.run!.materials).toEqual(p.run!.materials);
    p.run!.materials = { credited: 3, packs: 1 };
    expect(() => validateFamily(s)).toThrow();
    p.run!.materials = { credited: 2, packs: 2 };
    expect(() => validateFamily(s)).toThrow();
  });
  it("rejects impossible per-run material receipts", () => {
    for (const materials of [{ credited: 6, packs: 1 }, { credited: 0, packs: 1 }, { credited: 1, packs: 2 }, { credited: -1, packs: 0 }, { credited: 0.5, packs: 0 }]) {
      const s = newFamily();
      startAfterDecliningCapture(s, "quintus", "math", "invalid", 2, false, day);
      s.profiles.quintus.run!.materials = materials;
      expect(() => validateFamily(s)).toThrow();
    }
  });
  it("waiting materials survive unopened territory and transfer once on opening", () => {
    const p = newFamily().profiles.quintus;
    for (let i = 0; i < 10; i++) awardLearningMaterials(p, 1000);
    expect(p.learningRewards!.pending).toEqual({
      wood: 40,
      stone: 24,
      star: 12,
    });
    p.territory = newTerritory(1000);
    depositLearningMaterials(p, 1000);
    expect(p.territory.resources).toEqual({ wood: 220, stone: 174, star: 102 });
    depositLearningMaterials(p, 1000);
    expect(p.territory.resources.wood).toBe(220);
  });
  it("partly full warehouses retain exact overflow and settle old production first", () => {
    const p = newFamily().profiles.quintus;
    p.territory = newTerritory(1000);
    p.territory.resources = {
      wood: MAX_STOCK - 5,
      stone: MAX_STOCK,
      star: MAX_STOCK - 1,
    };
    p.learningRewards = {
      ...freshLearningRewards(),
      pending: { wood: 20, stone: 12, star: 6 },
    };
    depositLearningMaterials(p, 1000);
    expect(p.territory.resources).toEqual({
      wood: MAX_STOCK,
      stone: MAX_STOCK,
      star: MAX_STOCK,
    });
    expect(p.learningRewards.pending).toEqual({ wood: 15, stone: 12, star: 5 });
    p.territory = territoryTransition(
      p.territory,
      { action: "build", kind: "grove", plot: 1 },
      1000,
      {},
    );
    depositLearningMaterials(p, 1000);
    expect(p.learningRewards.pending).toEqual({ wood: 0, stone: 0, star: 5 });
    expect(p.territory.resources.wood).toBe(MAX_STOCK - 25);
  });
  it("goal persists and costs nothing, including future unlocked buildings", () => {
    const p = newFamily().profiles.quintus;
    p.territory = newTerritory(1000);
    const old = structuredClone(p.territory);
    setLearningGoal(p, "academy");
    expect(p.learningRewards!.goal).toBe("academy");
    expect(p.territory).toEqual(old);
    expect(() => setLearningGoal(p, "hall")).toThrow();
    expect(() => setLearningGoal(p, {})).toThrow();
    setLearningGoal(p, null);
    expect(p.learningRewards!.goal).toBeNull();
  });
  it("rejects corrupted rewards and catalog bounds are larger than the former quota", () => {
    for (const pending of [-1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1])
      expect(() =>
        validateLearningRewards({
          progress: 0,
          pending: { wood: pending, stone: 0, star: 0 },
          goal: null,
        }),
      ).toThrow();
    expect(() =>
      validateLearningRewards({
        progress: 5,
        pending: { wood: 0, stone: 0, star: 0 },
        goal: null,
      }),
    ).toThrow();
    for (const grade of [1, 2, 4] as const)
      expect(questionCapacity(grade)).toBeGreaterThan(15);
  });
  it("twenty-four correct answers keep earning coins, learning and completion rewards", () => {
    const s = newFamily(),
      p = s.profiles.quintus;
    for (let j = 0; j < 4; j++) {
      startAfterDecliningCapture(s, "quintus", "math", "r" + j, j, false, day);
      for (let i = 0; i < 6; i++) {
        answer(s);
        if (i < 5) nextQuestion(s, "quintus", "r" + j, i);
      }
      if (p.run!.reward === "pending")
        claimReward(s, "quintus", "r" + j, "save", 0);
    }
    expect(p.growth.credited).toHaveLength(24);
    expect(p.growth.xp[p.equipped]).toBe(240);
    expect(p.credited.length).toBe(24);
    expect(p.rewardRounds).toBe(4);
    expect(p.learningRewards!.pending.wood).toBe(80);
    expect(validateFamily(s)).toEqual(s);
  });
});
