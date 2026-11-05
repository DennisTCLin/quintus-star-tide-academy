import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {WAVE4_COMPANIONS} from '../companions-wave-four';
import {WAVE6_MONSTERS} from '../monster-wave-six';
import {MONSTER_CATALOG,chooseMonster,monsterEligible,monsterById} from '../monsters';
import {ROSTER,BASE_ROSTER,companionDrawPool,chooseCompanionDraw,petById,petSkillName,petSkillDescription,newBattle,battleMove} from '../game-view';
import {newFamily,draw,buyPet,proposeTrade,acceptTrade,startRun,answerRun,nextQuestion,validateFamily,settleCapture} from '../adventure';
import {answerCapture} from '../capture-trial';
import {questionById} from '../learning';
import {encounterStats} from '../creature-rules';
import {DRAW_WEIGHTS,STAR_TICKET_WEIGHTS} from '../rarity-odds';
import {RARITY_ORDER} from '../characters';
import {syllables} from '../readability';
const day='2026-11-03';
const withoutArt=({image,thumbnail,...data}: Record<string, unknown>)=>data;
describe('one hundred original creatures, append-only catalog expansion',()=>{
 it('preserves every published character and monster definition and all old holdings on reload',()=>{
  const baseline=JSON.parse(readFileSync('outputs/creatures-hundred/baseline-catalog.json','utf8'));
  expect(baseline.characters).toHaveLength(275);expect(baseline.monsters).toHaveLength(140);
  const f=newFamily(),p=f.profiles.quintus;
  for(const old of baseline.characters){expect(withoutArt(petById(old.id)!)).toEqual(withoutArt(old));p.owned[old.id]=2;if(!(old.id in p.firstAcquired))p.firstAcquired[old.id]=day;p.growth.xp[old.id]=75;}
  for(const old of baseline.monsters)expect(withoutArt(monsterById(old.id)!)).toEqual(withoutArt(old));
  p.equipped=baseline.characters.at(-1).id;
  expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);
 });
 it('adds exactly fifty of each kind without duplicate identity or catalogue numbers',()=>{
  expect(WAVE4_COMPANIONS).toHaveLength(50);expect(WAVE6_MONSTERS).toHaveLength(50);
  expect(BASE_ROSTER).toHaveLength(185);expect(MONSTER_CATALOG).toHaveLength(190);expect(ROSTER).toHaveLength(375);
  for(const key of ['id','name','catalogNumber'] as const)expect(new Set(ROSTER.map(c=>c[key])).size).toBe(375);
  expect(WAVE4_COMPANIONS.map(c=>c.catalogNumber)).toEqual(Array.from({length:50},(_,i)=>276+i));
  expect(WAVE6_MONSTERS.map(c=>petById(c.id)!.catalogNumber)).toEqual(Array.from({length:50},(_,i)=>326+i));
  for(const group of [WAVE4_COMPANIONS,WAVE6_MONSTERS])for(const element of ['金','木','水','火','土'])expect(group.filter(c=>c.element===element)).toHaveLength(10);
 });
 it('retains the exact published normal and special-ticket tier probabilities',()=>{
  const p=newFamily().profiles.quintus;
  for(const special of [false,true]){
   const counts=Object.fromEntries(RARITY_ORDER.map(r=>[r,0]));
   for(let n=0;n<10000;n++)counts[chooseCompanionDraw(p,(n+.5)/10000,.51,special).rarity]++;
   expect(counts).toEqual(special?STAR_TICKET_WEIGHTS:DRAW_WEIGHTS);
  }
 });
 it('draws, trades, equips and reloads every new companion while keeping actual skills usable',()=>{
  for(const pet of WAVE4_COMPANIONS){
   const f=newFamily(),p=f.profiles.quintus;p.tickets=2;
   const tier=companionDrawPool(p).filter(c=>c.rarity===pet.rarity),pick=(tier.findIndex(c=>c.id===pet.id)+.5)/tier.length;
   const roll=(RARITY_ORDER.slice(0,RARITY_ORDER.indexOf(pet.rarity)).reduce((n,r)=>n+DRAW_WEIGHTS[r],0)+.5)/10000;
   draw(f,'quintus','one',roll,pick,day,day);draw(f,'quintus','two',roll,pick,day,day);expect(p.owned[pet.id]).toBe(2);
   const other=WAVE4_COMPANIONS.find(c=>c.id!==pet.id)!;f.profiles.feifei.coins=100000;
   buyPet(f,'feifei',other.id,'buy',day);proposeTrade(f,{id:'swap',from:'quintus',to:'feifei',give:pet.id,receive:other.id});acceptTrade(f,'feifei','swap',day);
   expect(p.owned[pet.id]).toBe(1);p.equipped=pet.id;expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);
   expect(petSkillName(pet.id)).toBe(pet.signatureMove);expect(petSkillDescription(pet.id).length).toBeGreaterThan(10);
   expect(battleMove(newBattle([pet.id],['tideglow'],'cpu'),'attack').event?.amount).toBeGreaterThan(0);
  }
 });
 it('can encounter, defeat and tame each new monster once, then equip and reload it',()=>{
  for(const m of WAVE6_MONSTERS){
   const level=m.form==='scout'?1:5;
   const seen=new Set(Array.from({length:80},(_,i)=>[0,6500,8500,9500,9950].map(r=>chooseMonster(level,i*10000+r,undefined,m.element).id)).flat());
   expect(seen.has(m.id),m.id).toBe(true);expect(monsterEligible(m,level)).toBe(true);
   const f=newFamily(),p=f.profiles.quintus;p.growth.xp.tideglow=level===1?0:350;
   startRun(f,'quintus','math','new-'+m.id,0,false,day);const r=p.run!;delete r.encounter.route;
   r.encounter.variant=m.id;r.encounter.monster=m.family;r.encounter.combat!.foe=encounterStats(2,m.rarity,r.encounter.level);
   expect(validateFamily(structuredClone(f))).toEqual(f);
   while(r.status==='active'){answerRun(f,'quintus',r.id,r.index,questionById(r.questions[r.index])!.answer,day,0);if(r.status==='active')nextQuestion(f,'quintus',r.id,r.index);}
   expect(r.capture).toMatchObject({version:3,monster:m.id,outcome:'pending'});
   for(let i=0;i<3;i++)answerCapture(f,'quintus','voyage',r.id,i,questionById(r.capture!.trial!.questions[i])!.answer,day);
   expect(p.owned[m.id]).toBe(1);settleCapture(p,r,day,0);expect(p.owned[m.id]).toBe(1);p.equipped=m.id;
   expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);expect(petSkillName(m.id)).toBe(m.move);
  }
 });
 it('ships one hundred unique transparent WebP assets, thumbnails and reviewed readable labels',()=>{
  const hashes=new Set<string>();
  for(const c of [...WAVE4_COMPANIONS,...WAVE6_MONSTERS]){
   for(const asset of [c.image,c.thumbnail!]){
    const url=new URL(asset,'https://test.invalid'),b=readFileSync('public'+url.pathname),hash=createHash('sha256').update(b).digest('hex');
    expect(b.toString('ascii',8,12)).toBe('WEBP');expect(url.searchParams.get('v')).toBe(hash.slice(0,12));if(asset===c.image)hashes.add(hash);
   }
   const card=petById(c.id)!;
   for(const text of [card.name,card.story,petSkillName(c.id)])expect(syllables(text).filter(s=>/[\u3400-\u9fff]/u.test(s.text)).every(s=>s.zy),text).toBe(true);
  }
  expect(hashes.size).toBe(100);
 });
});
