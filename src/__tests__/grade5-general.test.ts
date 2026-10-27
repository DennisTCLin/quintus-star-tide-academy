import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {GRADE5_GENERAL} from '../grade5-general';
import {GRADE5_STARTER} from '../grade5-starter';
import {COURSES} from '../course-catalog';
import {newFamily,validateFamily,startRun,answerRun,nextQuestion} from '../adventure';
import {questionById} from '../learning';
import {freshLearning,allocateQuestions} from '../learning-engine';
import {markMastered} from '../mastered-questions';
const subjects=['chinese','english','science','social'] as const;
describe('grade five general courses',()=>{
 it('retains the original reviewed maths and adds twenty independent reviewed questions per new course',()=>{
  expect(createHash('sha256').update(readFileSync('src/grade5-starter.ts')).digest('hex')).toBe('abfc9b84ee8514315b57408c87cfbf24ed56a05fc28cd999f3a96077fe31a9fd');
  expect(GRADE5_GENERAL).toHaveLength(80);expect(GRADE5_STARTER).toHaveLength(60);
  expect(new Set([...GRADE5_STARTER,...GRADE5_GENERAL].map(q=>q.id)).size).toBe(140);
  expect(COURSES[5].map(c=>c.id)).toEqual(['math',...subjects]);
  for(const course of subjects){
   const rows=GRADE5_GENERAL.filter(q=>q.course===course);expect(rows).toHaveLength(20);
   expect([0,1,2,3].map(i=>rows.filter(q=>q.answer===i).length)).toEqual([5,5,5,5]);
   for(const q of rows){expect(q.grade).toBe(5);expect(q.skill).toBe(course);expect(q.publisher).toBeUndefined();expect(q.examSources).toBeUndefined();expect(questionById(q.id)).toEqual(q);expect(new Set(q.options.map(o=>o.text)).size).toBe(4);}
  }
 });
 it.each(subjects)('completes and reloads a six-question %s challenge without changing other profiles',course=>{
  const f=newFamily(),before=structuredClone(f);startRun(f,'jay',course,`grade5-${course}`,0,false,'2026-10-26');
  for(let i=0;i<6;i++){const r=f.profiles.jay.run!,q=questionById(r.questions[i])!;expect(q.grade).toBe(5);expect(q.course).toBe(course);expect(q.id).toMatch(/^g5-general-/);answerRun(f,'jay',r.id,i,q.answer,'2026-10-26',0);if(i<5)nextQuestion(f,'jay',r.id,i);}
  expect(f.profiles.jay.run?.status).toBe('won');expect(validateFamily(f)).toEqual(f);
  for(const id of Object.keys(f.profiles) as (keyof typeof f.profiles)[])if(id!=='jay')expect(f.profiles[id]).toEqual(before.profiles[id]);
 });
 it.each(subjects)('never substitutes old grades when grade-five %s is exhausted',course=>{
  const s=freshLearning();for(const q of GRADE5_GENERAL.filter(q=>q.course===course))markMastered(s,q.id);const before=structuredClone(s);
  expect(()=>allocateQuestions(s,5,course,6)).toThrow();expect(s).toEqual(before);
 });
});
