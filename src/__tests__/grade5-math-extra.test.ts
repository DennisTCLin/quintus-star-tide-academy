import {describe,it,expect} from 'vitest';
import {GRADE5_MATH_EXTRA} from '../grade5-math-extra';
import {GRADE5_STARTER} from '../grade5-starter';
import {LEARNING_BANK,questionById} from '../learning';
import {newFamily,validateFamily,startRun,answerRun,nextQuestion} from '../adventure';
import {markMastered} from '../mastered-questions';
describe('twenty additional grade-five maths applications',()=>{
 it('preserves the original160 general questions and80 maths while allowing separately reviewed source supplements',()=>{
  expect(GRADE5_MATH_EXTRA).toHaveLength(20);
  const grade=LEARNING_BANK.filter(q=>q.grade===5);expect(grade.filter(q=>!q.examSources)).toHaveLength(160);expect(grade.filter(q=>q.course==='math'&&!q.examSources)).toHaveLength(80);
  expect(new Set(grade.map(q=>q.id)).size).toBe(grade.length);expect([0,1,2,3].map(i=>GRADE5_MATH_EXTRA.filter(q=>q.answer===i).length)).toEqual([5,5,5,5]);
  for(const q of GRADE5_MATH_EXTRA){expect(q.grade).toBe(5);expect(q.skill).toBe('math');expect(q.publisher).toBeUndefined();expect(q.examSources).toBeUndefined();expect(questionById(q.id)).toEqual(q);expect(new Set(q.options.map(o=>o.text)).size).toBe(4);}
 });
 it('unlocks only new maths after the old60 are mastered and persists a mixed-answer challenge',()=>{
  const f=newFamily();for(const q of GRADE5_STARTER)markMastered(f.profiles.jay.learning,q.id);const before=structuredClone(f);
  startRun(f,'jay','math','extra-maths',0,false,'2026-10-26');
  for(let i=0;i<6;i++){const r=f.profiles.jay.run!,q=questionById(r.questions[i])!;expect(q.id).toMatch(/^g5-math-extra-/);answerRun(f,'jay',r.id,i,i===0||i===3?(q.answer+1)%4:q.answer,'2026-10-26',0);if(i<5)nextQuestion(f,'jay',r.id,i);expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);}
  expect(f.profiles.jay.run?.status).toBe('won');for(const who of Object.keys(f.profiles) as (keyof typeof f.profiles)[])if(who!=='jay')expect(f.profiles[who]).toEqual(before.profiles[who]);
 });
});
