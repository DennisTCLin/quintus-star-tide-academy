import { describe, expect, it } from "vitest";
import { newFamily, startRun, answerRun, nextQuestion, validateFamily, claimReward, buyPet } from "../adventure";
import { questionById } from "../learning";
import { MONSTER_CATALOG, chooseMonster, monsterById } from "../monsters";
import { RARITY_ORDER } from "../characters";
import { combatStats, encounterStats, baseDamage, CAPTURE_RATES } from "../creature-rules";
import { quizVitals } from "../quiz-combat";
import { ROSTER, BASE_ROSTER, companionDrawPool, newBattle, battleMove, fighterMaxHp, petSkill, petById } from "../game-view";
import { xpForLevel } from "../companion-growth";
import { territoryTransition } from "../territory";

const day = "2026-10-25";
function ready(level = 1, practice = false) {
  const s = newFamily(), p = s.profiles.quintus;
  p.growth.xp.tideglow = xpForLevel(level);
  startRun(s, "quintus", "math", "capture-run", 0, practice, day);
  delete p.run!.captureRule; // Explicit pre-upgrade fixture.
  return s;
}
function finish(s: ReturnType<typeof newFamily>, roll = 0, date = day, correctMistake = false) {
  const p = s.profiles.quintus;
  delete p.run!.captureRule; // These cases verify historical settlement.
  while (p.run!.status === "active") {
    const r = p.run!, q = questionById(r.questions[r.index])!;
    answerRun(s, "quintus", r.id, r.index, correctMistake && r.index < 2 ? (q.answer + 1) % q.options.length : q.answer, date, roll);
    if (r.status === "active") nextQuestion(s, "quintus", r.id, r.index);
  }
  return p.run!;
}

describe("shared creature stats and acquisition", () => {
  it("keeps the original draw pool while registering all eighty recruits", () => {
    const p = newFamily().profiles.quintus;
    expect(BASE_ROSTER).toHaveLength(105); expect(ROSTER).toHaveLength(215);
    expect(companionDrawPool(p)).toHaveLength(104);
    for (const m of MONSTER_CATALOG) {
      expect(petById(m.id)?.rarity).toBe(m.rarity);
      expect(companionDrawPool(p).some(pet => pet.id === m.id)).toBe(false);
    }
    p.coins = 99999;
    const s = newFamily(); s.profiles.quintus = p;
    expect(() => buyPet(s, "quintus", MONSTER_CATALOG[0].id, "buy", day)).toThrow();
  });
  it("makes rare wild tiers less frequent regardless of species count", () => {
    const counts: Record<string, number> = {};
    for (let seed = 0; seed < 10000; seed++) { const m = chooseMonster(5, seed); counts[m.rarity] = (counts[m.rarity] ?? 0) + 1; }
    expect(counts).toEqual({B:7500,A:2400,S:100});
  });
  it("grows all three stats, caps accepted levels and bounds rarity bonuses", () => {
    expect(combatStats("E", 1)).toEqual({ level: 1, hp: 100, attack: 22, defense: 8 });
    expect(combatStats("E", 2)).toEqual({ level: 2, hp: 108, attack: 24, defense: 9 });
    expect(combatStats("SSS", 1)).toEqual({ level: 1, hp: 142, attack: 36, defense: 15 });
    for (const rarity of RARITY_ORDER) expect(Object.values(combatStats(rarity, 1000)).every(Number.isSafeInteger)).toBe(true);
    for (const n of [0, -1, 1.1, NaN, Infinity, 1001]) expect(() => combatStats("E", n)).toThrow();
    expect(baseDamage(combatStats("E", 1), combatStats("SSS", 1000))).toBe(1);
  });
  it("uses actual attack/defense, max HP, healing caps and frozen arena levels", () => {
    const b = newBattle(["tideglow"], ["foamferret"], "cpu", [{ tideglow: xpForLevel(10) }, {}]);
    const a = b.teams[0][0], d = b.teams[1][0];
    expect(a.stats!.level).toBe(10); expect(a.hp).toBe(172);
    const low = newBattle(["tideglow"], ["foamferret"], "cpu");
    expect(battleMove(b, "attack").event!.amount).toBeGreaterThan(battleMove(low, "attack").event!.amount);
    const defended = structuredClone(b); defended.teams[1][0].stats!.defense += 8;
    expect(battleMove(b, "attack").event!.amount - battleMove(defended, "attack").event!.amount).toBe(4);
    a.hp = 171; a.energy = 2;
    expect(battleMove(b, "heal").event!.amount).toBe(1);
    expect(battleMove(b, "heal").teams[0][0].hp).toBe(fighterMaxHp(a));
    expect(d.hp).toBe(100); expect(a.stats!.level).toBe(10);
  });
  it("uses independent monster HP, keeps stats fixed after XP and finishes six answers", () => {
    const s = ready(), r = s.profiles.quintus.run!, before = structuredClone(r.encounter.combat);
    const hp = quizVitals(r).max;
    const stronger = structuredClone(r); stronger.encounter.combat!.ally.attack += 10;
    expect(quizVitals(stronger, 0).max).toBe(hp);
    expect(quizVitals(stronger, 1).hp).toBeLessThan(quizVitals(r, 1).hp);
    stronger.encounter.combat!.ally.attack = 10000;
    expect(quizVitals(stronger, 1).hp).toBe(1);
    expect(stronger.status).toBe("active"); expect(stronger.capture).toBeUndefined();
    expect(quizVitals(r, 5).hp).toBeGreaterThan(0);
    finish(s); expect(r.encounter.combat).toEqual(before); expect(validateFamily(s)).toEqual(s);
  });
});

describe("persisted legacy probability capture settlement", () => {
  it("grants four-of-six wins once and survives validation/reload", () => {
    const s = ready(), p = s.profiles.quintus, r = finish(s, 0, day, true), monster = r.encounter.variant!;
    expect(r.capture).toMatchObject({ outcome: "joined", monster, copies: 1 });
    expect(p.captureQuota).toEqual({ day, attempts: 1 }); expect(p.owned[monster]).toBe(1);
    expect(p.firstAcquired[monster]).toBe(day); expect(p.growth.xp[monster]).toBeUndefined();
    expect(r.encounter.earned).toBe(40); expect(r.status).toBe("won");
    expect(validateFamily(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(() => answerRun(s, "quintus", r.id, 4, questionById(r.questions[4])!.answer, day, 0)).toThrow();
    expect(p.owned[monster]).toBe(1);
  });
  it("preserves duplicate levels and caps ownership without invalidating a win", () => {
    for (const count of [1, 10000]) {
      const s = ready(), p = s.profiles.quintus, monster = p.run!.encounter.variant!;
      p.owned[monster] = count; p.firstAcquired[monster] = "2026-10-24"; p.growth.xp[monster] = 125;
      const r = finish(s);
      expect(p.owned[monster]).toBe(Math.min(count + 1, 10000)); expect(p.growth.xp[monster]).toBe(125);
      expect(r.capture).toMatchObject(count === 1 ? { outcome: "duplicate", copies: 2 } : { outcome: "unavailable", reason: "capacity" });
      expect(p.captureQuota!.attempts).toBe(1); expect(validateFamily(s)).toEqual(s);
    }
  });
  it("uses strict probability boundaries for every monster rarity", () => {
    for (const m of MONSTER_CATALOG) for (const succeeds of [true, false]) {
      const s = ready(m.form === "scout" ? 1 : 5), r = s.profiles.quintus.run!;
      r.encounter.variant = m.id; r.encounter.monster = m.family;
      r.encounter.combat!.foe = encounterStats(2, m.rarity, r.encounter.level);
      finish(s, CAPTURE_RATES[m.rarity] / 100 - (succeeds ? .00001 : 0));
      expect(r.capture!.outcome).toBe(succeeds ? "joined" : "escaped");
      expect(s.profiles.quintus.captureQuota!.attempts).toBe(1);
    }
  });
  it.each(["practice", "old-day", "legacy"] as const)("does not award ineligible %s runs", reason => {
    const s = ready(1, reason === "practice"), p = s.profiles.quintus;
    if (reason === "legacy") { delete p.run!.encounter.combat; delete p.run!.encounter.route; }
    const before = structuredClone(p.owned), r = finish(s, 0, reason === "old-day" ? "2026-10-26" : day);
    expect(r.capture).toMatchObject({ outcome: "unavailable", reason }); expect(p.owned).toEqual(before);
    expect(p.captureQuota?.attempts ?? 0).toBe(0);
    expect(validateFamily(s)).toEqual(s);
  });
  it("retains fixed odds after three attempts and tracks the next server day", () => {
    const s = ready(), p = s.profiles.quintus;
    for (let i = 0; i < 4; i++) {
      if (i) startRun(s, "quintus", "math", `repeat-${i}`, i, false, day);
      const r = finish(s, .99);
      expect(r.capture!.outcome).toBe("escaped");
      if (r.reward === "pending") claimReward(s, "quintus", r.id, "save");
    }
    expect(p.captureQuota!.attempts).toBe(4);
    startRun(s, "quintus", "math", "tomorrow", 2, false, "2026-10-26");
    finish(s, 0, "2026-10-26"); expect(p.captureQuota).toEqual({ day: "2026-10-26", attempts: 1 });
  });
  it("recruits can equip, grow, battle and join the territory", () => {
    const s = ready(), p = s.profiles.quintus, r = finish(s), monster = r.encounter.variant!;
    p.equipped = monster; expect(p.equipped).toBe(monster);
    startRun(s, "quintus", "math", "new-companion", 20, false, day);
    finish(s, .99); expect(p.growth.xp[monster]).toBe(60);
    const battle = newBattle([monster], ["tideglow"], "cpu", [p.growth.xp, {}]);
    expect(battle.teams[0][0].stats!.level).toBe(2); expect(petSkill(monster)).toBe("focus");
    expect(battleMove(battle, "attack").event!.amount).toBeGreaterThan(0);
    const territory = territoryTransition(undefined, { action: "start" }, Date.now(), p.owned);
    const assigned = territoryTransition(territory, { action: "resident", building: 1, pet: monster }, Date.now(), p.owned);
    expect(assigned.buildings[0].resident).toBe(monster); expect(validateFamily(s)).toEqual(s);
  });
  it("rejects malformed quotas, stats and fabricated outcome formats", () => {
    const s = ready();
    for (const n of [-1, 10000001, .5, NaN]) { const bad = structuredClone(s); bad.profiles.quintus.captureQuota = { day, attempts: n }; expect(() => validateFamily(bad)).toThrow(); }
    const bad = structuredClone(s); bad.profiles.quintus.run!.encounter.combat!.ally.hp = 9999;
    expect(() => validateFamily(bad)).toThrow();
    const premature = ready(); premature.profiles.quintus.run!.capture = { monster: premature.profiles.quintus.run!.encounter.variant!, chance: 30, outcome: "escaped" };
    expect(() => validateFamily(premature)).toThrow();
  });
});
