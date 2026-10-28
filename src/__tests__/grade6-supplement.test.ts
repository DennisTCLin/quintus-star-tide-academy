import {it,expect} from 'vitest';
import baseline from '../../scripts/imports/grade6-supplement-baseline.json';
import {GRADE6_SUPPLEMENT_EXAMS as bank} from '../grade6-supplement-exams';
import {GRADE6_GENERAL_PRACTICE} from '../grade6-general-practice';
import {allocateQuestions,freshLearning} from '../learning-engine';
import {newFamily,startRun,validateFamily} from '../adventure';
import {questionById} from '../learning';
import {markMastered} from '../mastered-questions';
import {routeForCourse} from '../subject-islands';
import {startStudy,answerStudy} from '../study-review';
const courses=['chinese','science','social'] as const;
it('has source-located self-contained grade-six questions with distinct options',()=>{
 expect(new Set(bank.map(q=>q.id)).size).toBe(bank.length);
 for(const c of courses)expect(bank.filter(q=>q.course===c).length).toBeGreaterThanOrEqual(30);
 for(const q of bank){expect(q.grade).toBe(6);expect(q.publisher).toBe(q.course==='science'?'翰林':'康軒');if(q.retired){expect(q.retirementReason).toBeTruthy();expect(q.examSources).toEqual([]);}else expect(q.examSources?.length).toBeGreaterThan(0);expect(q.visual).toBeUndefined();expect(q.audio).toBeUndefined();expect(q.options[q.answer]?.text).toBeTruthy();expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);expect(questionById(q.id)).toEqual(q);}
});
it('routes all new courses to matching sixth-grade school only, preserving other profiles',()=>{
 for(const [course,island] of [['chinese','wood'],['science','fire'],['social','earth']] as const){
  const f=newFamily();f.profiles.alston.learning.school='jianan';const old=structuredClone(f.profiles.quintus);
  startRun(f,'alston',course,'g6-'+course,0,false,'2026-10-26');expect(routeForCourse(6,course).island).toBe(island);
  expect(f.profiles.alston.run!.questions).toHaveLength(6);for(const id of f.profiles.alston.run!.questions){expect(questionById(id)?.grade).toBe(6);expect(questionById(id)?.course).toBe(course);}
  expect(validateFamily(f)).toEqual(f);expect(f.profiles.quintus).toEqual(old);
  for(const school of [undefined,'nantun'] as const){const l=freshLearning();l.school=school;const alloc=allocateQuestions(l,6,course,6);expect(alloc).toHaveLength(6);expect(alloc.every(a=>questionById(a.id)?.grade===6)).toBe(true);}
 }
});
it('retains mastery on exhaustion and supports review for each new course',()=>{
 for(const course of courses){const f=newFamily(),p=f.profiles.alston;p.learning.school='jianan';for(const q of bank.filter(q=>q.course===course))markMastered(p.learning,q.id);for(const q of GRADE6_GENERAL_PRACTICE.filter(q=>q.course===course))markMastered(p.learning,q.id);
 const before=structuredClone(p);expect(()=>allocateQuestions(p.learning,6,course,6)).toThrow();expect(p).toEqual(before);
 startStudy(p.learning,6,'2026-10-26','review-'+course,'all');const q=questionById(p.learning.study!.session!.questions[0])!;expect(q.course).toBe(course);answerStudy(p.learning,6,'review-'+course,0,q.answer,'2026-10-26');expect(p.learning.mastered).toEqual(before.learning.mastered);expect(p.coins).toBe(before.coins);expect(p.tickets).toBe(before.tickets);
 }
});

it('preserves released question IDs and lets an existing learner continue into new content',()=>{
 for(const course of courses){
  const l=freshLearning();l.school='jianan';const oldIds=baseline.idsByCourse[course];
  for(const id of oldIds){expect(questionById(id)?.course).toBe(course);markMastered(l,id);}
  const mastered=structuredClone(l.mastered);const selected=allocateQuestions(l,6,course,6);
  expect(selected).toHaveLength(6);expect(new Set(selected.map(x=>x.id)).size).toBe(6);
  for(const q of selected){expect(oldIds).not.toContain(q.id);expect(questionById(q.id)?.course).toBe(course);expect(questionById(q.id)?.grade).toBe(6);}
  expect(l.mastered).toEqual(mastered);
 }
});
