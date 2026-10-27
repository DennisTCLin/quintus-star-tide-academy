import { describe, it, expect } from "vitest";
import { RARITY_ORDER } from "../characters";
import { NATIVE_LEVELS, nativeCombatStats, combatStats, encounterStats, baseDamage } from "../creature-rules";
import { creatureProgress, growthProgress, MAX_COMPANION_XP, xpForLevel } from "../companion-growth";
import { newFamily, startRun, validateFamily, answerRun, nextQuestion } from "../adventure";
import { ROSTER, petById, newBattle, chooseCpuTeam, companionDrawPool } from "../game-view";
import { monsterById } from "../monsters";
import { questionById } from "../learning";
import { castleGrowth } from "../castle-growth";

const day = "2026-10-25";
function rareFamily(xp = 0) {
  const s = newFamily(), p = s.profiles.quintus;
  p.owned.astraltide = 1; p.equipped = "astraltide"; p.growth.xp.astraltide = xp;
  p.firstAcquired.astraltide = day;
  return s;
}
describe("native creature strength without fabricated learning", () => {
  it("starts each rarity at its native level and gives SSS stronger initial stats", () => {
    expect(RARITY_ORDER.map(r => creatureProgress(r).level)).toEqual([1,5,10,15,20,30,40,50]);
    expect(nativeCombatStats("SSS", 50)).toEqual({ level:50, hp:184, attack:43, defense:22 });
    expect(combatStats("SSS", 1)).toEqual({ level:1, hp:142, attack:36, defense:15 });
    for (let i=1;i<RARITY_ORDER.length;i++) {
      const a=encounterStats(2,RARITY_ORDER[i-1],1), b=encounterStats(2,RARITY_ORDER[i],1);
      for (const k of ["level","hp","attack","defense"] as const) expect(b[k]).toBeGreaterThan(a[k]);
    }
  });
  it("keeps earned XP and reachable next-level milestones, including max XP", () => {
    for (const r of RARITY_ORDER) for (const xp of [0,49,50,124,125,MAX_COMPANION_XP]) {
      const p=creatureProgress(r,xp), g=growthProgress(xp);
      expect(p.level).toBe(NATIVE_LEVELS[r]+g.level-1);
      expect([p.current,p.needed,p.remaining,p.percent]).toEqual([g.current,g.needed,g.remaining,g.percent]);
      expect(p.trainingLevel).toBe(g.level);
      expect(Object.values(nativeCombatStats(r,p.level)).every(Number.isSafeInteger)).toBe(true);
    }
    expect(creatureProgress("SSS",50).level).toBe(51);
    for (const level of [49,50.5,NaN,Infinity,1050]) expect(()=>nativeCombatStats("SSS",level)).toThrow();
    expect(nativeCombatStats("SSS",1049).level).toBe(1049);
  });
  it("does not grant castle expansion or modify XP just for possessing a rare pet", () => {
    const s=rareFamily(), before=structuredClone(s.profiles.quintus.growth);
    expect(creatureProgress("SSS",0).level).toBe(50);
    expect(castleGrowth(0,s.profiles.quintus.growth.xp).eligible).toBe(false);
    expect(validateFamily(s).profiles.quintus.growth).toEqual(before);
    expect(companionDrawPool(s.profiles.quintus)).toHaveLength(104);
    expect(ROSTER).toHaveLength(215);
  });
  it("versions new voyages, preserves earned encounter tier, and freezes both stats", () => {
    const s=rareFamily(), p=s.profiles.quintus;
    startRun(s,"quintus","math","native-run",0,false,day);
    const r=p.run!, snapshot=structuredClone(r.encounter.combat);
    expect(r.encounter.level).toBe(1);
    expect(r.encounter.combat?.version).toBe(2);
    expect(r.encounter.combat?.ally.level).toBe(50);
    expect(r.encounter.combat?.foe.level).toBe(NATIVE_LEVELS[monsterById(r.encounter.variant)!.rarity]);
    while(r.status==="active") {
      const q=questionById(r.questions[r.index])!;
      answerRun(s,"quintus",r.id,r.index,q.answer,day,0.99);
      if(r.status==="active")nextQuestion(s,"quintus",r.id,r.index);
    }
    expect(r.status).toBe("won"); expect(r.questions).toHaveLength(6);
    expect(r.encounter.combat).toEqual(snapshot);
    expect(p.growth.xp.astraltide).toBeGreaterThan(0);
    expect(validateFamily(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("round-trips v1 without changing its stats and rejects corrupted v1/v2 snapshots", () => {
    for (const version of [1,2] as const) {
      const s=rareFamily(125); startRun(s,"quintus","math",`snapshot-${version}`,7,false,day);
      const r=s.profiles.quintus.run!, foe=monsterById(r.encounter.variant)!;
      r.encounter.combat={version,ally:encounterStats(version,"SSS",r.encounter.level),foe:encounterStats(version,foe.rarity,r.encounter.level)};
      expect(validateFamily(JSON.parse(JSON.stringify(s)))).toEqual(s);
      for (const side of ["ally","foe"] as const) for(const key of ["level","hp","attack","defense"] as const) {
        const bad=structuredClone(s); bad.profiles.quintus.run!.encounter.combat![side][key]++;
        expect(()=>validateFamily(bad)).toThrow();
      }
      const bad=structuredClone(s); (bad.profiles.quintus.run!.encounter.combat as {version:number}).version=3;
      expect(()=>validateFamily(bad)).toThrow();
    }
  });
  it("preserves three wrong failure even with innate SSS strength", () => {
    const s=rareFamily();startRun(s,"quintus","math","rare-mistakes",1,false,day);
    const r=s.profiles.quintus.run!;
    for(let i=0;i<3;i++) {
      const q=questionById(r.questions[r.index])!;
      answerRun(s,"quintus",r.id,r.index,(q.answer+1)%q.options.length,day,0);
      if(r.status==="active")nextQuestion(s,"quintus",r.id,r.index);
    }
    expect(r.status).toBe("failed");expect(r.capture).toBeUndefined();
    expect(validateFamily(s)).toEqual(s);
  });
  it("simulates every equal-practice rarity pairing with positive, non-one-hit normal damage", () => {
    for(const training of [1,2,5,20,100,growthProgress(MAX_COMPANION_XP).level]) for(const a of RARITY_ORDER) for(const b of RARITY_ORDER) {
      const attack=encounterStats(2,a,training), defend=encounterStats(2,b,training), damage=baseDamage(attack,defend);
      expect(damage).toBeGreaterThan(1);
      expect(damage+8+3+12).toBeLessThan(defend.hp); // element, focus and burst combined
      expect(Math.ceil(defend.hp/damage)).toBeLessThan(20);
    }
  });
  it("matches CPU to nearby real native power and carries practice without mutating player XP", () => {
    const left=["astraltide","tideglow"], xp={astraltide:125,tideglow:xpForLevel(20)}, before={...xp};
    const cpu=chooseCpuTeam(left,xp), battle=newBattle(left,cpu.team,"cpu",[xp,cpu.growth]);
    expect(new Set(cpu.team).size).toBe(2);expect(cpu.team.some(id=>left.includes(id))).toBe(false);
    for(let i=0;i<2;i++) {
      const a=battle.teams[0][i].stats!, b=battle.teams[1][i].stats!;
      expect(Math.abs(a.hp-b.hp)).toBeLessThanOrEqual(12);
      expect(a).toEqual(nativeCombatStats(petById(left[i])!.rarity,creatureProgress(petById(left[i])!.rarity,xp[left[i] as keyof typeof xp]).level));
    }
    expect(xp).toEqual(before);
  });
});
