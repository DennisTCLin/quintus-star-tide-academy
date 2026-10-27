import {describe,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {newFamily,startRun,answerRun,nextQuestion,readyQuestion,setChallengeMode,validateFamily} from '../adventure';
import {newChallenge,readingSeconds,challengeExpired,TIMING_GRACE_MS} from '../tiered-challenge';
import {COURSES,questionById} from '../learning';
import {allocateQuestions,freshLearning,questionDifficulty} from '../learning-engine';
import {xpForLevel} from '../companion-growth';
const day='2026-10-25',now=1800000000000;
function setup(tier:number,mode:'standard'|'relaxed'='standard') {
 const f=newFamily(),training=tier===3?50:tier===2?5:1;f.profiles.quintus.growth.xp.tideglow=xpForLevel(training);
 const seed=0; // 金島初階 E=Lv1；高階 B +4 training=Lv19 (tier2)。
 startRun(f,'quintus','math',randomUUID(),seed,false,day,mode);
 return f;
}
function submit(f:ReturnType<typeof newFamily>,correct:boolean,at=now) {
 const r=f.profiles.quintus.run!;
 readyQuestion(f,'quintus',r.id,r.index,at);
 const q=questionById(r.questions[r.index])!;
 answerRun(f,'quintus',r.id,r.index,correct?q.answer:(q.answer+1)%q.options.length,day,0,at+1000);
 if(r.status==='active')nextQuestion(f,'quintus',r.id,r.index);
 expect(validateFamily(f)).toEqual(f);
}
describe('versioned monster challenges',()=>{
 it.each([1,2,3])('requires the real tier %s accuracy threshold without ending early for one mistake',tier=>{
  const f=setup(tier),r=f.profiles.quintus.run!;
  expect(r.challenge!.tier).toBe(tier);
  const target=tier+3;
  const pattern=[false,...Array(5).fill(true)];
  for(const answer of pattern)submit(f,answer);
  expect(r.status).toBe(target<=5?'won':'failed');
  expect(f.profiles.quintus.coins).toBe(50);
  expect(f.profiles.quintus.rewardStars).toBe(target<=5?1:0);
  expect(Boolean(r.capture)).toBe(target<=5);
 });
 it('fails exactly the third mistake; cannot gain via a late answer',()=>{
  const f=setup(3),r=f.profiles.quintus.run!;
  for(let i=0;i<3;i++){
   readyQuestion(f,'quintus',r.id,i,now);
   const q=questionById(r.questions[i])!;
   answerRun(f,'quintus',r.id,i,q.answer,day,0,r.challenge!.clock!.deadlineAt+TIMING_GRACE_MS+1);
   expect(r.answers!.at(-1)).toBe(false);
   if(i<2)nextQuestion(f,'quintus',r.id,i);
   expect(validateFamily(f)).toEqual(f);
  }
  expect(r.status).toBe('failed');expect(r.challenge!.timeouts).toEqual([0,1,2]);
  expect(f.profiles.quintus.coins).toBe(0);expect(r.capture).toBeUndefined();
 });
 it('preserves clock across readiness replay/reload and locks mode after reveal',()=>{
  const f=setup(1),r=f.profiles.quintus.run!;
  expect(()=>answerRun(f,'quintus',r.id,0,0,day,0,now)).toThrow('先按開始');
  setChallengeMode(f,'quintus',r.id,'relaxed');setChallengeMode(f,'quintus',r.id,'standard');
  readyQuestion(f,'quintus',r.id,0,now);const clock=structuredClone(r.challenge!.clock);
  readyQuestion(f,'quintus',r.id,0,now+900000);
  expect(r.challenge!.clock).toEqual(clock);expect(validateFamily(f).profiles.quintus.run!.challenge!.clock).toEqual(clock);
  expect(()=>setChallengeMode(f,'quintus',r.id,'relaxed')).toThrow();
  expect(()=>answerRun(f,'quintus',r.id,0,null,day,0,now)).toThrow();
  const q=questionById(r.questions[0])!;
  expect(answerRun(f,'quintus',r.id,0,q.answer,day,0,clock!.deadlineAt+TIMING_GRACE_MS)).toBe(true);
  expect(()=>answerRun(f,'quintus',r.id,0,null,day,0,clock!.deadlineAt+9999)).toThrow();
 });
 it('untimed mode uses the same high-tier precision, rewards and questions',()=>{
  const f=setup(3,'relaxed'),r=f.profiles.quintus.run!;
  for(let i=0;i<6;i++){
   readyQuestion(f,'quintus',r.id,i,now);
   answerRun(f,'quintus',r.id,i,questionById(r.questions[i])!.answer,day,0,now+99999999);
   if(i<5)nextQuestion(f,'quintus',r.id,i);
  }
  expect(r.status).toBe('won');expect(r.challenge!.timeouts).toEqual([]);expect(f.profiles.quintus.coins).toBe(60);expect(r.capture).toBeDefined();expect(validateFamily(f)).toEqual(f);
 });
 it('keeps legacy runs untimed and rejects modified rule contracts',()=>{
  const f=newFamily();startRun(f,'quintus','math',randomUUID(),0,false,day);
  const r=f.profiles.quintus.run!;expect(r.challenge).toBeUndefined();answerRun(f,'quintus',r.id,0,questionById(r.questions[0])!.answer,day);
  expect(validateFamily(f)).toEqual(f);
  const changed=setup(1);changed.profiles.quintus.run!.challenge!.requiredCorrect=6;expect(()=>validateFamily(changed)).toThrow();
 });
 it('uses bounded real difficulty lanes for every available grade/course and honest exhausted reviews',()=>{
  for(const grade of [1,2,4] as const)for(const course of COURSES[grade])for(const level of [1,2,3] as const){
   const state=freshLearning();
   for(let batch=0;batch<3;batch++) {
    const qs=allocateQuestions(state,grade,course.id,6,level);expect(new Set(qs.map(q=>q.id)).size).toBe(6);
    for(const q of qs){const item=questionById(q.id)!;expect(item.grade).toBe(grade);expect(item.course).toBe(course.id);expect([1,2,3]).toContain(questionDifficulty(item));}
   }
  }
 });
 it('has bounded reading allowance, exact boundary, and more time for younger grades',()=>{
  expect(readingSeconds('hi')).toBe(30);expect(readingSeconds('長'.repeat(2000))).toBe(120);
  expect(newChallenge(20,1,'standard').seconds).toBeGreaterThan(newChallenge(20,4,'standard').seconds);
  expect(challengeExpired(newChallenge(1,1,'standard'),now)).toBe(false);
 });
});
