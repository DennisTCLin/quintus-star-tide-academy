import {describe,it,expect} from 'vitest';
import {HANLIN_CHINESE_EXAMS} from '../hanlin-chinese-exams';
import {questionById} from '../learning';
import {allocateQuestions,allocateAdventureQuestions,freshLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {examSourceLabel} from '../exam-sources';
import {curriculumNotice} from '../school-curriculum';
describe('Hanlin historical Chinese exams',()=>{
 it('registers 130 traceable self-contained questions without claiming DOC page numbers',()=>{
  expect(HANLIN_CHINESE_EXAMS).toHaveLength(130);
  expect(new Set(HANLIN_CHINESE_EXAMS.map(q=>q.id)).size).toBe(130);
  for(const q of HANLIN_CHINESE_EXAMS){
   expect(questionById(q.id)).toBe(q);expect(q.publisher).toBe('翰林');
   expect(q.grade).toBe(4);expect(q.course).toBe('chinese');
   expect(q.options[q.answer]?.text).toBeTruthy();
   expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
   const source=q.examSources![0];expect(source.locator).toBeTruthy();
   expect(examSourceLabel(source)).not.toContain('null');
   if(!String(source.id).startsWith('hcx')&&source.id!=='hc-wx110')expect(source.page).toBeNull();
  }
  expect(curriculumNotice('yongchun',4)).toContain('優先練習');
  expect(curriculumNotice('yongchun',2)).toContain('二上第一次評量');
 });
 it('prioritizes Hanlin for Yongchun across lanes and practice, without crossing publishers',()=>{
  for(const difficulty of [1,2,3] as const){
   const s={...freshLearning(),school:'yongchun' as const};
   expect(allocateAdventureQuestions(s,4,'chinese',6,difficulty).every(q=>q.id.startsWith('hc1-'))).toBe(true);
   expect(allocateQuestions(s,4,'chinese',1)[0].id.startsWith('hc1-')).toBe(true);
  }
  for(const school of ['nantun',undefined] as const){
   expect(allocateQuestions({...freshLearning(),school},4,'chinese',6).every(q=>!q.id.startsWith('hc1-'))).toBe(true);
  }
  for(const grade of [1,2] as const){
   const q=allocateQuestions({...freshLearning(),school:'yongchun'},grade,grade===1?'tones':'words',6);
   expect(q.every(x=>!x.id.startsWith('hc1-')&&questionById(x.id)?.grade===grade)).toBe(true);
  }
 });
 it('excludes mastery and falls back to general questions after Hanlin exhaustion',()=>{
  const s={...freshLearning(),school:'yongchun' as const};
  const ids=HANLIN_CHINESE_EXAMS.map(q=>q.id);
  for(const id of ids.slice(0,-2))markMastered(s,id);
  const q=allocateQuestions(s,4,'chinese',6);
  expect(q.filter(q=>q.id.startsWith('hc1-')).map(q=>q.id).sort()).toEqual(ids.slice(-2).sort());
  expect(q.every(q=>questionById(q.id)?.publisher!=='康軒')).toBe(true);
  for(const id of ids)markMastered(s,id);
  expect(allocateQuestions(s,4,'chinese',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
 });
 it('keeps new readings self-contained with traceable PDF pages',()=>{
  const extra=HANLIN_CHINESE_EXAMS.filter(q=>q.id.startsWith('hc1-extra-'));expect(extra).toHaveLength(49);
  expect(extra.filter(q=>q.format==='short-passage')).toHaveLength(8);
  for(const q of extra){expect(q.examSources![0].page).toBeGreaterThan(0);if(q.format==='short-passage')expect(q.prompt.length).toBeGreaterThan(150);}
 });
 it('retains full reading evidence and disambiguates the inventor name',()=>{
  const reading=HANLIN_CHINESE_EXAMS.filter(q=>q.format==='short-passage'&&!q.id.startsWith('hc1-extra-'));expect(reading).toHaveLength(4);
  for(const q of reading){expect(q.prompt).toContain('三面鏡子和碎花紙');expect(q.prompt).toContain('政大少兒出版');}
  const name=questionById('hc1-hc-ca108-9-2')!;
  expect(name.prompt).toContain('完整姓名');expect(name.options[name.answer].text).toBe('大衛‧布魯斯特');
  expect(questionById('hc1-hc-wx110-5b-5')).toBeUndefined();
  const meaning=questionById('hc1-hc-wx108-2-6')!;
  expect(meaning.options[meaning.answer].text).toBe('小心翼翼／粗心大意');
 });
});
