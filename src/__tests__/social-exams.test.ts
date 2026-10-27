import {it,expect} from 'vitest';
import rows from '../data/social-exams-20261025.json';
import {SOCIAL_EXAMS, SOCIAL_EXAMS as allSocialExams} from '../social-exams';
import {EXAM_SOURCES,examSourceLabel} from '../exam-sources';
import {allocateQuestions,allocateAdventureQuestions,freshLearning,validateLearning} from '../learning-engine';
import {questionById} from '../learning';
import {markMastered} from '../mastered-questions';
import {coursePublisher,socialCurriculumNotice} from '../school-curriculum';
import {newFamily,startRun,validateFamily} from '../adventure';
it('keeps all reviewed source rows traceable and rejects pending papers',()=>{
 const SOCIAL_EXAMS=allSocialExams.filter(q=>rows.some(row=>row.id===q.id));
 expect(rows).toHaveLength(83);expect(SOCIAL_EXAMS).toHaveLength(83);
 expect(new Set(SOCIAL_EXAMS.map(q=>q.id)).size).toBe(83);
 expect(new Set(SOCIAL_EXAMS.flatMap(q=>q.examSources!.filter(s=>s.id.startsWith('kso')).map(s=>s.id))).size).toBe(4);
 for(const q of SOCIAL_EXAMS){
  expect(questionById(q.id)).toBe(q);expect(q.grade).toBe(4);expect(q.course).toBe('social');expect(q.publisher).toBe('康軒');
  expect(q.options[q.answer]?.text).toBeTruthy();expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.prompt).not.toMatch(/如下圖|如右圖/);
  for(const s of q.examSources!.filter(s=>s.id.startsWith('kso'))){expect(EXAM_SOURCES[s.id].status).toBe('active');expect([1,2]).toContain(s.page);expect(examSourceLabel(s)).toContain('康軒');}
 }
 expect(EXAM_SOURCES.kso4.status).toBe('duplicate');expect(EXAM_SOURCES.kso4.duplicateOf).toBe('kso3');
 for(const id of ['kso6','kso7','kso8','kso9','kso10'] as const)expect(EXAM_SOURCES[id].status).toBe('scope-pending');
 // Every source row agrees with the surviving question's answer after rotation/deduplication.
 for(const row of rows){
  const q=SOCIAL_EXAMS.find(q=>q.examSources!.some(s=>s.id===row.sourceId&&s.locator===row.locator))!;
  expect(q.options[q.answer].text).toBe(row.options[row.answer]);
 }
});
it('prioritizes parent social papers for both schools, every lane, and practice',()=>{
 for(const school of ['nantun','yongchun','dunhua'] as const){
  expect(coursePublisher(school,4,'social')).toBe('康軒');expect(socialCurriculumNotice(school)).toContain('舊版其他單元暫不列入');
  for(const lane of [1,2,3] as const){
   const s={...freshLearning(),school};expect(allocateAdventureQuestions(s,4,'social',6,lane).every(q=>q.id.startsWith('soc1-'))).toBe(true);
   expect(allocateQuestions(s,4,'social',1)[0].id.startsWith('soc1-')).toBe(true);
  }
 }
 expect(allocateQuestions(freshLearning(),4,'social',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
 for(const grade of [1,2] as const){
  expect(coursePublisher('nantun',grade,'social')).toBeUndefined();
  expect(allocateQuestions({...freshLearning(),school:'nantun'},grade,grade===1?'tones':'words',6).every(q=>questionById(q.id)?.grade===grade)).toBe(true);
 }
});
it('honors mastery after save restoration and uses general social after exhaustion',()=>{
 for(const school of ['nantun','yongchun','dunhua'] as const){
  let s={...freshLearning(),school};const ids=SOCIAL_EXAMS.map(q=>q.id);
  ids.slice(0,-2).forEach(id=>markMastered(s,id));s=validateLearning(JSON.parse(JSON.stringify(s)),4) as typeof s;
  const q=allocateQuestions(s,4,'social',6);
  expect(q.filter(q=>q.id.startsWith('soc1-')).map(q=>q.id).sort()).toEqual(ids.slice(-2).sort());
  expect(new Set(q.map(q=>q.id)).size).toBe(6);
  ids.forEach(id=>markMastered(s,id));expect(allocateQuestions(s,4,'social',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
 }
});
it('preserves active historical social questions when school becomes known',()=>{
 const f=newFamily();startRun(f,'quintus','social','before-school',0);
 const ids=[...f.profiles.quintus.run!.questions];f.profiles.quintus.learning.school='yongchun';
 expect(validateFamily(JSON.parse(JSON.stringify(f))).profiles.quintus.run!.questions).toEqual(ids);
 expect(ids.every(id=>questionById(id))).toBe(true);
});
it('keeps converted graphics self-contained and excludes ambiguous source questions',()=>{
 const q=questionById('soc1-kso3-2-4')!;expect(q.prompt).toContain('圖上1公分代表實際50公尺');expect(q.options[q.answer].text).toBe('12公分');
 const reading=questionById('soc1-kso3-3-3-水池')!;expect(reading.prompt).toContain('儲水救火');expect(reading.format).toBe('short-passage');
 expect(questionById('soc1-kso5-2-17')).toBeUndefined();
 expect(questionById('soc1-kso2-2-1')!.examSources![0].locator).toBe('2-1');
});
