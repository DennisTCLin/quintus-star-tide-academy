import {it,expect} from 'vitest';
import {GRADE6_ENGLISH_EXAMS} from '../grade6-english-exams';
import {GRADE6_MATH_EXAMS} from '../grade6-math-exams';
import {GRADE6_GENERAL_PRACTICE} from '../grade6-general-practice';
import {freshLearning,allocateQuestions} from '../learning-engine';
import {newFamily,startRun,validateFamily} from '../adventure';
import {questionById} from '../learning';
import {markMastered} from '../mastered-questions';
import {startStudy,answerStudy} from '../study-review';
import {coursePublisher} from '../school-curriculum';
it('registers all ten sources with distinct IDs, non-equivalent choices and no missing media or listening dependency',()=>{
 expect(GRADE6_ENGLISH_EXAMS).toHaveLength(150);
 expect(new Set(GRADE6_ENGLISH_EXAMS.map(q=>q.id)).size).toBe(150);
 expect(new Set(GRADE6_ENGLISH_EXAMS.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(10);
 for(const q of GRADE6_ENGLISH_EXAMS){expect(q.grade).toBe(6);expect(q.course).toBe('english');expect(q.publisher).toBe('何嘉仁');expect(questionById(q.id)).toEqual(q);expect(q.audio).toBeUndefined();expect(q.options.every(o=>!o.image&&!o.audio)).toBe(true);expect(new Set(q.options.map(o=>o.text.trim())).size).toBe(q.options.length);expect(q.options[q.answer]).toBeDefined();}
 const sources=GRADE6_ENGLISH_EXAMS.flatMap(q=>q.examSources!);
 expect(sources.find(s=>s.id==='g6e7'&&s.locator==='VI1')?.page).toBe(1);
 for(const [id,loc] of [['g6e6','V7'],['g6e6','V8'],['g6e1','H3'],['g6e8','G1'],['g6e10','V9']])expect(sources.some(s=>s.id===id&&s.locator===loc)).toBe(false);
});
it('serves six English questions to Jianan grade six without replacing the math route or older-grade questions',()=>{
 const f=newFamily();f.profiles.alston.learning.school='jianan';startRun(f,'alston','english','english6',0,false,'2026-10-26');
 const r=f.profiles.alston.run!;expect(r.questions).toHaveLength(6);expect(new Set(r.questions).size).toBe(6);expect(r.questions.every(id=>questionById(id)?.grade===6&&questionById(id)?.course==='english')).toBe(true);
 expect(r.encounter.route?.island).toBe('water');expect(validateFamily(f)).toEqual(f);expect(coursePublisher('jianan',6,'english')).toBe('何嘉仁');
 const l=freshLearning();l.school='jianan';expect(allocateQuestions(l,6,'math',6).every(a=>GRADE6_MATH_EXAMS.some(q=>q.id===a.id))).toBe(true);
 for(const grade of [1,4] as const){const l=freshLearning();l.school='jianan';expect(allocateQuestions(l,grade,'english',6).every(a=>questionById(a.id)!.grade===grade)).toBe(true);}
 for(const school of [undefined,'nantun'] as const){const l=freshLearning();l.school=school;const alloc=allocateQuestions(l,6,'english',6);expect(alloc).toHaveLength(6);expect(alloc.every(a=>questionById(a.id)?.grade===6)).toBe(true);}
});
it('preserves mastery and rewards, supports English review, and never falls back to lower grades on exhaustion',()=>{
 const f=newFamily(),p=f.profiles.alston;p.learning.school='jianan';for(const q of GRADE6_ENGLISH_EXAMS)markMastered(p.learning,q.id);for(const q of GRADE6_GENERAL_PRACTICE.filter(q=>q.course==='english'))markMastered(p.learning,q.id);
 const before=structuredClone(p);expect(()=>allocateQuestions(p.learning,6,'english',6)).toThrow();expect(p).toEqual(before);
 startStudy(p.learning,6,'2026-10-26','reviewenglish','all');const q=questionById(p.learning.study!.session!.questions[0])!;expect(q.grade).toBe(6);expect(q.course).toBe('english');answerStudy(p.learning,6,'reviewenglish',0,q.answer,'2026-10-26');
 expect(p.coins).toBe(before.coins);expect(p.tickets).toBe(before.tickets);expect(p.learning.mastered).toEqual(before.learning.mastered);
});
