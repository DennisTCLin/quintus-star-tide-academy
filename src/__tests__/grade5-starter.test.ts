import {describe,it,expect} from 'vitest';
import {newFamily,validateFamily,startRun,answerRun,nextQuestion} from '../adventure';
import {freshLearning,allocateQuestions} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {questionById} from '../learning';
import {GRADE5_STARTER} from '../grade5-starter';
import {GRADE5_MATH_EXTRA} from '../grade5-math-extra';
import {COURSES} from '../course-catalog';
import {coursePublisher} from '../school-curriculum';
describe('grade-five isolated starter',()=>{
 it('upgrades five-slot v8 without changing any prior profile and rejects incomplete v9',()=>{
  const original=newFamily();original.profiles.quintus.coins=417;original.profiles.alston.tickets=19;
  const old:any=structuredClone(original);old.version=8;delete old.profiles.jay;
  const loaded=validateFamily(old);expect(loaded.version).toBe(9);
  for(const id of Object.keys(old.profiles) as (keyof typeof original.profiles)[])expect(loaded.profiles[id]).toEqual(original.profiles[id]);
  expect(loaded.profiles.jay.onboarding).toEqual({pet:null,confirmed:false});expect(old.profiles.jay).toBeUndefined();
  expect(validateFamily(loaded)).toEqual(loaded);const invalid:any=structuredClone(loaded);delete invalid.profiles.jay;expect(()=>validateFamily(invalid)).toThrow();
 });
 it('finishes a full grade-five-only six-question challenge without touching other profiles',()=>{
  const f=newFamily();const before=structuredClone(f);startRun(f,'jay','math','grade5',0,false,'2026-10-26');
  for(let i=0;i<6;i++){const r=f.profiles.jay.run!,q=questionById(r.questions[i])!;expect(q.grade).toBe(5);answerRun(f,'jay',r.id,i,q.answer,'2026-10-26',0);if(i<5)nextQuestion(f,'jay',r.id,i);}
  expect(f.profiles.jay.run!.status).toBe('won');expect(validateFamily(f)).toEqual(f);
  for(const id of Object.keys(before.profiles) as (keyof typeof f.profiles)[])if(id!=='jay')expect(f.profiles[id]).toEqual(before.profiles[id]);
 });
 it('uses only reviewed original grade-five math and never substitutes a different grade on exhaustion',()=>{
  expect(GRADE5_STARTER).toHaveLength(60);expect(COURSES[5].map(c=>c.id)).toEqual(['math','chinese','english','science','social']);
  for(const q of GRADE5_STARTER){expect(questionById(q.id)).toEqual(q);expect(q.publisher).toBeUndefined();expect(q.examSources).toBeUndefined();}
  expect(coursePublisher('jianan',5,'math')).toBeUndefined();const s=freshLearning();for(const q of [...GRADE5_STARTER,...GRADE5_MATH_EXTRA])markMastered(s,q.id);const before=structuredClone(s);expect(()=>allocateQuestions(s,5,'math',6)).toThrow();expect(s).toEqual(before);
 });
});
