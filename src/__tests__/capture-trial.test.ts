import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {newFamily,startRun,answerRun,nextQuestion,validateFamily,settleCapture} from '../adventure';
import {answerCapture,skipCapture,validateCaptureTrial} from '../capture-trial';
import {questionById} from '../learning';
import {startIsland,answerIsland,finishIsland,quitIsland} from '../island/server';
const day='2026-10-26';
function won(player:'doudou'|'qingqing'|'feifei'|'quintus'|'jay'|'alston'='doudou'){
 const f=newFamily();
 // Match the current server-side curriculum routing for Alston's supplied exams.
 if(player==='alston')f.profiles[player].learning.school='jianan';
 startRun(f,player,'math',randomUUID(),2,false,day);const p=f.profiles[player],r=p.run!;
 for(let i=0;i<6;i++){answerRun(f,player,r.id,i,questionById(r.questions[i])!.answer,day,0);if(i<5)nextQuestion(f,player,r.id,i);}
 return{f,p,r};
}
describe('three additional first-answer capture questions',()=>{
 it.each(['doudou','qingqing','feifei','quintus','jay','alston'] as const)('keeps %s in their grade and grants exactly one card after three correct answers',player=>{
  const{f,p,r}=won(player),c=r.capture!,t=c.trial!;expect(c).toMatchObject({version:3,chance:100,outcome:'pending'});
  const before=structuredClone(p);expect(validateFamily(f)).toEqual(f);
  expect(t.questions).toHaveLength(3);expect(t.questions.every(id=>questionById(id)!.grade===t.grade&&!r.questions.includes(id))).toBe(true);
  for(let i=0;i<3;i++){answerCapture(f,player,'voyage',r.id,i,questionById(t.questions[i])!.answer,day);expect(validateFamily(f)).toEqual(f);if(i<2)expect(p.owned[c.monster]??0).toBe(before.owned[c.monster]??0);}
  expect(c.outcome).toBe('joined');expect(p.owned[c.monster]).toBe(1);
  expect(p.coins).toBe(before.coins);expect(p.tickets).toBe(before.tickets);expect(p.growth).toEqual(before.growth);expect(p.learning).toEqual(before.learning);
  expect(()=>answerCapture(f,player,'voyage',r.id,2,questionById(t.questions[2])!.answer,day)).toThrow();
  settleCapture(p,r,day,0);expect(p.owned[c.monster]).toBe(1);
 });
 it.each([0,1,2])('one wrong answer at position %s ends capture without changing battle rewards',wrongAt=>{
  const{f,p,r}=won(),before=structuredClone(p),t=r.capture!.trial!;
  for(let i=0;i<=wrongAt;i++){const q=questionById(t.questions[i])!;answerCapture(f,'doudou','voyage',r.id,i,i===wrongAt?(q.answer+1)%q.options.length:q.answer,day);}
  expect(r.capture!.outcome).toBe('escaped');expect(p.owned).toEqual(before.owned);expect(p.coins).toBe(before.coins);expect(p.rewardStars).toBe(before.rewardStars);
  expect(()=>answerCapture(f,'doudou','voyage',r.id,wrongAt,questionById(t.questions[wrongAt])!.answer,day)).toThrow();expect(validateFamily(f)).toEqual(f);
 });
 it('persists pending questions across reload/day change, rejects wrong player/index and explicit skip cannot retry',()=>{
  const{f,r}=won(),t=r.capture!.trial!;answerCapture(f,'doudou','voyage',r.id,0,questionById(t.questions[0])!.answer,day);
  const reloaded=validateFamily(JSON.parse(JSON.stringify(f)));expect(reloaded.profiles.doudou.run!.capture).toEqual(r.capture);
  expect(()=>answerCapture(reloaded,'qingqing','voyage',r.id,1,0,day)).toThrow();expect(()=>answerCapture(reloaded,'doudou','voyage',r.id,0,0,day)).toThrow();
  expect(()=>startRun(reloaded,'doudou','math',randomUUID(),2,false,day)).toThrow(/降服/);
  skipCapture(reloaded,'doudou','voyage',r.id);expect(validateFamily(reloaded)).toEqual(reloaded);
  expect(()=>answerCapture(reloaded,'doudou','voyage',r.id,1,0,'2026-10-27')).toThrow();
 });
 it('math island uses the same trial and preserves completed rewards',()=>{
  const f=newFamily(),id='doudou',p=f.profiles[id];p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day:'',attempted:[]};
  const r=startIsland(f,id,'play','1A-01',randomUUID(),day,1);
  for(let i=0;i<r.items.length;i++)answerIsland(f,id,r.id,i,r.items[i].answer,day);
  finishIsland(f,id,r.id,day,0);expect(r.capture!.outcome).toBe('pending');const t=r.capture!.trial!,coins=p.coins;
  expect(()=>quitIsland(f,id,r.id)).toThrow(/降服/);
  for(let i=0;i<3;i++)answerCapture(f,id,'island',r.id,i,questionById(t.questions[i])!.answer,day);
  expect(r.capture!.outcome).toBe('joined');finishIsland(f,id,r.id,day,0);expect(p.owned[r.capture!.monster]).toBe(1);expect(p.coins).toBe(coins);expect(validateFamily(f)).toEqual(f);
 });
 it('rejects forged success, cross-grade questions and malformed answer ledgers',()=>{
  const{r}=won();for(const alter of [(c:any)=>c.outcome='joined',(c:any)=>c.trial.questions[0]='g2-tone-ma-1',(c:any)=>c.trial.answers=[{choice:99,correct:true}]]){const c=structuredClone(r.capture!);alter(c);expect(()=>validateCaptureTrial(c,1)).toThrow();}
 });
 it('rejects impossible legacy pending receipts, missing new-rule markers and cross-course trials',()=>{
  const {f,r}=won();const c=structuredClone(r.capture!);
  expect(()=>validateCaptureTrial({...c,version:2,trial:undefined})).toThrow();
  expect(()=>validateCaptureTrial(c,1,'tones')).toThrow();
  delete r.captureRule;expect(()=>validateFamily(f)).toThrow();
 });
});
