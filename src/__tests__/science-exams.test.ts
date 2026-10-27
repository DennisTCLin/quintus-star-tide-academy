import {it,expect} from 'vitest';
import rows from '../data/science-exams-20261025.json';
import {SCIENCE_EXAMS} from '../science-exams';
const originalExams=SCIENCE_EXAMS.filter(q=>q.examSources!.some(s=>/^ks\d+$/.test(s.id)));
import {EXAM_SOURCES,examSourceLabel} from '../exam-sources';
import {allocateQuestions,allocateAdventureQuestions,freshLearning,validateLearning} from '../learning-engine';
import {questionById} from '../learning';
import {markMastered} from '../mastered-questions';
import {coursePublisher,scienceCurriculumNotice} from '../school-curriculum';
import {newFamily,startRun,validateFamily} from '../adventure';
it('deduplicates 132 source rows into 130 traceable questions from nine distinct papers',()=>{
 expect(rows).toHaveLength(132);expect(originalExams).toHaveLength(130);
 expect(new Set(originalExams.map(q=>q.id)).size).toBe(130);
 expect(new Set(originalExams.flatMap(q=>q.examSources!.filter(s=>/^ks\d+$/.test(s.id)).map(s=>s.id))).size).toBe(9);
 for(const q of originalExams){
  expect(questionById(q.id)).toBe(q);expect(q.grade).toBe(4);expect(q.course).toBe('science');expect(q.publisher).toBe('康軒');
  expect(q.options[q.answer]?.text).toBeTruthy();expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.prompt).not.toMatch(/如下圖|月相|觀測月亮/);
  for(const s of q.examSources!.filter(s=>/^ks\d+$/.test(s.id))){expect(EXAM_SOURCES[s.id].status).toBe('active');expect([1,2]).toContain(s.page);expect(examSourceLabel(s)).toContain('康軒');}
 }
 expect(EXAM_SOURCES.ks6.status).toBe('duplicate');expect(EXAM_SOURCES.ks6.duplicateOf).toBe('ks5');
 expect(questionById('sx1-ks2-2-6')!.examSources!.map(s=>s.id)).toEqual(['ks2','ks3']);
 const turtle=questionById('sx1-ks4-1-2-b')!;expect(turtle.examSources!.map(s=>s.id)).toEqual(['ks4','ks8']);
 // Every source row agrees with the surviving question's answer after rotation/deduplication.
 for(const row of rows){
  const q=originalExams.find(q=>q.examSources!.some(s=>s.id===row.sourceId&&s.locator===row.locator))!;
  expect(q.options[q.answer].text).toBe(row.options[row.answer]);
 }
});
it('prioritizes parent science papers for both schools, every lane, and practice',()=>{
 for(const school of ['nantun','yongchun','dunhua'] as const){
  expect(coursePublisher(school,4,'science')).toBe('康軒');expect(scienceCurriculumNotice(school)).toContain('月亮題暫不列入');
  for(const lane of [1,2,3] as const){
   const s={...freshLearning(),school};expect(allocateAdventureQuestions(s,4,'science',6,lane).every(q=>q.id.startsWith('sx1-'))).toBe(true);
   expect(allocateQuestions(s,4,'science',1)[0].id.startsWith('sx1-')).toBe(true);
  }
 }
 expect(allocateQuestions(freshLearning(),4,'science',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
 for(const grade of [1,2] as const){
  expect(coursePublisher('nantun',grade,'science')).toBeUndefined();
  expect(allocateQuestions({...freshLearning(),school:'nantun'},grade,grade===1?'tones':'words',6).every(q=>questionById(q.id)?.grade===grade)).toBe(true);
 }
});
it('honors mastery after save restoration and uses general science after exhaustion',()=>{
 for(const school of ['nantun','yongchun','dunhua'] as const){
  let s={...freshLearning(),school};const ids=SCIENCE_EXAMS.map(q=>q.id);
  ids.slice(0,-2).forEach(id=>markMastered(s,id));s=validateLearning(JSON.parse(JSON.stringify(s)),4) as typeof s;
  const q=allocateQuestions(s,4,'science',6);
  expect(q.filter(q=>q.id.startsWith('sx1-')).map(q=>q.id).sort()).toEqual(ids.slice(-2).sort());
  expect(new Set(q.map(q=>q.id)).size).toBe(6);
  ids.forEach(id=>markMastered(s,id));expect(allocateQuestions(s,4,'science',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
 }
});
it('preserves active historical science questions when school becomes known',()=>{
 const f=newFamily();startRun(f,'quintus','science','before-school',0);
 const ids=[...f.profiles.quintus.run!.questions];f.profiles.quintus.learning.school='yongchun';
 expect(validateFamily(JSON.parse(JSON.stringify(f))).profiles.quintus.run!.questions).toEqual(ids);
 expect(ids.every(id=>questionById(id))).toBe(true);
});
it('provides complete report/table evidence and resolves scientific pitfalls',()=>{
 const report=questionById('sx1-ks1-4-1-5')!;expect(report.prompt).toContain('花蓮縣最大震度5弱');expect(report.prompt).toContain('苗栗縣最大震度3級');
 const table=questionById('sx1-ks2-5-2')!;expect(table.prompt).toContain('水流情形勾選「水流緩慢」');expect(table.options[table.answer].text).toBe('水流緩慢');
 const crab=questionById('sx1-ks3-1-10')!;expect(crab.prompt).toContain('螃蟹');expect(crab.options[crab.answer].text).toBe('不正確');
 const fish=questionById('sx1-ks3-2-5')!;expect(fish.options[fish.answer].text).toBe('大部分魚用魚鰾呼吸');
 expect(questionById('sx1-ks5-1-10')).toBeUndefined();expect(questionById('sx1-ks1-4-1-6')).toBeUndefined();
 const coral=questionById('sx1-ks1-2-16')!;expect(coral.prompt).toContain('可能');expect(coral.explanation).toContain('不是所有白化');
});
