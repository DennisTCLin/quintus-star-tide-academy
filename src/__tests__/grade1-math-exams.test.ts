import {it,expect} from 'vitest';
import {GRADE1_MATH_EXAMS} from '../grade1-math-exams';
import {questionById} from '../learning';
import {allocateQuestions,allocateAdventureQuestions,freshLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {examSourceLabel,EXAM_SOURCES} from '../exam-sources';
import {coursePublisher} from '../school-curriculum';
it('keeps complete, answerable first-grade questions and accurate grade labels',()=>{
 expect(GRADE1_MATH_EXAMS).toHaveLength(151);
 expect(new Set(GRADE1_MATH_EXAMS.map(q=>q.id)).size).toBe(151);
 for(const q of GRADE1_MATH_EXAMS){
  expect(questionById(q.id)).toBe(q);expect(q.grade).toBe(1);
  expect(q.options[q.answer]?.text).toBeTruthy();
  expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.prompt).not.toMatch(/如下圖|如右圖/);
  expect(examSourceLabel(q.examSources![0])).toContain('學年度一上');
  expect(EXAM_SOURCES[q.examSources![0].id].status).toBe('active');
  const sum=q.prompt.match(/^(\d+) 和 (\d+) 合起來/);
  if(sum)expect(Number(q.options[q.answer].text)).toBe(Number(sum[1])+Number(sum[2]));
  const ten=q.prompt.match(/^(\d+) 和幾合起來是 (\d+)/);
  if(ten)expect(Number(q.options[q.answer].text)).toBe(Number(ten[2])-Number(ten[1]));
  if(q.visual && !q.prompt.includes('第幾個'))expect(q.visual==='（空的）'?0:q.visual.split(' ').length).toBe(Number(q.options[q.answer].text));
 }
 expect(examSourceLabel({id:'km1',page:1,locator:'test',kind:'test'})).toContain('學年度四上');
});
it('selects school-matched grade-one papers in practice and all adventure lanes',()=>{
 for(const [school,publisher] of [['yongchun','翰林'],['nantun','康軒']] as const){
  expect(coursePublisher(school,1,'math')).toBe(publisher);
  for(const lane of [1,2,3] as const){
   const s={...freshLearning(),school};
   for(const selected of [allocateQuestions(s,1,'math',6),allocateAdventureQuestions(s,1,'math',6,lane)]){
    expect(selected).toHaveLength(6);
    expect(selected.every(x=>questionById(x.id)?.publisher===publisher&&questionById(x.id)?.grade===1)).toBe(true);
   }
  }
  const s={...freshLearning(),school};
  GRADE1_MATH_EXAMS.filter(q=>q.publisher===publisher).forEach(q=>markMastered(s,q.id));
  expect(allocateQuestions(s,1,'math',6).every(x=>!questionById(x.id)?.examSources)).toBe(true);
  expect(allocateQuestions({...freshLearning(),school},2,'math',6).every(x=>questionById(x.id)?.grade===2&&!x.id.startsWith('mxg1-'))).toBe(true);
 }
 expect(allocateQuestions(freshLearning(),1,'math',6).every(x=>!questionById(x.id)?.examSources)).toBe(true);
 expect(GRADE1_MATH_EXAMS.every(q=>q.publisher!=='南一')).toBe(true);
});

it('retains original identities and serves the supplement after old Hanlin mastery',()=>{
 expect(GRADE1_MATH_EXAMS.filter(q=>q.id.startsWith('mxg1-'))).toHaveLength(44);
 const extra=GRADE1_MATH_EXAMS.filter(q=>q.id.startsWith('m1hx-'));
 expect(extra).toHaveLength(107);
 expect(GRADE1_MATH_EXAMS.filter(q=>q.publisher==='翰林')).toHaveLength(134);
 const state={...freshLearning(),school:'yongchun' as const};
 for(const q of GRADE1_MATH_EXAMS.filter(q=>q.id.startsWith('mxg1-')&&q.publisher==='翰林'))markMastered(state,q.id);
 expect(allocateQuestions(state,1,'math',6).every(q=>q.id.startsWith('m1hx-'))).toBe(true);
 for(const q of extra){
  expect(q.id).toMatch(/^[a-z0-9-]{2,40}$/);expect(q.publisher).toBe('翰林');
  expect(q.examSources![0].id).not.toMatch(/g1hx(9|10)$/);
 }
 const find=(loc:string)=>extra.find(q=>q.examSources![0].id==='g1hx6'&&q.examSources![0].locator===loc)!;
 expect(find('二5黑').visual).toBe('□ □ □ ■ □ △ □ □');
 expect(find('二5黑').options[find('二5黑').answer].text).toBe('4');
 expect(find('二5異').options[find('二5異').answer].text).toBe('3');
});
