import { describe, expect, it } from 'vitest';
import { SUBJECT_ISLANDS, islandForCourse, routeForCourse } from '../subject-islands';
import { COURSES } from '../course-catalog';

describe('versioned elemental route map',()=>{
  it.each([1,2,4,5,6] as const)('covers every existing grade %s course and every element exactly once',grade=>{
    expect(SUBJECT_ISLANDS.map(i=>i.courses[grade]).sort()).toEqual(COURSES[grade].map(c=>c.id).sort());
    const routes=COURSES[grade].map(c=>routeForCourse(grade,c.id));
    expect(new Set(routes.map(r=>r.element)).size).toBe(5);
    expect(routes.every(r=>r.version===1)).toBe(true);
    expect(routes.find(r=>r.island==='metal')?.element).toBe('金');
  });
  it('does not manufacture routes for unavailable or retired courses',()=>{
    expect(islandForCourse(1,'words')).toBeUndefined();
    for(const [grade,course] of [[1,'words'],[1,'science'],[2,'english'],[4,'tones']] as const) expect(()=>routeForCourse(grade,course)).toThrow();
  });
});

import { chooseMonster, MONSTER_CATALOG, monsterEligible } from '../monsters';

describe('element-filtered weighted encounters',()=>{
  it('keeps all seeded picks in their biome and training stage, with no previous family repeats',()=>{
    for(const island of SUBJECT_ISLANDS) for(const level of [1,4,5,20]) for(const previous of [undefined,0,1,2]) {
      const seen=new Set<string>();
      for(const seed of Array.from({length:40},(_,i)=>[0,6500,8500,9500,9950].map(r=>i*10000+r)).flat()) {
        const monster=chooseMonster(level,seed,previous,island.element);
        expect(monster.element).toBe(island.element);expect(monsterEligible(monster,level)).toBe(true);
        expect(monster.family).not.toBe(previous);seen.add(monster.id);
      }
      const expected=MONSTER_CATALOG.filter(m=>m.element===island.element&&monsterEligible(m,level)&&m.family!==previous);
      expect([...seen].sort()).toEqual(expected.map(m=>m.id).sort());
    }
  });
  it('keeps S encounters at one percent in every high-stage biome, even after excluding a family',()=>{
    for(const island of SUBJECT_ISLANDS) for(const previous of [undefined,0,1,2,3,4,5,6,7]) {
      let rare=0;
      for(let seed=0;seed<10000;seed++) if(chooseMonster(5,seed,previous,island.element).rarity==='S')rare++;
      expect(rare).toBeLessThanOrEqual(100);
    }
  });
  it('retains the unrestricted API for legacy non-biome callers',()=>{
    const elements=new Set(Array.from({length:3000},(_,seed)=>chooseMonster(1,seed*137).element));
    expect(elements.size).toBe(5);
    expect(()=>chooseMonster(0,1,undefined,'金')).toThrow();
  });
});

import { newFamily, startRun, validateFamily, PLAYERS } from '../adventure';
import { monsterById } from '../monsters';
import { encounterStats } from '../creature-rules';
import { petById } from '../game-view';

describe('authoritative route snapshots',()=>{
  it('freezes correct server-derived routes for every player and grade course',()=>{
    for(const player of PLAYERS) for(const course of COURSES[player.grade]) {
      const f=newFamily();if(player.grade===6)f.profiles[player.id].learning.school='jianan';startRun(f,player.id,course.id,'route-test',0,false,'2026-10-25','standard');
      const r=f.profiles[player.id].run!;
      expect(r.encounter.route).toEqual(routeForCourse(player.grade,course.id));
      expect(monsterById(r.encounter.variant)?.element).toBe(r.encounter.route!.element);
      expect(r.challenge).toBeDefined();
      expect(validateFamily(JSON.parse(JSON.stringify(f))).profiles[player.id].run).toEqual(r);
      f.profiles[player.id].growth.xp[f.profiles[player.id].equipped]=5000;
      expect(validateFamily(f).profiles[player.id].run!.encounter).toEqual(r.encounter);
    }
  });
  it('leaves route-less mixed and combat-v1 historical voyages unchanged',()=>{
    for(const version of [1,2] as const) {
      const f=newFamily();startRun(f,'quintus','math','old-route',0,false,'2026-10-25');
      const r=f.profiles.quintus.run!,monster=monsterById('cloud-scout-water')!;
      delete r.encounter.route;
      r.encounter.variant=monster.id;r.encounter.monster=monster.family;
      r.encounter.combat={version,ally:encounterStats(version,petById(r.companion)!.rarity,r.encounter.level),foe:encounterStats(version,monster.rarity,r.encounter.level)};
      const before=structuredClone(r);
      expect(validateFamily(f).profiles.quintus.run).toEqual(before);
    }
  });
  it('rejects forged, unsupported or inconsistent route snapshots without mutating inputs',()=>{
    const f=newFamily();startRun(f,'quintus','math','route-test',0,false,'2026-10-25');
    for(const route of [null,{},false,{version:2,island:'metal',element:'金'},{version:1,island:'water',element:'水'},{version:1,island:'metal',element:'火'},{version:1,island:'metal',element:'金',override:true}]) {
      const bad:any=structuredClone(f);bad.profiles.quintus.run.encounter.route=route;
      const before=structuredClone(bad);expect(()=>validateFamily(bad)).toThrow();expect(bad).toEqual(before);
    }
    const wrong=structuredClone(f);wrong.profiles.quintus.run!.encounter.variant='cloud-scout-wood';expect(()=>validateFamily(wrong)).toThrow();
    const legacy=newFamily(),before=structuredClone(legacy);expect(()=>startRun(legacy,'doudou','words','retired',0)).toThrow();expect(legacy).toEqual(before);
  });
});
