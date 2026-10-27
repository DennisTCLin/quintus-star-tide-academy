import {describe,it,expect} from 'vitest';
import {applySchoolCurriculum,SCHOOL_ROSTER} from '../../server/school-roster.mjs';
import {newFamily,startRun,answerRun,nextQuestion,readyQuestion} from '../adventure';
import {answerCapture} from '../capture-trial';
import {questionById} from '../learning';
const user={member_id:'trial-member',username:'trial_g6',player_id:'alston'};
describe('isolated grade-six trial readiness',()=>{
 it('selects a usable curriculum for every subject without claiming a real student identity',()=>{
  expect(SCHOOL_ROSTER.some(s=>s.username==='trial_g6')).toBe(false);
  for(const course of ['math','english','chinese','science','social']){
   const f=newFamily();applySchoolCurriculum(f,user);const p=f.profiles.alston;p.growth.xp[p.equipped]=350;
   startRun(f,'alston',course,'trial-'+course,0,false,'2026-10-27','relaxed');
   expect(p.run.questions).toHaveLength(6);
   for(const id of p.run.questions)expect(questionById(id)).toMatchObject({grade:6,course});
  }
 });
 it('allows a new boss battle and genuine three-answer capture using the trial curriculum',()=>{
  let chosen;
  for(let seed=0;seed<40;seed++){
   const f=newFamily();applySchoolCurriculum(f,user);const p=f.profiles.alston;p.growth.xp[p.equipped]=350;
   startRun(f,'alston','math','trial-boss',seed*10000,false,'2026-10-27','relaxed');
   if(p.run.encounter.variant.startsWith('wave4-')){chosen=f;break;}
  }
  expect(chosen).toBeDefined();const p=chosen.profiles.alston,r=p.run;
  for(let i=0;i<6;i++){readyQuestion(chosen,'alston',r.id,i);answerRun(chosen,'alston',r.id,i,questionById(r.questions[i]).answer,'2026-10-27');if(i<5)nextQuestion(chosen,'alston',r.id,i);}
  expect(r.capture.outcome).toBe('pending');const coins=p.coins;
  for(let i=0;i<3;i++)answerCapture(chosen,'alston','voyage',r.id,i,questionById(r.capture.trial.questions[i]).answer,'2026-10-27');
  expect(r.capture.outcome).toBe('joined');expect(p.owned[r.encounter.variant]).toBe(1);expect(p.coins).toBe(coins);
 });
 it('requires the exact authenticated trial login and matching grade slot',()=>{
  for(const u of [{...user,member_id:undefined},{...user,username:'unrelated',display_name:'六年級試用'},{...user,player_id:'jay'}]){
   const f=newFamily();applySchoolCurriculum(f,u);expect(f.profiles[u.player_id].learning.school).toBeUndefined();
  }
 });
});
