import {describe,it,expect} from 'vitest';
import {GRADE6_MATH_EXAMS} from '../grade6-math-exams';
import {newFamily,validateFamily,startRun} from '../adventure';
import {freshLearning,allocateQuestions} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {questionById} from '../learning';
import {COURSES} from '../course-catalog';
import {coursePublisher,curriculumNotice} from '../school-curriculum';
import {startStudy,answerStudy} from '../study-review';
import {routeForCourse} from '../subject-islands';
describe('Alston grade-six curriculum and migration',()=>{
 it('retains every old profile and adds an unconfirmed sixth-grade slot without rewards',()=>{
  const original=newFamily();original.profiles.quintus.coins=437;original.profiles.feifei.tickets=13;
  const old:any=structuredClone(original);old.version=7;delete old.profiles.alston;
  const loaded=validateFamily(old);expect(loaded.version).toBe(9);
  for(const id of ['quintus','feifei','qingqing','doudou'] as const)expect(loaded.profiles[id]).toEqual(original.profiles[id]);
  expect(loaded.profiles.alston.onboarding).toEqual({pet:null,confirmed:false});
  expect(loaded.profiles.alston.coins).toBe(original.profiles.alston.coins);
  expect(old.profiles.alston).toBeUndefined();
  const corrupt:any=structuredClone(loaded);delete corrupt.profiles.alston;expect(()=>validateFamily(corrupt)).toThrow();
  expect(validateFamily(loaded)).toEqual(loaded);
 });
 it('registers 289 unique questions with all ten source files and source-located corrections',()=>{
  expect(GRADE6_MATH_EXAMS).toHaveLength(289);expect(new Set(GRADE6_MATH_EXAMS.map(q=>q.id)).size).toBe(289);
  expect(new Set(GRADE6_MATH_EXAMS.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(10);
  const answer=(id:string,locator:string)=>{const q=GRADE6_MATH_EXAMS.find(q=>q.examSources!.some(s=>s.id===id&&s.locator===locator))!;return q.options[q.answer].text;};
  expect(answer('g6k2','六5')).toBe('2/3');expect(answer('g6k3','五4杯')).toBe('3');expect(answer('g6k3','五4餘')).toBe('0.6');expect(answer('g6k4','一4')).toBe('9');
  for(const q of GRADE6_MATH_EXAMS){expect(questionById(q.id)).toEqual(q);expect(q.grade).toBe(6);expect(q.course).toBe('math');}
 });
 it('allocates six grade-six math items only for the matching school and rejects unavailable courses',()=>{
  const f=newFamily();f.profiles.alston.learning.school='jianan';startRun(f,'alston','math','grade6',0,false,'2026-10-26');
  expect(f.profiles.alston.run!.questions).toHaveLength(6);
  expect(f.profiles.alston.run!.questions.every(id=>questionById(id)?.grade===6)).toBe(true);
  expect(validateFamily(f)).toEqual(f);expect(COURSES[6].map(c=>c.id)).toEqual(['math','english','chinese','science','social']);
  expect(()=>routeForCourse(6,'tones')).toThrow();expect(coursePublisher('jianan',6,'math')).toBe('康軒');expect(curriculumNotice('jianan',6)).toContain('草案');
  for(const school of [undefined,'nantun'] as const){const l=freshLearning();l.school=school;expect(()=>allocateQuestions(l,6,'math',6)).toThrow();}
 });
 it('never falls back to lower-grade questions or resets mastery when grade-six content runs out',()=>{
  const l=freshLearning();l.school='jianan';for(const q of GRADE6_MATH_EXAMS)markMastered(l,q.id);
  const before=structuredClone(l);expect(()=>allocateQuestions(l,6,'math',6)).toThrow();expect(l).toEqual(before);
 });
 it('reviews known grade-six questions without changing rewards or mastery',()=>{
  const f=newFamily(),p=f.profiles.alston;p.learning.school='jianan';
  for(const q of GRADE6_MATH_EXAMS.slice(0,6))markMastered(p.learning,q.id);
  const before=structuredClone(p);startStudy(p.learning,6,'2026-10-26','review6','all');
  const q=questionById(p.learning.study!.session!.questions[0])!;expect(q.grade).toBe(6);
  answerStudy(p.learning,6,'review6',0,q.answer,'2026-10-26');
  const {learning,...after}=p;const {learning:old,...rest}=before;
  expect(after).toEqual(rest);expect(learning.mastered).toEqual(old.mastered);expect(validateFamily(f)).toEqual(f);
 });

});
