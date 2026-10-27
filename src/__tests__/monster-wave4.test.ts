import {describe,it,expect} from 'vitest';
import {MONSTER_CATALOG,MONSTER_COMPANIONS,monsterEligible,chooseMonster} from '../monsters';
import {ROSTER,petSkill,petSkillName,petSkillDescription,newBattle,battleMove} from '../game-view';
import {newFamily,startRun,answerRun,nextQuestion,validateFamily} from '../adventure';
import {answerCapture} from '../capture-trial';
import {questionById} from '../learning';
import {encounterStats} from '../creature-rules';
const added=MONSTER_CATALOG.slice(80),day='2026-10-26';
describe('thirty released giant and mechanical bosses',()=>{
 it('appends 30 stable identities, keeps legacy numbers and gives all a working combat skill',()=>{
  expect(added).toHaveLength(30);expect(MONSTER_CATALOG).toHaveLength(110);
  for(const field of ['id','name','catalogNumber'] as const)expect(new Set(ROSTER.map(p=>p[field])).size).toBe(215);
  expect(MONSTER_COMPANIONS[0].catalogNumber).toBe(56);expect(MONSTER_COMPANIONS[79].catalogNumber).toBe(185);
  expect(MONSTER_COMPANIONS.slice(80).map(m=>m.catalogNumber)).toEqual(Array.from({length:30},(_,i)=>186+i));
  for(const m of added){expect(['focus','shield','spark']).toContain(petSkill(m.id));expect(petSkillName(m.id)).toBe(m.move);expect(petSkillDescription(m.id).length).toBeGreaterThan(10);expect(battleMove(newBattle([m.id],['tideglow'],'cpu'),'attack').event?.amount).toBeGreaterThan(0);}
 });
 it('makes every new species reachable in its biome without changing tier odds or exposing bosses to starter voyages',()=>{
  for(const element of ['金','木','水','火','土'] as const){
   expect(added.filter(m=>m.element===element)).toHaveLength(['金','木','水'].includes(element)?10:0);
   const seen=new Set(Array.from({length:30},(_,i)=>[0,7500,9900].map(r=>chooseMonster(5,i*10000+r,undefined,element).id)).flat());
   for(const m of added.filter(m=>m.element===element)){expect(seen.has(m.id)).toBe(true);expect(monsterEligible(m,1)).toBe(false);expect(monsterEligible(m,5)).toBe(true);}
  }
 });
 it('wins, captures, validates and reloads all 30 with exactly one awarded card',()=>{
  for(const m of added){const f=newFamily(),p=f.profiles.quintus;p.growth.xp.tideglow=350;
   startRun(f,'quintus','math','boss-'+m.id,0,false,day);const r=p.run!;delete r.encounter.route;r.encounter.variant=m.id;r.encounter.monster=m.family;r.encounter.combat!.foe=encounterStats(2,m.rarity,r.encounter.level);
   for(let i=0;i<6;i++){answerRun(f,'quintus',r.id,i,questionById(r.questions[i])!.answer,day);if(i<5)nextQuestion(f,'quintus',r.id,i);}
   expect(p.owned[m.id]).toBeUndefined();const coins=p.coins;
   for(let i=0;i<3;i++)answerCapture(f,'quintus','voyage',r.id,i,questionById(r.capture!.trial!.questions[i])!.answer,day);
   expect(p.owned[m.id]).toBe(1);expect(p.coins).toBe(coins);expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);
  }
 });
});
