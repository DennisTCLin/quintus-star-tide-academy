import {it,expect} from 'vitest';
import {ENGLISH_EXAMS} from '../english-exams';
import {EXAM_SOURCES} from '../exam-sources';
import {allocateQuestions,allocateAdventureQuestions,freshLearning} from '../learning-engine';
import {questionById} from '../learning';
import {markMastered} from '../mastered-questions';
import {coursePublisher} from '../school-curriculum';
it('keeps reviewed written questions traceable and excludes duplicate/old series/listening',()=>{
 expect(ENGLISH_EXAMS.length).toBe(145);
 expect(new Set(ENGLISH_EXAMS.map(q=>q.id)).size).toBe(145);
 for(const q of ENGLISH_EXAMS){
  expect(questionById(q.id)).toBe(q);
  expect(q.options[q.answer]).toBeTruthy();
  expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.audio).toBeUndefined();
  for(const s of q.examSources!){expect(EXAM_SOURCES[s.id].status).toBe('active');expect(s.locator).toBeTruthy();}
 }
 expect(EXAM_SOURCES['ke-dl111-copy'].status).toBe('duplicate');
 expect(EXAM_SOURCES['he-wx110'].status).toBe('historical-series-mismatch');
 expect(questionById('ex1-he-dd114-K-a-3')).toBeUndefined();
});
it('uses opposite publisher routing for English vs Chinese by school and honors all difficulty lanes',()=>{
 for(const [school,publisher] of [['nantun','翰林'],['yongchun','康軒']] as const){
  expect(coursePublisher(school,4,'english')).toBe(publisher);
  for(const level of [1,2,3] as const){
   const s={...freshLearning(),school};
   const qs=allocateAdventureQuestions(s,4,'english',6,level);
   expect(qs.every(q=>questionById(q.id)?.publisher===publisher)).toBe(true);
   expect(allocateQuestions(s,4,'english',1)[0].id).toMatch(/^ex[12]-/);
  }
 }
 expect(allocateQuestions(freshLearning(),4,'english',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
 expect(coursePublisher('nantun',2,'english')).toBeUndefined();
});
it('never falls back to the other publisher when matching exams are mastered',()=>{
 for(const [school,publisher] of [['nantun','翰林'],['yongchun','康軒']] as const){
  const s={...freshLearning(),school};const ids=ENGLISH_EXAMS.filter(q=>q.publisher===publisher).map(q=>q.id);
  for(const id of ids.slice(0,-1))markMastered(s,id);
  const qs=allocateQuestions(s,4,'english',6);expect(qs.filter(q=>questionById(q.id)?.examSources).map(q=>q.id)).toEqual(ids.slice(-1));
  markMastered(s,ids.at(-1)!);
  expect(allocateQuestions(s,4,'english',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
 }
});
it('preserves reading evidence, adapted image labels, and key answer corrections',()=>{
 const q=questionById('ex1-he-dd114-H-1')!;expect(q.options[q.answer].text).toBe('is');
 expect(questionById('ex1-he-sw112-11-1')!.prompt).toContain('Max | Taichung | sunny, cool | happy');
 expect(questionById('ex1-ke-wx112-G-6')!.prompt).toContain('School finishes at four');
 expect(questionById('ex1-ke-dd112-E-4')!.examSources![0].kind).toBe('原圖文字化改編');
 for(const q of ENGLISH_EXAMS.filter(q=>q.format==='short-passage'))expect(q.prompt).toContain('\n\n');
});

it('makes spelling-only clock questions self-contained without requiring an absent picture',()=>{
 for(const [id,time,answer] of [['ex1-ke-dd112-F-3','5:50','five fifty'],['ex1-ke-dd112-F-4','10:35','thirty-five']]){
  const q=questionById(id)!;
  expect(q.prompt).toContain(`It is ${time}.`);
  expect(q.prompt).toContain('Choose the correctly written time.');
  expect(q.options[q.answer].text).toBe(answer);
  expect(q.examSources![0].kind).toBe('時間線索補充改編');
 }
});

it('keeps HWG3 supplements out of Dunhua HWG7 and includes complete reading evidence',()=>{
 const extra=ENGLISH_EXAMS.filter(q=>q.id.startsWith('ex2-'));
 expect(extra).toHaveLength(41);
 for(const q of extra)expect(EXAM_SOURCES[q.examSources![0].id]).toMatchObject({book:'Here We Go 3',publisher:'翰林'});
 const state={...freshLearning(),school:'nantun' as const};
 for(const q of ENGLISH_EXAMS.filter(q=>q.id.startsWith('ex1-')&&q.publisher==='翰林'))markMastered(state,q.id);
 expect(allocateQuestions(state,4,'english',6).every(q=>q.id.startsWith('ex2-'))).toBe(true);
 const dunhua={...freshLearning(),school:'dunhua' as const};
 expect(allocateQuestions(dunhua,4,'english',6).every(q=>!q.id.startsWith('ex2-'))).toBe(true);
 expect(questionById('ex2-he-cd114-F2')!.prompt).toContain('Day 2: windy and warm');
 expect(questionById('ex2-he-tz114-8-5')!.prompt).toContain('He can’t play outside.');
});
