import {completePendingCaptures} from './helpers/capture';
import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { newFamily, validateFamily, draw } from '../adventure';
import { DRAW_WEIGHTS } from '../rarity-odds';
import { RARITY_ORDER } from '../characters';
import { companionDrawPool, petById } from '../game-view';
import { monsterById } from '../monsters';
import { encounterStats } from '../creature-rules';
import { startIsland, answerIsland, finishIsland } from '../island/server';
import { ISLAND_UNITS, ISLAND_KING } from '../island/catalog';
import { islandGuardian, islandOutcome } from '../island/presentation';
import { resultFromIslandRun } from '../island/IslandApp';

const day='2026-10-25';
function unlocked(xp=0) {
  const f=newFamily(),p=f.profiles.doudou;
  p.mathIsland={units:Object.fromEntries(ISLAND_UNITS.map(u=>[u.id,{learn:true,play:true,boss:1}])),pool:[],stats:{},day:'',attempted:[]};
  p.growth.xp[p.equipped]=xp;
  return f;
}
describe('hands-on math metal encounters',()=>{
  it('keeps teaching demonstrations free of monster encounters',()=>{
    const r=startIsland(unlocked(),'doudou','learn','1A-01',randomUUID(),day);
    expect(r.encounter).toBeUndefined();
  });
  it('shows only metal guardians in the destination previews',()=>{
    for(const id of [...ISLAND_UNITS.map(u=>u.guardian),ISLAND_KING]) expect(petById(id)?.element).toBe('金');
  });
  it.each(['play','boss','mock'] as const)('%s restricts new encounters to metal at both training stages',mode=>{
    for(const xp of [0,1000]) for(let seed=0;seed<32;seed++) {
      const f=unlocked(xp);
      f.profiles.doudou.lastMonsterVariant='cloud-scout-water';
      const r=startIsland(f,'doudou',mode,mode==='mock'?undefined:'1A-01',randomUUID(),day,seed);
      expect(monsterById(r.encounter!.variant)?.element).toBe('金');
      expect(islandGuardian(r)?.id).toBe(r.encounter!.variant);
      expect(r.encounter!.monster).not.toBe(0);
      expect(validateFamily(JSON.parse(JSON.stringify(f))).profiles.doudou.mathIsland!.run).toEqual(r);
    }
  });
  it.each(['play','boss','mock'] as const)('%s captures the selected metal monster exactly once',mode=>{
    const f=unlocked(),p=f.profiles.doudou;
    const r=startIsland(f,'doudou',mode,mode==='mock'?undefined:'1A-01',randomUUID(),day,3);
    for(let i=0;i<r.items.length;i++)answerIsland(f,'doudou',r.id,i,r.items[i].answer,day);
    finishIsland(f,'doudou',r.id,day,0);completePendingCaptures(f,day);
    expect(r.capture).toMatchObject({monster:r.encounter!.variant,outcome:'joined',copies:1});
    expect(petById(r.capture!.monster)?.element).toBe('金');
    const result=resultFromIslandRun(r);
    expect(result.guardianId).toBe(r.capture!.monster);
    if(mode!=='play') expect(islandOutcome(result.round,islandGuardian(r)!.name).head).toContain(petById(r.capture!.monster)!.name);
    const saved=validateFamily(JSON.parse(JSON.stringify(f)));
    finishIsland(saved,'doudou',r.id,day,.99);
    expect(saved.profiles.doudou.owned[r.capture!.monster]).toBe(1);
    expect(saved.profiles.doudou.mathIsland!.run!.capture).toEqual(r.capture);
  });
  it('resumes an existing nonmetal encounter unchanged, then uses metal next round',()=>{
    let f=unlocked();const r=startIsland(f,'doudou','play','1A-01',randomUUID(),day);
    const old=monsterById('cloud-scout-water')!,e=r.encounter!;
    e.variant=old.id;e.monster=old.family;e.combat!.foe=encounterStats(2,old.rarity,e.level);
    f=validateFamily(JSON.parse(JSON.stringify(f)));
    const resumed=startIsland(f,'doudou','play','1A-01',randomUUID(),day,99);
    expect(resumed).toEqual(r);
    expect(islandGuardian(resumed)?.id).toBe(old.id);
    for(let i=0;i<resumed.items.length;i++)answerIsland(f,'doudou',resumed.id,i,resumed.items[i].answer,day);
    finishIsland(f,'doudou',resumed.id,day,0);completePendingCaptures(f,day);
    expect(resumed.capture!.monster).toBe(old.id);
    expect(petById(resumed.capture!.monster)?.element).toBe('水');
    expect(resultFromIslandRun(resumed).guardianId).toBe(old.id);
    const next=startIsland(f,'doudou','play','1A-01',randomUUID(),day,99);
    expect(monsterById(next.encounter!.variant)?.element).toBe('金');
  });
  it('retains guardian art for historical saves without an encounter snapshot',()=>{
    expect(islandGuardian({mode:'boss',unit:'1A-04'})?.id).toBe('echojelly');
    expect(islandGuardian({mode:'mock'})?.id).toBe('atlaswhale');
  });
  it('keeps wish-ticket draws across all five elements after playing math',()=>{
    const f=unlocked(),p=f.profiles.doudou;
    startIsland(f,'doudou','play','1A-01',randomUUID(),day);
    const pool=companionDrawPool(p),elements=new Set();p.tickets=pool.length;
    let offset=0;
    for(const rarity of RARITY_ORDER) {
      const tier=pool.filter(pet=>pet.rarity===rarity);
      for(let i=0;i<tier.length;i++) {
        const result=draw(f,'doudou',randomUUID(),(offset+.5)/10000,(i+.5)/tier.length,day,day);
        expect(result.pet).toBe(tier[i].id);elements.add(petById(result.pet!)!.element);
      }
      offset+=DRAW_WEIGHTS[rarity];
    }
    expect([...elements].sort()).toEqual(['金','木','水','火','土'].sort());
    expect(p.tickets).toBe(0);
  });
});
