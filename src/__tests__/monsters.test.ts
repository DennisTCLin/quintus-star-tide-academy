import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { MONSTER_CATALOG, MONSTER_FAMILIES, MONSTER_FORMS, chooseMonster, monsterById, monsterEligible } from "../monsters";
import { ELEMENTS } from "../elements";
import { newFamily, validateFamily, startRun, abandonRun, answerRun, nextQuestion, claimReward } from "../adventure";
import { questionById } from "../learning";
import { MONSTERS, legacyEncounter, xpForLevel } from "../companion-growth";
import readings from "../data/interface-zhuyin.json";

describe("monster catalog and encounter persistence", () => {
  it("ships 110 distinct species while preserving legacy family forms", () => {
    expect(MONSTER_CATALOG).toHaveLength(110);
    expect(new Set(MONSTER_CATALOG.map(m => m.id)).size).toBe(110);
    expect(new Set(MONSTER_CATALOG.map(m => m.name)).size).toBe(110);
    expect(new Set(MONSTER_CATALOG.map(m => m.image)).size).toBe(110);
    for (const [family] of MONSTER_FAMILIES.entries()) {
      expect(MONSTER_CATALOG.filter(m => m.family === family)).toHaveLength(10);
      if(family<8)for (const form of MONSTER_FORMS) for (const element of ELEMENTS)
        expect(MONSTER_CATALOG.filter(m => m.family === family && m.form === form.id && m.element === element.name)).toHaveLength(1);
    }
    for (const m of MONSTER_CATALOG) expect(existsSync(`public${m.image.split("?")[0]}`), m.id).toBe(true);
  });
  it("reaches all species at eligible levels and never repeats the preceding family", () => {
    for (const level of [1, 4, 5, 20, 895]) {
      const seen = new Set<string>();
      for (const seed of Array.from({length:110},(_,i)=>[0,6500,8500,9500,9950].map(r=>i*10000+r)).flat()) {
        const m = chooseMonster(level, seed);
        expect(monsterEligible(m, level)).toBe(true);
        seen.add(m.id);
        for (const previous of [0, 1, 2]) expect(chooseMonster(level, seed, previous).family).not.toBe(previous);
      }
      expect(seen.size).toBe(level<5?40:70);
      expect([...seen].every(id => monsterById(id)?.form === (level < 5 ? "scout" : "warden"))).toBe(true);
    }
    expect(new Set([1,5].flatMap(level => Array.from({length:110},(_,i)=>[0,6500,8500,9500,9950].map(r=>chooseMonster(level,i*10000+r).id)).flat())).size).toBe(110);
  });
  it("provides complete child-facing name annotations and the Taiwanese reading of 隼", () => {
    const phrases: Record<string,string[]> = readings.phrases;
    for (const monster of MONSTER_CATALOG) expect(phrases[monster.name]).toHaveLength(monster.name.length);
    expect(readings.chars.隼).toBe("ㄓㄨㄣˇ");
    expect(phrases.金翼天隼).toEqual(["ㄐㄧㄣ","ㄧˋ","ㄊㄧㄢ","ㄓㄨㄣˇ"]);
  });
  it("retains encounter identity after save/reload and remembers it after abandoning", () => {
    let s = newFamily();
    for (let i = 0; i < 12; i++) {
      const previous = s.profiles.quintus.lastMonsterVariant;
      s.profiles.quintus.growth.xp.tideglow = xpForLevel(i % 2 ? 8 : 1);
      startRun(s, "quintus", "math", `monster-${i}`, i);
      const r = s.profiles.quintus.run!;
      expect(monsterById(r.encounter.variant)?.family).toBe(r.encounter.monster);
      expect(monsterById(r.encounter.variant)?.family).not.toBe(monsterById(previous)?.family);
      const copy = validateFamily(s);
      expect(copy).toEqual(s);
      abandonRun(copy, "quintus", r.id);
      s = validateFamily(copy);
      expect(s.profiles.quintus.lastMonsterVariant).toBe(r.encounter.variant);
      expect(s.profiles.quintus.run).toBeNull();
    }
  });
  it("keeps old v6 encounters and v5 migration on the three legacy monsters", () => {
    expect(MONSTERS).toHaveLength(3);
    const s = newFamily();
    startRun(s, "quintus", "math", "historical-run", 0);
    delete s.profiles.quintus.lastMonsterVariant;
    delete s.profiles.quintus.run!.encounter.variant;
    delete s.profiles.quintus.run!.encounter.combat;
    delete s.profiles.quintus.run!.encounter.route;
    expect(validateFamily(s)).toEqual(s);
    const old = JSON.parse(JSON.stringify(s)); old.version = 5;
    for (const p of Object.values(old.profiles) as any[]) { delete p.growth; if (p.run) delete p.run.encounter; }
    const loaded = validateFamily(old);
    expect(loaded.profiles.quintus.run!.encounter).toEqual(legacyEncounter("historical-run"));
    expect(loaded.profiles.quintus.run!.encounter.variant).toBeUndefined();
    expect(loaded.profiles.quintus.run!.reward).toBe(s.profiles.quintus.run!.reward);
    expect(validateFamily(old)).toEqual(loaded);
  });
  it("rejects unknown IDs, mismatched family, impossible form, and malformed last encounters", () => {
    const base = newFamily(); startRun(base,"quintus","math","validation",0);
    for (const invalid of [null, false, 1, "missing-monster", {}, ["cloud-scout-metal"]]) {
      const s:any = structuredClone(base); s.profiles.quintus.run.encounter.variant=invalid;
      expect(()=>validateFamily(s)).toThrow();
      const p:any = structuredClone(base); p.profiles.quintus.lastMonsterVariant=invalid;
      expect(()=>validateFamily(p)).toThrow();
    }
    const wrong = structuredClone(base); wrong.profiles.quintus.run!.encounter.variant="crab-scout-metal";
    expect(()=>validateFamily(wrong)).toThrow();
    const high = structuredClone(base); high.profiles.quintus.run!.encounter.variant="cloud-warden-metal";
    expect(()=>validateFamily(high)).toThrow();
  });
  it("keeps five correct answers out of six, XP and automatic stars valid for high-level monsters", () => {
    const s=newFamily(), p=s.profiles.quintus;
    p.growth.xp.tideglow=xpForLevel(5); const initial=p.growth.xp.tideglow;
    startRun(s,"quintus","math","complete-warden",11);
    const variant=p.run!.encounter.variant;
    for(let i=0;i<6;i++) {
      const r=p.run!, q=questionById(r.questions[r.index])!;
      answerRun(s,"quintus",r.id,r.index,i===0?(q.answer+1)%q.options.length:q.answer);
      if(i<5) nextQuestion(s,"quintus",r.id,r.index);
    }
    expect(p.run!.status).toBe("won"); expect(p.run!.encounter.earned).toBe(50);
    expect(p.growth.xp.tideglow).toBe(initial+50); expect(p.run!.reward).toBe("saved");
    const restored=validateFamily(s);
    expect(restored.profiles.quintus.run!.encounter.variant).toBe(variant);
    expect(restored.profiles.quintus.rewardStars).toBe(1);
    expect(restored.profiles.quintus.rewardStars).toBe(1);
    expect(()=>claimReward(restored,"quintus","complete-warden","save")).toThrow();
    expect(restored.profiles.quintus.growth.xp.tideglow).toBe(initial+50);
    expect(validateFamily(restored)).toEqual(restored);
  });
});
