import {it,expect} from 'vitest';
import rows from '../data/math-exams-20261025.json';
import {MATH_EXAMS as allMathExams} from '../math-exams';
const MATH_EXAMS=allMathExams.filter(q=>q.publisher!=='南一');
import {EXAM_SOURCES,examSourceLabel} from '../exam-sources';
import {allocateQuestions,allocateAdventureQuestions,freshLearning,validateLearning} from '../learning-engine';
import {questionById} from '../learning';
import {markMastered} from '../mastered-questions';
import {coursePublisher,mathCurriculumNotice} from '../school-curriculum';
import {newFamily,startRun,validateFamily} from '../adventure';
const schools=[['yongchun','康軒'],['nantun','翰林']] as const;
it('keeps 246 independently solved questions traceable to all eleven sources',()=>{
 expect(rows).toHaveLength(246);expect(MATH_EXAMS).toHaveLength(246);
 expect(new Set(MATH_EXAMS.map(q=>q.id)).size).toBe(246);
 expect(MATH_EXAMS.filter(q=>q.publisher==='康軒')).toHaveLength(92);
 expect(MATH_EXAMS.filter(q=>q.publisher==='翰林')).toHaveLength(154);
 expect(new Set(MATH_EXAMS.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(11);
 for(const q of MATH_EXAMS){
  expect(questionById(q.id)).toBe(q);expect(q.grade).toBe(4);expect(q.course).toBe('math');
  expect(q.options[q.answer]?.text).toBeTruthy();expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.prompt).not.toMatch(/如下圖|如右圖|EMBED|eq \\/);
  for(const s of q.examSources!){expect(EXAM_SOURCES[s.id].status).toBe('active');expect(s.id==='km4'?s.page===null:[1,2].includes(s.page!)).toBe(true);expect(examSourceLabel(s)).toContain(q.publisher);}
 }
 for(const row of rows){
  const q=MATH_EXAMS.find(q=>q.examSources!.some(s=>s.id===row.sourceId&&s.locator===row.locator))!;
  expect(q.options[q.answer].text).toBe(row.options[row.answer]);
 }
});
it('prioritizes the correct math publisher in every lane, adventure, and practice',()=>{
 for(const [school,publisher] of schools){
  expect(coursePublisher(school,4,'math')).toBe(publisher);expect(mathCurriculumNotice(school)).toContain(publisher);
  for(const lane of [1,2,3] as const){
   const s={...freshLearning(),school};
   const selected=allocateAdventureQuestions(s,4,'math',6,lane);
   expect(selected).toHaveLength(6);expect(selected.every(q=>questionById(q.id)?.publisher===publisher)).toBe(true);
   expect(questionById(allocateQuestions(s,4,'math',1)[0].id)?.publisher).toBe(publisher);
  }
 }
});
it('keeps generated math for unknown schools and isolates grade-four exams from younger pupils',()=>{
 expect(allocateQuestions(freshLearning(),4,'math',6).every(q=>q.id.startsWith('n1-'))).toBe(true);
 for(const grade of [2] as const){
  for(const [school] of schools){
   expect(coursePublisher(school,grade,'math')).toBe('南一');
   const selected=allocateQuestions({...freshLearning(),school},grade,'math',6);
   expect(selected.every(q=>questionById(q.id)?.grade===grade&&!q.id.startsWith('mx1-'))).toBe(true);
  }
 }
});
it('excludes mastered math and other publishers after restoration, then falls back to generators',()=>{
 for(const [school,publisher] of schools){
  let s={...freshLearning(),school};const ids=MATH_EXAMS.filter(q=>q.publisher===publisher).map(q=>q.id);
  ids.slice(0,-2).forEach(id=>markMastered(s,id));s=validateLearning(JSON.parse(JSON.stringify(s)),4) as typeof s;
  const q=allocateQuestions(s,4,'math',6);
  expect(q.filter(q=>q.id.startsWith('mx1-')).map(q=>q.id).sort()).toEqual(ids.slice(-2).sort());
  expect(q.filter(q=>!q.id.startsWith('mx1-')).every(q=>q.id.startsWith('n1-'))).toBe(true);
  expect(new Set(q.map(q=>q.id)).size).toBe(6);
  ids.forEach(id=>markMastered(s,id));expect(allocateQuestions(s,4,'math',6).every(q=>q.id.startsWith('n1-'))).toBe(true);
 }
});
it('preserves historical generated math runs when school becomes known',()=>{
 const f=newFamily();startRun(f,'quintus','math','before-school',0);
 const ids=[...f.profiles.quintus.run!.questions];f.profiles.quintus.learning.school='yongchun';
 expect(validateFamily(JSON.parse(JSON.stringify(f))).profiles.quintus.run!.questions).toEqual(ids);
 expect(ids.every(id=>questionById(id))).toBe(true);
});
it('resolves carry, remainder, rounding-up, and corrupted source-answer pitfalls',()=>{
 const answer=(id:string)=>{const q=questionById(id)!;return q.options[q.answer].text;};
 expect(answer('mx1-hm4-1-2')).toBe('600×400');
 expect(answer('mx1-hm1-2-12')).toBe('6個');
 expect(answer('mx1-hm6-2-5-里程')).toBe('168公里');
 expect(answer('mx1-hm3-8-1')).toBe('23盒，還要3顆');
 expect(answer('mx1-hm5-8-2')).toBe('136枝，還差6元');
 expect(answer('mx1-hm6-1-8')).toBe('169袋');
 expect(answer('mx1-hm2-6-6')).toBe('11公里4公尺');
 expect(answer('mx1-km3-2-4')).toBe('0、1、2、3、4、5、6');
 expect(questionById('mx1-km3-6-3')).toBeUndefined();
 expect(questionById('mx1-hm7-1-3')).toBeUndefined();
 const q=questionById('mx1-hm7-6-5-1')!;expect(q.format).toBe('short-passage');expect(q.prompt).toContain('沿同一路線');
});
