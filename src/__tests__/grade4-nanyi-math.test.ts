import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import QuestionPrompt from '../QuestionPrompt';
import {it,expect} from 'vitest';
import rows from '../data/math-nanyi-20261026.json';
import originalRows from '../data/math-exams-20261025.json';
import {MATH_EXAMS} from '../math-exams';
import {EXAM_SOURCES} from '../exam-sources';
import {questionById} from '../learning';
import {allocateQuestions,allocateAdventureQuestions,freshLearning,validateLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {coursePublisher,englishCurriculumNotice} from '../school-curriculum';
import {newFamily,startRun,validateFamily} from '../adventure';
const exams=MATH_EXAMS.filter(q=>q.publisher==='南一');
it('imports 319 distinct complete questions with all 324 source locators intact',()=>{
 expect(rows).toHaveLength(324);expect(exams).toHaveLength(319);
 expect(new Set(exams.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(10);
 expect(exams.flatMap(q=>q.examSources!)).toHaveLength(324);
 for(const q of exams){
  expect(questionById(q.id)).toBe(q);expect(q.grade).toBe(4);expect(q.course).toBe('math');
  expect(q.options[q.answer]?.text).toBeTruthy();expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.prompt).not.toMatch(/如下圖|如右圖|EMBED|eq \\/);
  for(const s of q.examSources!){
   expect(EXAM_SOURCES[s.id].status).toBe('active');expect(s.locator).toBeTruthy();
   expect(['nm8','nm9','nm10'].includes(s.id)?s.page===null:[1,2,3,4].includes(s.page!)).toBe(true);
  }
 }
 for(const row of rows){
  const q=exams.find(q=>q.examSources!.some(s=>s.id===row.sourceId&&s.locator===row.locator))!;
  expect(q.options[q.answer].text).toBe(row.options[row.answer]);
 }
 for(const row of originalRows)expect(questionById(row.id)).toBeTruthy();
 expect(questionById('mx1-nm1-1-2')!.examSources!.map(s=>s.id)).toEqual(['nm1','nm4']);
});
it('routes Dunhua across all lanes and courses while isolating schools and grades',()=>{
 for(const difficulty of [1,2,3] as const){
  expect(allocateAdventureQuestions({...freshLearning(),school:'dunhua'},4,'math',6,difficulty).every(q=>questionById(q.id)?.publisher==='南一')).toBe(true);
 }
 for(const [course,publisher] of [['math','南一'],['chinese','康軒'],['science','康軒'],['social','康軒']] as const){
  expect(coursePublisher('dunhua',4,course)).toBe(publisher);
  expect(allocateQuestions({...freshLearning(),school:'dunhua'},4,course,6).every(q=>questionById(q.id)?.publisher===publisher)).toBe(true);
 }
 for(const [school,publisher] of [['yongchun','康軒'],['nantun','翰林']] as const){
  expect(allocateQuestions({...freshLearning(),school},4,'math',6).every(q=>questionById(q.id)?.publisher===publisher)).toBe(true);
 }
 for(const grade of [1,2] as const){
  expect(allocateQuestions({...freshLearning(),school:'dunhua'},grade,'math',6).every(q=>questionById(q.id)?.grade===grade&&!q.id.startsWith('mx1-'))).toBe(true);
 }
 expect(allocateQuestions(freshLearning(),4,'math',6).every(q=>!q.id.startsWith('mx1-'))).toBe(true);
});
it('does not assign Here We Go 3 to Dunhua Here We Go 7 learners',()=>{
 expect(englishCurriculumNotice('dunhua')).toContain('Here We Go 7');
 for(const difficulty of [1,2,3] as const){
  const questions=allocateAdventureQuestions({...freshLearning(),school:'dunhua'},4,'english',6,difficulty);
  expect(questions).toHaveLength(6);
  expect(questions.every(q=>!questionById(q.id)?.examSources)).toBe(true);
 }
 const nantun=allocateQuestions({...freshLearning(),school:'nantun'},4,'english',6);
 expect(nantun.every(q=>questionById(q.id)?.examSources?.every(s=>'book' in EXAM_SOURCES[s.id]&&(EXAM_SOURCES[s.id] as {book:string}).book==='Here We Go 3'))).toBe(true);
});
it('preserves old runs and mastered progress, then falls back without changing publisher',()=>{
 const family=newFamily();startRun(family,'quintus','math','before-dunhua',0);
 const ids=[...family.profiles.quintus.run!.questions];family.profiles.quintus.learning.school='dunhua';
 expect(validateFamily(JSON.parse(JSON.stringify(family))).profiles.quintus.run!.questions).toEqual(ids);
 const s={...freshLearning(),school:'dunhua' as const};
 for(const q of exams.slice(0,-2))markMastered(s,q.id);
 const restored=validateLearning(JSON.parse(JSON.stringify(s)),4);
 const chosen=allocateQuestions(restored,4,'math',6);
 expect(chosen.filter(q=>q.id.startsWith('mx1-')).map(q=>q.id).sort()).toEqual(exams.slice(-2).map(q=>q.id).sort());
 for(const q of exams)markMastered(restored,q.id);
 expect(allocateQuestions(restored,4,'math',6).every(q=>q.id.startsWith('n1-'))).toBe(true);
});
it('covers source pitfalls: equality, place value, remainder, clock context and missing conditions',()=>{
 const answer=(id:string)=>{const q=questionById(id)!;return q.options[q.answer].text;};
 expect(answer('mx1-nm1-2-5')).toBe('＝');
 expect(answer('mx1-nm1-5-4')).toBe('6，餘4');
 expect(answer('mx1-nm1-6-1')).toBe('7個月');
 expect(answer('mx1-nm2-2-4b')).toBe('30000');
 expect(answer('mx1-nm9-7-1')).toBe('32公斤');
 expect(questionById('mx1-nm10-3-5b')!.prompt).toContain('鐘面上的');
 for(const id of ['mx1-nm1-1-7','mx1-nm4-4-1','mx1-nm9-1-2'])expect(questionById(id)).toBeUndefined();
});

it('renders complete conditions for source questions through the actual question component',()=>{
 for(const id of ['mx1-nm1-6-5','mx1-nm9-7-1','mx1-nm10-3-5b']){
  const question=questionById(id)!;
  const html=renderToStaticMarkup(createElement(QuestionPrompt,{question,grade:4}));
  expect(html).toContain(question.prompt);
 }
});
