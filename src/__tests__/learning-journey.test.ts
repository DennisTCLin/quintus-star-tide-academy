import { describe, expect, it } from "vitest";
import { newFamily } from "../adventure";
import { newTerritory, MAX_STOCK, plotCount, territoryTransition } from "../territory";
import { freshLearningRewards } from "../learning-rewards";
import { buildingGoal, materialSnapshot } from "../learning-journey";

describe("material snapshot and actionable building goals", () => {
  function profile() {
    const p = newFamily().profiles.quintus;
    p.learningRewards = { ...freshLearningRewards(), goal: "grove" };
    return p;
  }
  it("keeps unopened grants separate from spendable stock and never settles production", () => {
    const p = profile();
    p.learningRewards!.pending = { wood: 80, stone: 48, star: 24 };
    expect(materialSnapshot(p)).toEqual({ stored: { wood: 0, stone: 0, star: 0 }, pending: p.learningRewards!.pending, waiting: true });
    expect(buildingGoal(p).state).toBe("unopened");
    p.territory = newTerritory(1000);
    const before = structuredClone(p);
    expect(materialSnapshot(p).stored).toEqual({ wood: 180, stone: 150, star: 90 });
    buildingGoal(p);
    expect(p).toEqual(before);
  });
  it("does not promise building based on queued materials", () => {
    const p = profile();
    p.territory = newTerritory(1000);
    p.territory.resources = { wood: 0, stone: 0, star: 0 };
    p.learningRewards!.pending = { wood: 100, stone: 100, star: 100 };
    expect(buildingGoal(p)).toMatchObject({ state: "materials", freePlot: 1, missing: { wood: 40, stone: 20, star: 0 } });
  });
  it("distinguishes locked goals, occupied plots and a buildable free plot", () => {
    const p = profile();
    p.territory = newTerritory(1000);
    p.territory.resources = { wood: MAX_STOCK, stone: MAX_STOCK, star: MAX_STOCK };
    p.learningRewards!.goal = "academy";
    expect(buildingGoal(p).state).toBe("locked");
    p.learningRewards!.goal = "grove";
    for (let plot = 1; plot < plotCount(p.territory); plot++)
      p.territory.buildings.push({ id: plot + 1, kind: "grove", level: 1, plot, resident: null });
    expect(buildingGoal(p)).toMatchObject({ state: "full", freePlot: null });
    p.territory.buildings[4].plot = null;
    expect(buildingGoal(p)).toMatchObject({ state: "ready", freePlot: 4 });
    p.learningRewards!.goal = null;
    expect(buildingGoal(p).state).toBe("none");
  });
  it("does not leak one profile's counts or goals into another", () => {
    const p = profile();
    p.territory = newTerritory(1000);
    p.learningRewards!.pending.star = 7;
    const other = newFamily().profiles.feifei;
    expect(materialSnapshot(p).pending.star).toBe(7);
    expect(materialSnapshot(other).pending.star).toBe(0);
    expect(buildingGoal(other).target).toBeUndefined();
  });
  it("accounts for stored buildings and record limits even with free land", () => {
    const p = profile();
    p.territory = newTerritory(1000);
    p.territory.resources = { wood: MAX_STOCK, stone: MAX_STOCK, star: MAX_STOCK };
    for (let n = 0; n < 47; n++) {
      const id = p.territory.nextId;
      p.territory = territoryTransition(p.territory, { action: "build", kind: "grove", plot: 1 }, 1000, p.owned);
      p.territory = territoryTransition(p.territory, { action: "store", building: id }, 1000, p.owned);
    }
    expect(buildingGoal(p)).toMatchObject({ state: "capacity", freePlot: 1 });
    expect(() => territoryTransition(p.territory, { action: "build", kind: "grove", plot: 1 }, 1000, p.owned)).toThrow("收納空間已滿");
    p.territory.buildings.pop();
    p.territory.nextId = 1_000_000;
    expect(buildingGoal(p)).toMatchObject({ state: "capacity", freePlot: 1 });
    expect(buildingGoal(p).message).toContain("建築紀錄已達上限");
  });
});
