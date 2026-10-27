import { describe, it, expect } from "vitest";
import {
  newTerritory,
  territoryTransition as go,
  production,
  pendingResources,
  validateTerritory,
  cityLevel,
  BUILDINGS,
  ACHIEVEMENTS,
  MAX_STOCK,
  hasSynergy,
  type Territory,
} from "../territory";
const now = 1_790_000_000_000,
  owned = { tideglow: 1 };
const act = (
  t: Territory | undefined,
  action: string,
  extra: Record<string, unknown> = {},
  time = now,
) => go(t, { action, ...extra }, time, owned);
describe("peaceful territory", () => {
  it("starts independently and repeated start never resets progress", () => {
    const t = act(undefined, "start");
    expect(t.resources).toEqual({ wood: 180, stone: 150, star: 90 });
    const b = act(t, "build", { kind: "grove", plot: 1 });
    expect(act(b, "start")).toEqual(b);
    expect(t.buildings).toHaveLength(1);
  });
  it("rejects illegal placement/spending atomically", () => {
    const t = act(undefined, "start");
    for (const command of [
      { action: "build", kind: "grove", plot: 0 },
      { action: "build", kind: "grove", plot: 8 },
      { action: "build", kind: "grove", plot: 1.1 },
      { action: "build", kind: "__proto__", plot: 1 },
      { action: "build", kind: "academy", plot: 1 },
      { action: "harvest", now: now + 1000 },
      { action: "constructor" },
    ])
      expect(() => go(t, command, now, owned)).toThrow();
    expect(t).toEqual(newTerritory(now));
  });
  it("caps offline at 8 hours and clock rollback cannot advance revenue", () => {
    const t = newTerritory(now);
    expect(pendingResources(t, now - 1)).toEqual({
      wood: 0,
      stone: 0,
      star: 0,
    });
    expect(pendingResources(t, now + 24 * 3600000)).toEqual({
      wood: 960,
      stone: 800,
      star: 480,
    });
    const a = act(t, "harvest", {}, now + 3600000);
    const b = act(a, "harvest", {}, now);
    expect(b).toEqual(a);
  });
  it("retains fractional accrual across frequent commands", () => {
    let t = newTerritory(now);
    for (let i = 1; i <= 3600; i++) t = act(t, "harvest", {}, now + i * 1000);
    expect(t.resources).toEqual(
      act(newTerritory(now), "harvest", {}, now + 3600000).resources,
    );
  });
  it("settles old rates before building, upgrade and storage", () => {
    let t = act(undefined, "start");
    t = act(t, "build", { kind: "grove", plot: 1 }, now + 3600000);
    expect(t.resources.wood).toBe(260);
    const before = t.resources.wood;
    t = act(t, "upgrade", { building: 2 }, now + 7200000);
    expect(t.resources.wood - before).toBe(
      production({
        ...t,
        buildings: t.buildings.map((b) =>
          b.id === 2 ? { ...b, level: 1 } : b,
        ),
      }).wood - 80,
    );
    const old = production(t).wood;
    t = act(t, "store", { building: 2 }, now + 10800000);
    expect(production(t).wood).toBe(120);
    expect(old).toBeGreaterThan(120);
  });
  it("moves and stores for free without resetting upgrades", () => {
    let t = act(act(undefined, "start"), "build", { kind: "garden", plot: 1 });
    t = act(t, "upgrade", { building: 2 });
    const cost = { ...t.resources };
    t = act(t, "store", { building: 2 });
    t = act(t, "move", { building: 2, plot: 3 });
    expect(t.resources).toEqual(cost);
    expect(t.buildings[1].level).toBe(2);
    expect(() => act(t, "store", { building: 1 })).toThrow();
  });
  it("applies one capped directional adjacency bonus, never diagonal or stacked", () => {
    let t = newTerritory(now);
    t.buildings.push({
      id: 2,
      kind: "quarry",
      level: 1,
      plot: 1,
      resident: null,
    });
    t.nextId = 3;
    expect(hasSynergy(t, t.buildings[1])).toBe(true);
    expect(production(t).stone).toBe(276);
    t.buildings[0].plot = 6;
    expect(hasSynergy(t, t.buildings[1])).toBe(false);
  });
  it("resident assignment requires ownership and never consumes companions", () => {
    let t = act(act(undefined, "start"), "build", { kind: "garden", plot: 1 });
    expect(() => act(t, "resident", { building: 1, pet: "unowned" })).toThrow();
    const rate = production(t);
    t = act(t, "resident", { building: 1, pet: "tideglow" });
    t = act(t, "resident", { building: 2, pet: "tideglow" });
    expect(t.buildings[0].resident).toBe(null);
    expect(t.buildings[1].resident).toBe("tideglow");
    expect(owned.tideglow).toBe(1);
    expect(production(t)).toEqual(rate);
  });
  it("claims achievements only once and bounds quantities", () => {
    let t = act(act(undefined, "start"), "build", { kind: "grove", plot: 1 });
    t = act(t, "achievement", { achievement: "settler" });
    expect(() => act(t, "achievement", { achievement: "settler" })).toThrow();
    t.resources = { wood: MAX_STOCK, stone: MAX_STOCK, star: MAX_STOCK };
    expect(act(t, "harvest", {}, now + 99999999).resources).toEqual(
      t.resources,
    );
    const corrupt = structuredClone(t);
    corrupt.buildings.push({ ...corrupt.buildings[0] });
    expect(() => validateTerritory(corrupt)).toThrow();
  });
  it("can release a full storage safely without infinite refunds", () => {
    let t = newTerritory(now),
      clock = now;
    for (let i = 0; i < 47; i++) {
      clock += 3600000;
      t = act(t, "harvest", {}, clock);
      t = act(t, "build", { kind: "grove", plot: 1 }, clock);
      t = act(t, "store", { building: t.nextId - 1 }, clock);
    }
    expect(() => act(t, "build", { kind: "garden", plot: 1 }, clock)).toThrow();
    const id = t.buildings[1].id,
      wood = t.resources.wood;
    t = act(t, "demolish", { building: id }, clock);
    expect(t.resources.wood).toBe(wood + 20);
    expect(() => act(t, "demolish", { building: id }, clock)).toThrow();
    t = act(t, "build", { kind: "garden", plot: 1 }, clock);
    expect(t.buildings[t.buildings.length - 1]?.kind).toBe("garden");
    expect(() => act(t, "demolish", { building: 1 }, clock)).toThrow();
  });
  it("reaches every building unlock and expansion through peaceful play and companion growth", () => {
    let t = newTerritory(now),
      clock = now;
    for (let i = 0; i < 350; i++) {
      clock += 3600000;
      t = act(t, "harvest", {}, clock);
      t = act(t, "commission", {}, clock);
      if (t.expansion < 2 && cityLevel(t) >= (t.expansion === 0 ? 3 : 6))
        t = go(t, {action: "expand"}, clock, owned, {tideglow:350});
    }
    expect(cityLevel(t)).toBe(10);
    expect(t.expansion).toBe(2);
    for (const [i, b] of BUILDINGS.entries())
      if (i) {
        t = act(t, "build", { kind: b.id, plot: i }, clock);
        for (let level = 2; level <= 5; level++)
          t = act(t, "upgrade", { building: t.nextId - 1 }, clock);
      }
    for (const a of ACHIEVEMENTS)
      t = act(t, "achievement", { achievement: a.id }, clock);
    expect(t.buildings).toHaveLength(16);
    expect(t.achievements).toHaveLength(6);
    expect(t.commissions).toBe(350);
  });
});
