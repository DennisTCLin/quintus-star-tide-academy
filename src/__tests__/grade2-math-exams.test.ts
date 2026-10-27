import {it,expect} from 'vitest';
import {GRADE2_MATH_EXAMS as bank} from '../grade2-math-exams';
import {allocateQuestions,allocateAdventureQuestions,freshLearning} from '../learning-engine';
import {questionById} from '../learning';
import {markMastered} from '../mastered-questions';
import {coursePublisher} from '../school-curriculum';
import {examSourceLabel} from '../exam-sources';
import {newFamily,startRun,validateFamily} from '../adventure';
it('keeps source-traceable, self-contained second-grade math with independently recalculated arithmetic',()=>{
 expect(bank).toHaveLength(172);expect(new Set(bank.map(q=>q.id)).size).toBe(bank.length);
 expect(new Set(bank.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(5);
 for(const q of bank){
  expect(questionById(q.id)).toBe(q);expect(q.grade).toBe(2);expect(q.publisher).toBe('南一');expect(q.course).toBe('math');
  expect(q.options[q.answer]?.text).toBeTruthy();expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.prompt).not.toMatch(/看圖|如下圖|右圖|左圖|量一量|用直尺畫/);
  for(const s of q.examSources!){expect(examSourceLabel(s)).toContain('二上');expect([1,2]).toContain(s.page);}
  const calculation=q.prompt.match(/^(\d+) ([＋－]) (\d+) ＝（　），應填多少？$/);
  if(calculation){const [,a,op,b]=calculation;expect(Number(q.options[q.answer].text)).toBe(op==='＋'?Number(a)+Number(b):Number(a)-Number(b));}
  const length=q.prompt.match(/兩端對齊尺上的 (\d+) 公分和 (\d+) 公分刻度/);
  if(length)expect(q.options[q.answer].text).toBe(`${Number(length[2])-Number(length[1])}公分`);
 }
});
it('ignores stale invisible PDF2 answers and handles inverse word problems correctly',()=>{
 for(const [source,locator,answer] of [['g2mn2','二(1)','89'],['g2mn2','二(2)','132'],['g2mn2','二(3)','38'],['g2mn2','二(4)','33'],['g2mn2','三(1)','39'],['g2mn2','八(1)','48頁'],['g2mn2','八(2)','120元'],['g2mn2','八(3)','139頭'],['g2mn3','五(3)','116元'],['g2mn3','五(6)','99下'],['g2mn5','八2','84張']]){
  const q=bank.find(q=>q.examSources!.some(s=>s.id===source&&s.locator===locator))!;expect(q).toBeTruthy();expect(q.options[q.answer].text).toBe(answer);
 }
});
it('prioritizes both school banks in practice and every adventure lane, with unknown/other-grade isolation and mastery fallback',()=>{
 for(const school of ['yongchun','nantun'] as const){
  expect(coursePublisher(school,2,'math')).toBe('南一');
  for(const level of [1,2,3] as const)for(const picked of [allocateQuestions({...freshLearning(),school},2,'math',6),allocateAdventureQuestions({...freshLearning(),school},2,'math',6,level)]){
   expect(picked).toHaveLength(6);expect(new Set(picked.map(q=>q.id)).size).toBe(6);expect(picked.every(q=>q.id.startsWith('mxg2-'))).toBe(true);
  }
  for(const grade of [1,4] as const)expect(allocateQuestions({...freshLearning(),school},grade,'math',6).every(q=>!q.id.startsWith('mxg2-'))).toBe(true);
  const state={...freshLearning(),school};bank.forEach(q=>markMastered(state,q.id));expect(allocateQuestions(state,2,'math',6).every(q=>!q.id.startsWith('mxg2-'))).toBe(true);
 }
 expect(allocateQuestions(freshLearning(),2,'math',6).every(q=>!q.id.startsWith('mxg2-'))).toBe(true);
});
it('preserves ongoing grade-two sessions when school-matched sources become available',()=>{
 const family=newFamily();startRun(family,'feifei','math','old-math',7);const ids=[...family.profiles.feifei.run!.questions];family.profiles.feifei.learning.school='nantun';
 const restored=validateFamily(family);expect(restored.profiles.feifei.run!.questions).toEqual(ids);
});
