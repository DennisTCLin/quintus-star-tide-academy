import {startAfterDecliningCapture,islandAfterDecliningCapture} from './helpers/capture';
import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { newFamily,validateFamily,startRun,answerRun } from '../adventure';
import { questionById } from '../learning';
import { ROSTER, petSkill } from '../game-view';
import { startIsland,answerIsland,finishIsland,quitIsland,helpIsland } from '../island/server';
import { publicIslandRun, validateIsland } from '../island/schema';
import { islandSegments, resumePosition } from '../island/presentation';
import { emptyPlayer } from '../island/engine';
import { GRADE_ONE_UNITS as ISLAND_UNITS } from '../island/catalog';
import { CHALLENGE_QUESTIONS, MAX_MISTAKES } from '../challenge-rules';
const day='2026-10-25',id='doudou';
function stage(s:ReturnType<typeof newFamily>,mode:'learn'|'play'|'boss'|'mock'='learn',unit:string|undefined='1A-01',wrong=0) {
 const r=islandAfterDecliningCapture(s,id,mode,mode==='mock'?undefined:unit,randomUUID(),day);
 for(let i=0;i<r.items.length;i++) answerIsland(s,id,r.id,i,i<wrong?r.items[i].choices.find(a=>a!==r.items[i].answer)!:r.items[i].answer,day);
 return finishIsland(s,id,r.id,day);
}
describe('Math Island cloud rules',()=>{
 it('unlocks all three stages and king from server-verified scores, persists beside existing saves',()=>{
  const s=newFamily(); expect(()=>islandAfterDecliningCapture(s,id,'boss','1A-01',randomUUID(),day)).toThrow();
  expect(()=>islandAfterDecliningCapture(s,id,'mock',undefined,randomUUID(),day)).toThrow();
  for(const {id:unit} of ISLAND_UNITS) {
   stage(s,'learn',unit); stage(s,'play',unit); stage(s,'boss',unit,2);
   expect(s.profiles[id].mathIsland?.units[unit].boss).toBe(4/6);
  }
  const r=stage(s,'mock',undefined);
  expect(r.items).toHaveLength(CHALLENGE_QUESTIONS);expect(s.profiles[id].mathIsland?.mock).toBe(1);
  expect(validateFamily(JSON.parse(JSON.stringify(s))).profiles[id].mathIsland).toEqual(s.profiles[id].mathIsland);
  expect(s.profiles.qingqing).toEqual(newFamily().profiles.qingqing);
 });
 it('blocks forged progress, duplicate answers, skipping questions and both directions of active voyage overlap',()=>{
  const s=newFamily(),r=islandAfterDecliningCapture(s,id,'learn','1A-01',randomUUID(),day);
  expect(()=>islandAfterDecliningCapture(s,'unknown' as 'quintus','learn','1A-01',randomUUID(),day)).toThrow();
  expect(()=>answerIsland(s,id,'wrong',0,'1',day)).toThrow();
  expect(()=>answerIsland(s,id,r.id,1,'1',day)).toThrow();
  expect(()=>answerIsland(s,id,r.id,0,'100',day)).toThrow();
  expect(()=>finishIsland(s,id,r.id,day)).toThrow();
  expect(()=>startAfterDecliningCapture(s,id,'math',randomUUID(),42,false,day)).toThrow();
  const q=r.items[0],wrong=q.choices.find(a=>a!==q.answer)!;
  expect(answerIsland(s,id,r.id,0,wrong,day).coins).toBe(0);
  expect(()=>answerIsland(s,id,r.id,0,q.answer,day)).toThrow();
  expect(s.profiles[id].growth.xp[r.companion]??0).toBe(0);
  expect(islandAfterDecliningCapture(s,id,'learn','1A-01',randomUUID(),day).answers).toEqual([wrong]);
  quitIsland(s,id,r.id);startAfterDecliningCapture(s,id,'math',randomUUID(),42,false,day);
  expect(()=>islandAfterDecliningCapture(s,id,'learn','1A-01',randomUUID(),day)).toThrow();
 });
 it('continues coins and completion stars across both modes beyond old caps',()=>{
  const s=newFamily(),p=s.profiles[id];
  for(let j=0;j<2;j++) {
   startAfterDecliningCapture(s,id,'math',randomUUID(),j,false,day);const r=p.run!;
   for(let i=0;i<r.questions.length;i++) {
    answerRun(s,id,r.id,r.index,questionById(r.questions[r.index])!.answer,day);
    if(i<r.questions.length-1) {r.index++;r.settled=false;r.wrong=[];r.assisted=false;}
   }
   r.reward='saved'; // fixture: consume existing reserved completion, no extra grant.
  }
  const before=p.credited.length,coins=p.coins;
  const a=stage(s),b=stage(s,'play');
  expect(p.credited.length).toBeGreaterThan(15);expect(p.coins-coins).toBe((p.credited.length-before)*10+a.bonus+b.bonus);
  expect(a.xp+b.xp).toBeGreaterThan(0);expect(p.learningRewards!.packs).toBeGreaterThanOrEqual(3);
  expect(p.rewardRounds).toBe(3);expect(a.savedStar).toBe(false);expect(b.savedStar).toBe(true);
  const snapshot=structuredClone(s);expect(finishIsland(s,id,b.id,day)).toEqual(b);expect(s).toEqual(snapshot);
  expect(()=>validateFamily(s)).not.toThrow();
 });
 it('earns in reverse direction and credits a frozen companion only once per day',()=>{
  const s=newFamily(),p=s.profiles[id];
  stage(s);stage(s,'play');stage(s,'boss');
  const coins=p.coins;startAfterDecliningCapture(s,id,'math',randomUUID(),42,false,day);
  const r=p.run!;answerRun(s,id,r.id,0,questionById(r.questions[0])!.answer,day);
  expect(p.credited.length).toBeGreaterThan(15);expect(p.coins).toBe(coins+10);
  p.run=null; const island=islandAfterDecliningCapture(s,id,'learn','1A-04',randomUUID(),day),pet=island.companion;
  p.owned.compasscrab=1;p.firstAcquired.compasscrab=day;p.equipped='compasscrab';
  const before=p.growth.xp[pet]??0;
  answerIsland(s,id,island.id,0,island.items[0].answer,day);
  expect(p.growth.xp[pet]).toBe(before+10);expect(p.growth.xp.compasscrab??0).toBe(0);
  const q=island.items[0];island.items[1]=structuredClone(q);
  expect(answerIsland(s,id,island.id,1,q.answer,day).coins).toBe(0);
  expect(p.growth.xp[pet]).toBe(before+10);
 });
 it('does not award an overnight run, hides unsubmitted solutions and freezes help usage',()=>{
  const s=newFamily(),p=s.profiles[id],r=islandAfterDecliningCapture(s,id,'learn','1A-01',randomUUID(),day);
  expect(publicIslandRun(r).items.every(q=>q.answer==='')).toBe(true);
  const help=helpIsland(s,id,r.id,0);expect(help.eliminated===null||help.eliminated!==r.items[0].answer).toBe(true);
  expect(()=>helpIsland(s,id,r.id,0)).toThrow();
  for(let i=0;i<r.items.length;i++) answerIsland(s,id,r.id,i,r.items[i].answer,'2026-10-26');
  const result=finishIsland(s,id,r.id,'2026-10-26');expect(result.xp).toBe(0);expect(result.coins).toBe(0);expect(result.savedStar).toBe(false);
  expect(p.mathIsland?.units['1A-01'].learn).toBe(true);
 });
 it('bounds malformed persistence and never silently overwrites it',()=>{
  for(const bad of [{...emptyPlayer(),units:{'bogus':{learn:true}}},{...emptyPlayer(),pool:[{k:'evil',due:day,added:day,streak:0}]},{...emptyPlayer(),stats:{count:{a:1,w:2}}}]) expect(()=>validateIsland(bad)).toThrow();
  expect(()=>validateFamily(newFamily())).not.toThrow();
 });
 it('stops practice at three wrong answers without unlocking or minting a completion reward',()=>{
  const s=newFamily();stage(s);const p=s.profiles[id],before=p.rewardRounds;
  const r=islandAfterDecliningCapture(s,id,'play','1A-01',randomUUID(),day);
  for(let i=0;i<3;i++)answerIsland(s,id,r.id,i,r.items[i].choices.find(a=>a!==r.items[i].answer)!,day);
  expect(()=>answerIsland(s,id,r.id,3,r.items[3].answer,day)).toThrow();
  finishIsland(s,id,r.id,day);expect(p.mathIsland?.units['1A-01'].play).toBeUndefined();
  expect(p.rewardRounds).toBe(before);expect(r.savedStar).toBe(false);
  expect(publicIslandRun(r).items.slice(3).every(q=>q.answer==='')).toBe(true);
  expect(()=>validateFamily(s)).not.toThrow();
 });
 it('resumes boundary and remedial demos, keeps the help effect and uses current voyage score cap',()=>{
  const s=newFamily(),r=islandAfterDecliningCapture(s,id,'learn','1A-01',randomUUID(),day);
  const help=helpIsland(s,id,r.id,0);expect(r.help).toEqual({index:0,...help});
  for(let i=0;i<3;i++)answerIsland(s,id,r.id,i,r.items[i].answer,day);
  let segs=islandSegments(r);expect(segs[resumePosition(r,segs)]).toMatchObject({t:'demo',k:'find'});
  for(let i=3;i<r.items.length;i++)answerIsland(s,id,r.id,i,r.items[i].answer,day);
  finishIsland(s,id,r.id,day);
  const play=islandAfterDecliningCapture(s,id,'play','1A-01',randomUUID(),day),q=play.items[0];
  answerIsland(s,id,play.id,0,q.choices.find(a=>a!==q.answer)!,day);
  segs=islandSegments(play);expect(segs[resumePosition(play,segs)]).toMatchObject({t:'demo',again:true,k:q.k});
  quitIsland(s,id,play.id);
  const fresh=newFamily();stage(fresh,'learn','1A-04');expect(fresh.profiles[id].milestones.bestVoyagePoints).toBe(0);
  const played=stage(fresh,'play','1A-04');expect(fresh.profiles[id].milestones.bestVoyagePoints).toBe(played.points);
 });

 it('requires all six answers for each scored challenge and never treats guided learning as a battle completion',()=>{
  const s=newFamily(),p=s.profiles[id];
  const lesson=stage(s);
  expect(lesson.savedStar).toBe(false);expect(lesson.bonus).toBe(0);expect(p.rewardRounds).toBe(0);
  expect(p.milestones.bestVoyagePoints).toBe(0);
  const play=islandAfterDecliningCapture(s,id,'play','1A-01',randomUUID(),day);
  expect(play.items).toHaveLength(CHALLENGE_QUESTIONS);
  for(let i=0;i<CHALLENGE_QUESTIONS-1;i++) answerIsland(s,id,play.id,i,play.items[i].answer,day);
  expect(()=>finishIsland(s,id,play.id,day)).toThrow();
  answerIsland(s,id,play.id,5,play.items[5].answer,day);finishIsland(s,id,play.id,day);
  expect(p.mathIsland?.units['1A-01'].play).toBe(true);expect(p.rewardRounds).toBe(1);
  const boss=islandAfterDecliningCapture(s,id,'boss','1A-01',randomUUID(),day);
  expect(boss.items).toHaveLength(CHALLENGE_QUESTIONS);
  for(let i=0;i<MAX_MISTAKES;i++)answerIsland(s,id,boss.id,i,boss.items[i].choices.find(a=>a!==boss.items[i].answer)!,day);
  finishIsland(s,id,boss.id,day);expect(boss.savedStar).toBe(false);expect(p.rewardRounds).toBe(1);
  expect(()=>validateFamily(s)).not.toThrow();
 });
 it('lets an already-earned spark bonus be claimed the next day once, without a new completion star or allowance',()=>{
  const s=newFamily();stage(s);const p=s.profiles[id];
  const spark=ROSTER.find(pet=>petSkill(pet.id)==='spark')!;
  p.owned[spark.id]=1;p.firstAcquired[spark.id]=day;p.equipped=spark.id;
  const r=islandAfterDecliningCapture(s,id,'play','1A-01',randomUUID(),day);
  for(let i=0;i<r.items.length;i++)answerIsland(s,id,r.id,i,r.items[i].answer,day);
  expect(r.rewarded).toBe(6);
  const coins=p.coins,stars=p.rewardStars,tickets=p.tickets;
  finishIsland(s,id,r.id,'2026-10-26');
  expect(p.coins).toBe(coins+5);expect(r.bonus).toBe(5);
  expect(r.savedStar).toBe(false);expect(p.rewardRounds).toBe(0);
  expect(p.rewardStars).toBe(stars);expect(p.tickets).toBe(tickets);expect(p.credited).toEqual([]);
  const snapshot=structuredClone(s);finishIsland(s,id,r.id,'2026-10-26');expect(s).toEqual(snapshot);
  expect(()=>validateFamily(s)).not.toThrow();
 });

});
