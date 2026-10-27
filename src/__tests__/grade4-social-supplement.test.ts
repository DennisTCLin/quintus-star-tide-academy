import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import QuestionPrompt from '../QuestionPrompt';
import rows from '../data/social-supplement-20261026.json';
import original from '../data/social-exams-20261025.json';
import {SOCIAL_EXAMS} from '../social-exams';
import {EXAM_SOURCES} from '../exam-sources';
import {questionById} from '../learning';
import {allocateQuestions,allocateAdventureQuestions,freshLearning,validateLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
const newQuestions=SOCIAL_EXAMS.filter(q=>q.id.startsWith('soc1-ksn'));
it('preserves 83 original IDs and all 268 supplement source locators across 203 new questions',()=>{
 expect(rows).toHaveLength(268);expect(newQuestions).toHaveLength(203);expect(SOCIAL_EXAMS).toHaveLength(286);
 expect(new Set(newQuestions.map(q=>q.id)).size).toBe(203);
 expect(new Set(newQuestions.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(10);
 expect(newQuestions.flatMap(q=>q.examSources!)).toHaveLength(268);
 for(const row of original)expect(questionById(row.id)?.options[questionById(row.id)!.answer].text).toBe(row.options[row.answer]);
 for(const row of rows){
  const matches=SOCIAL_EXAMS.filter(q=>q.examSources!.some(s=>s.id===row.sourceId&&s.locator===row.locator));
  expect(matches).toHaveLength(1);const q=matches[0];
  expect(q.options[q.answer].text).toBe(row.options[row.answer]);
  expect(q.grade).toBe(4);expect(q.course).toBe('social');expect(q.publisher).toBe('康軒');
  expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.prompt).not.toMatch(/如下圖|如右圖|如左圖|EMBED/);
  for(const source of q.examSources!){expect(EXAM_SOURCES[source.id].status).toBe('active');expect([1,2,3,4]).toContain(source.page);}
 }
});
it('offers new questions after old mastery for all three schools and preserves saved progress',()=>{
 for(const school of ['nantun','yongchun','dunhua'] as const){
  const state={...freshLearning(),school};original.forEach(r=>markMastered(state,r.id));
  const restored=validateLearning(JSON.parse(JSON.stringify(state)),4);
  for(const lane of [1,2,3] as const){
   const chosen=allocateAdventureQuestions(restored,4,'social',6,lane);
   expect(chosen).toHaveLength(6);expect(chosen.every(q=>q.id.startsWith('soc1-ksn'))).toBe(true);
  }
  expect(allocateQuestions(restored,4,'social',6).every(q=>q.id.startsWith('soc1-ksn'))).toBe(true);
  newQuestions.forEach(q=>markMastered(restored,q.id));
  expect(allocateQuestions(restored,4,'social',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
 }
});
it('renders full source data and reading conditions in the actual question component',()=>{
 for(const id of ['soc1-ksn1-5-3-1','soc1-ksn2-4-1-1','soc1-ksn4-6-1','soc1-ksn7-6-2-1','soc1-ksn10-5-2-2']){
  const q=questionById(id)!;expect(q).toBeTruthy();expect(q.format).toBe('short-passage');
  const html=renderToStaticMarkup(createElement(QuestionPrompt,{question:q,grade:4}));
  for(const line of q.prompt.split('\n').filter(Boolean))expect(html).toContain(line);
 }
 expect(questionById('soc1-ksn7-6-2-1')!.prompt).toContain('16.6℃');
 expect(questionById('soc1-ksn10-5-2-2')!.prompt).not.toContain('臺北市蘆洲');
});
it('excludes ambiguous electronic-map, earthquake and incomplete-image questions',()=>{
 for(const id of ['soc1-ksn6-2-8','soc1-ksn6-2-9','soc1-ksn6-2-15','soc1-ksn7-2-4','soc1-ksn7-2-8','soc1-ksn8-2-9','soc1-ksn8-2-11'])expect(questionById(id)).toBeUndefined();
 expect(questionById('soc1-ksn2-2-6')!.explanation).not.toContain('原卷');
 expect(questionById('soc1-ksn4-1-7')!.prompt).toContain('桃葉');
});
