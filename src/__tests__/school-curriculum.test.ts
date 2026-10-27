import {describe,it,expect} from 'vitest';
import {CHINESE_EXAMS} from '../chinese-exams';
import {EXAM_SOURCES} from '../exam-sources';
import {questionById,LEARNING_BANK} from '../learning';
import {allocateQuestions,allocateAdventureQuestions,freshLearning,validateLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {newFamily,validateFamily,startRun} from '../adventure';
import {chinesePublisher} from '../school-curriculum';

describe('school-matched parent exam bank',()=>{
 it('preserves traceable sources and excludes the Nani paper',()=>{
  expect(CHINESE_EXAMS.length).toBeGreaterThan(100);
  expect(new Set(CHINESE_EXAMS.map(q=>q.id)).size).toBe(CHINESE_EXAMS.length);
  expect(new Set(CHINESE_EXAMS.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(8);
  for(const q of CHINESE_EXAMS){
   expect(questionById(q.id)).toBe(q);
   expect(q.publisher).toBe('康軒');
   expect(q.options[q.answer]?.text).toBeTruthy();
   expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
   for(const s of q.examSources!){expect(EXAM_SOURCES[s.id].status).toBe('active');expect([1,2]).toContain(s.page);expect(s.locator).toBeTruthy();}
  }
  expect(EXAM_SOURCES.sw112.school).toBe('四維國小');
  expect(EXAM_SOURCES.dd112.publisher).toBe('南一');
  expect(questionById('cx1-dd113-6-2')!.examSources![0].locator).toBe('6-5');
  expect(questionById('cx1-dd113-6-3')!.examSources![0].locator).toBe('6-6');
 });
 it('prioritizes supplied questions in adventure, practice and all difficulty lanes',()=>{
  for(const difficulty of [1,2,3] as const){
   const s={...freshLearning(),school:'nantun' as const};
   expect(allocateAdventureQuestions(s,4,'chinese',6,difficulty).every(q=>questionById(q.id)?.examSources)).toBe(true);
   expect(allocateQuestions(s,4,'chinese',1)[0].id.startsWith('cx1-')).toBe(true);
  }
 });
 it('does not assign Kang Hsuan grade-four exams to Hanlin, unknown schools or younger pupils',()=>{
  for(const school of ['yongchun',undefined] as const){
   const s={...freshLearning(),school};
   expect(allocateQuestions(s,4,'chinese',6).every(q=>questionById(q.id)?.publisher!=='康軒')).toBe(true);
  }
  for(const grade of [1,2] as const){
   const s={...freshLearning(),school:'nantun' as const};
   expect(allocateQuestions(s,grade,grade===1?'tones':'words',6).every(q=>questionById(q.id)?.grade===grade)).toBe(true);
  }
  expect(chinesePublisher('yongchun',4)).toBe('翰林');
  expect(chinesePublisher('nantun',2)).toBe('康軒');
 });
 it('does not repeat mastered exams and falls back to explicitly general questions',()=>{
  const s={...freshLearning(),school:'nantun' as const};
  const all=CHINESE_EXAMS.map(q=>q.id);
  for(const id of all.slice(0,-2))markMastered(s,id);
  const chosen=allocateQuestions(s,4,'chinese',6);
  expect(chosen.filter(q=>q.id.startsWith('cx1-')).map(q=>q.id).sort()).toEqual(all.slice(-2).sort());
  expect(new Set(chosen.map(q=>q.id)).size).toBe(6);
  for(const id of all)markMastered(s,id);
  expect(allocateQuestions(s,4,'chinese',6).every(q=>!q.id.startsWith('cx1-'))).toBe(true);
 });
 it('preserves existing saves and active question IDs when school becomes known',()=>{
  const family=newFamily();startRun(family,'quintus','chinese','old-run',7);
  const ids=[...family.profiles.quintus.run!.questions];
  family.profiles.quintus.learning.school='nantun';
  const restored=validateFamily(family);
  expect(restored.profiles.quintus.run!.questions).toEqual(ids);
  expect(restored.profiles.quintus.learning.school).toBe('nantun');
  expect(()=>validateLearning({...freshLearning(),school:'unknown'},4)).toThrow();
  expect(()=>validateFamily(newFamily())).not.toThrow();
 });
 it('retains old catalog IDs',()=>{
  expect(LEARNING_BANK.some(q=>q.id==='chinese-01')).toBe(true);
 });
 it('has complete reading context and correct polyphone answer',()=>{
  const q=questionById('cx1-sw112-2-2')!;
  expect(q.options[q.answer].text).toBe('彈弓');
  for(const q of CHINESE_EXAMS.filter(q=>q.format==='short-passage')){
   expect(q.prompt.length).toBeGreaterThan(300);
   expect(q.prompt).not.toContain('【３】');
  }
 });
});
