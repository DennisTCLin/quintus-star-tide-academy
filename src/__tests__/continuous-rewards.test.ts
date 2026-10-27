import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { newFamily, validateFamily, startRun, answerRun, nextQuestion } from '../adventure';
import { questionById } from '../learning';
import { restoreFamily } from '../family-store';
import { startIsland, answerIsland, finishIsland } from '../island/server';
import {answerCapture} from '../capture-trial';
function completeCapture(f:ReturnType<typeof newFamily>,id:'quintus'|'doudou',source:'voyage'|'island',date:string){const r=source==='voyage'?f.profiles[id].run!:f.profiles[id].mathIsland!.run!;if(r.capture?.outcome==='pending')for(let i=0;i<3;i++)answerCapture(f,id,source,r.id,i,questionById(r.capture.trial!.questions[i])!.answer,date);}
const day='2026-10-25';
function voyage(f:ReturnType<typeof newFamily>,id:'quintus'|'doudou'='quintus',date=day) {
 startRun(f,id,'math',randomUUID(),1,false,date);
 const r=f.profiles[id].run!;
 for(let i=0;i<6;i++){answerRun(f,id,r.id,i,questionById(r.questions[i])!.answer,date,0);if(i<5)nextQuestion(f,id,r.id,i);}
 completeCapture(f,id,'voyage',date);return r;
}
describe('continuous economy migration and ledgers',()=>{
 it.each([0,19,20,39,40,10000000])('compensates historical %s points only once while preserving all learning',points=>{
  const old:any=newFamily();old.version=6;
  const p=old.profiles.quintus;p.milestones.masteryPoints=points;p.coins=10000000;delete p.masteryConversion;
  const original=structuredClone(old),converted=validateFamily(old),next=converted.profiles.quintus;
  expect(old).toEqual(original);expect(next.coins).toBe(10000000+Math.floor(points/20)*10);
  expect(next.masteryConversion).toEqual({version:1,points,coins:Math.floor(points/20)*10});
  expect(next.milestones).toEqual(p.milestones);expect(next.owned).toEqual(p.owned);expect(next.growth).toEqual(p.growth);
  expect(validateFamily(converted)).toEqual(converted);expect(validateFamily(old)).toEqual(converted);
 });
 it('new earnings never trigger historical compensation; malformed v7 markers fail closed',()=>{
  const f=newFamily();voyage(f);const p=f.profiles.quintus;
  expect(p.coins).toBe(60);expect(p.masteryConversion).toEqual({version:1,points:0,coins:0});
  expect(validateFamily(f)).toEqual(f);
  for(const marker of [undefined,{version:1,points:20,coins:20},{version:2,points:0,coins:0},{version:1,points:140,coins:70}]) {
   const bad:any=structuredClone(f);bad.profiles.quintus.masteryConversion=marker;expect(()=>validateFamily(bad)).toThrow();
  }
 });
 it('converts the oldest milestone import and carries the remainder as history',()=>{
  const f=newFamily(JSON.stringify({version:1,points:39}));
  expect(f.profiles.quintus.coins).toBe(10);expect(f.profiles.quintus.milestones.masteryPoints).toBe(39);
  expect(validateFamily(f)).toEqual(f);
 });
 it('passes 16, 101 and 501 unique rewarded answers and preserves the entire ledger on restore',()=>{
  const f=newFamily();for(let i=0;i<86;i++)voyage(f);
  const p=f.profiles.quintus;
  expect(p.credited).toHaveLength(516);expect(p.coins).toBe(5160);expect(p.tickets).toBe(43);
  expect(p.rewardRounds).toBe(86);expect(p.captureQuota?.attempts).toBe(86);
  const restored=validateFamily(JSON.parse(JSON.stringify(f)));restoreFamily(restored,f);
  expect(restored.profiles.quintus.credited).toEqual(p.credited);expect(restored.profiles.quintus.attempted).toEqual(p.attempted);
  const known=p.run!.questions[0],coins=p.coins;
  startRun(f,'quintus','math',randomUUID(),1,false,day);p.run!.questions[0]=known;p.run!.review[0]=true;
  answerRun(f,'quintus',p.run!.id,0,questionById(known)!.answer,day);
  expect(p.coins).toBe(coins);expect(validateFamily(f).profiles.quintus.credited).toHaveLength(516);
 });
 it('shares repeatable stars and capture across island and voyage, and retains stars overnight',()=>{
  let f=newFamily();const p=f.profiles.doudou;p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day:'',attempted:[]};
  for(let i=0;i<6;i++) {
   if(i%2===0)voyage(f,'doudou');
   else {
    const r=startIsland(f,'doudou','play','1A-01',randomUUID(),day,i);
    for(let n=0;n<6;n++)answerIsland(f,'doudou',r.id,n,r.items[n].answer,day);
    const result=finishIsland(f,'doudou',r.id,day,0);
    expect(result.capture?.outcome).toBe('pending');completeCapture(f,'doudou','island',day);
    const saved=structuredClone(f);finishIsland(f,'doudou',r.id,day,.99);expect(f).toEqual(saved);
   }
   expect(p.tickets).toBe(Math.floor((i+1)/2));expect(p.captureQuota?.attempts).toBe(i+1);
   expect(validateFamily(f)).toEqual(f);
  }
  voyage(f,'doudou');f=validateFamily(JSON.parse(JSON.stringify(f)));voyage(f,'doudou','2026-10-26');
  expect(f.profiles.doudou.tickets).toBe(4);expect(f.profiles.doudou.rewardStars).toBe(0);
 });
 it('preserves island first attempts across older backups and discards exposed active runs',()=>{
  const f=newFamily(),p=f.profiles.doudou;
  p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day:'',attempted:[]};
  const r=startIsland(f,'doudou','play','1A-01',randomUUID(),day);
  const backup=structuredClone(f),q=structuredClone(r.items[0]);
  answerIsland(f,'doudou',r.id,0,q.choices.find(a=>a!==q.answer)!,day);
  restoreFamily(f,backup);
  expect(f.profiles.doudou.mathIsland!.run).toBeUndefined();
  const retry=startIsland(f,'doudou','play','1A-01',randomUUID(),day);
  retry.items[0]=q;
  expect(answerIsland(f,'doudou',retry.id,0,q.answer,day).coins).toBe(0);
  expect(validateFamily(f).profiles.doudou.mathIsland!.attempted).toContain(q.id);
  const noIsland=newFamily();restoreFamily(f,noIsland);
  expect(f.profiles.doudou.mathIsland!.attempted).toContain(q.id);
 });
 it('finishes legacy active islands without retroactively introducing a monster',()=>{
  const f=newFamily(),p=f.profiles.doudou;
  p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day:'',attempted:[]};
  const r=startIsland(f,'doudou','play','1A-01',randomUUID(),day);delete r.encounter;
  for(let i=0;i<6;i++)answerIsland(f,'doudou',r.id,i,r.items[i].answer,day);
  finishIsland(f,'doudou',r.id,day,0);
  expect(r.savedStar).toBe(true);expect(r.capture).toBeUndefined();expect(validateFamily(f)).toEqual(f);
 });
 it('never retroactively settles an already finished old voyage or grants a failed island capture',()=>{
  const f:any=newFamily();voyage(f);f.version=6;f.profiles.quintus.run.reward='none';delete f.profiles.quintus.run.capture;
  const loaded=validateFamily(f);expect(loaded.profiles.quintus.run!.capture).toBeUndefined();expect(loaded.profiles.quintus.run!.reward).toBe('none');
  const p=loaded.profiles.doudou;p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day:'',attempted:[]};
  const r=startIsland(loaded,'doudou','play','1A-01',randomUUID(),day);
  for(let i=0;i<3;i++)answerIsland(loaded,'doudou',r.id,i,r.items[i].choices.find(a=>a!==r.items[i].answer)!,day);
  finishIsland(loaded,'doudou',r.id,day,0);expect(r.capture).toBeUndefined();expect(p.tickets).toBe(0);expect(p.rewardStars).toBe(0);
 });
});
