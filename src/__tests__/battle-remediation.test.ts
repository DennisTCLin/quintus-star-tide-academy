import { describe, it, expect } from 'vitest';
import { newFamily, startRun, answerRun, nextQuestion, correctRun, skipRemediation, validateFamily, readyQuestion } from '../adventure';
import { questionById } from '../learning';
import { startIsland } from '../island/server';
import { MAX_COMPANION_XP } from '../companion-growth';
const day='2026-10-25', player='doudou';
function fail(pattern=[false,false,false], practice=false) {
 const s=newFamily(); startRun(s,player,'math','round',1,practice,day);
 const r=s.profiles[player].run!;
 for(const correct of pattern) {const q=questionById(r.questions[r.index])!;answerRun(s,player,r.id,r.index,correct?q.answer:(q.answer+1)%q.options.length,day);if(r.status==='active')nextQuestion(s,player,r.id,r.index);}
 return s;
}
function complete(s:ReturnType<typeof newFamily>, claimDay=day) {const r=s.profiles[player].run!;r.answers!.forEach((v,i)=>{if(!v&&!r.remediation?.corrected.includes(i))correctRun(s,player,r.id,i,questionById(r.questions[i])!.answer,claimDay);});}
describe('defeat correction and half-run resource guarantee',()=>{
 it('keeps first answers, rewards nothing for partial/wrong corrections and settles once',()=>{
  const s=fail(),p=s.profiles[player],r=p.run!, original=structuredClone(r.answers), stats=structuredClone(p.learning);
  expect(correctRun(s,player,r.id,0,(questionById(r.questions[0])!.answer+1)%3,day)).toBe(false);
  correctRun(s,player,r.id,0,questionById(r.questions[0])!.answer,day);expect(p.coins).toBe(0);expect(r.remediation!.receipt).toBeNull();
  const resumed=validateFamily(s);complete(resumed);const rp=resumed.profiles[player];
  expect(rp.run!.remediation!.receipt).toEqual({coins:30,xp:30,skipped:false});expect(rp.coins).toBe(30);expect(rp.growth.xp[r.companion]).toBe(30);
  expect(rp.run!.answers).toEqual(original);expect(rp.run!.status).toBe('failed');expect({...rp.learning,mastered:stats.mastered}).toEqual(stats);expect(rp.learning.mastered).not.toEqual(stats.mastered);expect(rp.tickets).toBe(0);expect(rp.rewardStars).toBe(0);expect(rp.run!.capture).toBeUndefined();
  expect(()=>correctRun(resumed,player,r.id,2,questionById(r.questions[2])!.answer,day)).toThrow();expect(validateFamily(resumed)).toEqual(resumed);
 });
 it('counts earned rewards and never takes them back or grants extra half on top',()=>{
  const s=fail([true,true,false,false,false]),p=s.profiles[player];complete(s);
  expect(p.run!.remediation!.receipt).toEqual({coins:10,xp:10,skipped:false});expect(p.coins).toBe(30);expect(p.growth.xp[p.run!.companion]).toBe(30);
  const t=fail([true,true,true,false,false,false]);complete(t);expect(t.profiles[player].run!.remediation!.receipt).toEqual({coins:0,xp:0,skipped:false});
 });
 it('prevents replay/new runs from minting the same question guarantee, and caps XP',()=>{
  const s=fail(),p=s.profiles[player],r=p.run!;p.growth.xp[r.companion]=MAX_COMPANION_XP-2;complete(s);
  expect(r.remediation!.receipt!.xp).toBe(2);expect(p.growth.credited).toEqual(expect.arrayContaining(r.questions));expect(p.attempted).toEqual(expect.arrayContaining(r.questions));
  expect(()=>correctRun(s,player,'stale',0,0,day)).toThrow();expect(()=>correctRun(s,player,r.id,5,0,day)).toThrow();
 });
 it('does not reward practice, old-day or legacy runs',()=>{
  for(const mode of ['practice','old','legacy']) {const s=fail(undefined,mode==='practice'),r=s.profiles[player].run!;if(mode==='legacy')delete r.remediation;complete(s,mode==='old'?'2026-10-26':day);expect(s.profiles[player].coins).toBe(0);expect(r.remediation!.receipt!.xp).toBe(0);expect(()=>validateFamily(s)).not.toThrow();}
 });
 it('resumes pending correction and requires an explicit skip before replacing the run',()=>{
  const s=fail();expect(()=>startIsland(s,player,'learn','1A-01','island',day)).toThrow(/補練/);expect(()=>startRun(s,player,'math','new',2,false,day)).toThrow();skipRemediation(s,player,'round');const copy=structuredClone(s);expect(()=>startIsland(copy,player,'learn','1A-01','island',day)).not.toThrow();expect(()=>correctRun(s,player,'round',0,0,day)).toThrow();startRun(s,player,'math','new',2,false,day);expect(s.profiles[player].run!.id).toBe('new');
 });
 it('rejects forged correction state',()=>{
  const s=fail(),r=s.profiles[player].run!;r.remediation!.corrected=[5];expect(()=>validateFamily(s)).toThrow();r.remediation!.corrected=[];r.remediation!.receipt={coins:30,xp:30,skipped:false};expect(()=>validateFamily(s)).toThrow();
 });
 it('includes timed-out questions without modifying timeout history',()=>{
  const s=newFamily();startRun(s,player,'math','clock',1,false,day,'standard');const r=s.profiles[player].run!;
  for(let i=0;i<3;i++){readyQuestion(s,player,r.id,i,100000);answerRun(s,player,r.id,i,null,day,.99,r.challenge!.clock!.deadlineAt+3000);if(r.status==='active')nextQuestion(s,player,r.id,i);}
  complete(s);expect(r.challenge!.timeouts).toEqual([0,1,2]);expect(r.remediation!.corrected).toEqual([0,1,2]);expect(()=>validateFamily(s)).not.toThrow();
 });
});
