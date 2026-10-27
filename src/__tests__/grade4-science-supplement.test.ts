import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import QuestionPrompt from '../QuestionPrompt';
import rows from '../data/science-supplement-20261026.json';
import original from '../data/science-exams-20261025.json';
import {SCIENCE_EXAMS} from '../science-exams';
import {EXAM_SOURCES} from '../exam-sources';
import {questionById} from '../learning';
import {allocateQuestions,allocateAdventureQuestions,freshLearning,validateLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
const added=SCIENCE_EXAMS.filter(q=>q.id.startsWith('sx1-ksu'));
const baseline=SCIENCE_EXAMS.filter(q=>!q.id.startsWith('sx1-ksu'));
it('retains 130 original questions and 373 supplement locators on 196 new questions',()=>{
 expect(baseline).toHaveLength(130);expect(rows).toHaveLength(373);expect(added).toHaveLength(196);expect(SCIENCE_EXAMS).toHaveLength(326);
 expect(new Set(added.map(q=>q.id)).size).toBe(196);
 expect(new Set(added.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(10);
 expect(added.flatMap(q=>q.examSources!)).toHaveLength(373);
 for(const row of [...original,...rows]){
  const matches=SCIENCE_EXAMS.filter(q=>q.examSources!.some(s=>s.id===row.sourceId&&s.locator===row.locator));
  expect(matches).toHaveLength(1);const q=matches[0];
  expect(questionById(q.id)).toBe(q);expect(q.options[q.answer].text).toBe(row.options[row.answer]);
  expect(q.grade).toBe(4);expect(q.course).toBe('science');expect(q.publisher).toBe('康軒');
  expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.prompt).not.toMatch(/如下圖|如右圖|如左圖|月相|觀測月亮|EMBED/);
  for(const ref of q.examSources!){expect(EXAM_SOURCES[ref.id].status).toBe('active');expect([1,2,3]).toContain(ref.page);}
 }
});
it('routes all three schools to unmastered new questions after old mastery and falls back when exhausted',()=>{
 for(const school of ['nantun','yongchun','dunhua'] as const){
  const state={...freshLearning(),school};baseline.forEach(q=>markMastered(state,q.id));
  const restored=validateLearning(JSON.parse(JSON.stringify(state)),4);
  for(const lane of [1,2,3] as const){
   const chosen=allocateAdventureQuestions(restored,4,'science',6,lane);
   expect(chosen).toHaveLength(6);expect(chosen.every(q=>q.id.startsWith('sx1-ksu'))).toBe(true);
  }
  expect(allocateQuestions(restored,4,'science',6).every(q=>q.id.startsWith('sx1-ksu'))).toBe(true);
  added.forEach(q=>markMastered(restored,q.id));
  expect(allocateQuestions(restored,4,'science',6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
 }
});
it('renders complete reports, observation records and reading evidence through the actual component',()=>{
 for(const id of ['sx1-ksu1-6-1-1','sx1-ksu3-3-8-1','sx1-ksu4-4-2','sx1-ksu5-3-2-1','sx1-ksu7-3-4-調查表','sx1-ksu9-4-3']){
  const q=questionById(id)!;expect(q).toBeTruthy();expect(q.format).toBe('short-passage');
  const html=renderToStaticMarkup(createElement(QuestionPrompt,{question:q,grade:4}));
  for(const line of q.prompt.split('\n').filter(Boolean))expect(html).toContain(line);
 }
 const depth=questionById('sx1-ksu1-6-1-1')!;expect(depth.options[depth.answer].text).toBe('15.5公里');
 expect(questionById('sx1-ksu4-4-2')!.prompt).toContain('深度30.6公里');
});
it('keeps scientific qualifiers and excludes old astronomy or ambiguous source assertions',()=>{
 for(const id of ['sx1-ksu1-2-6','sx1-ksu2-1-7','sx1-ksu3-2-5','sx1-ksu4-4-4','sx1-ksu4-4-5','sx1-ksu6-1-4','sx1-ksu8-2-10','sx1-ksu9-4-4','sx1-ksu10-3-7-3'])expect(questionById(id)).toBeUndefined();
 const snail=questionById('sx1-ksu1-4-2-4')!;
 expect(snail.options[snail.answer].text).toBe('腹足');expect(snail.explanation).toContain('呼吸構造不完全相同');
 expect(questionById('sx1-ksu7-3-7-1')!.prompt).toContain('蜻蜓');
 expect(questionById('sx1-ksu9-4-3')!.prompt).toContain('蠟質及微細構造');
 expect(questionById('sx1-ksu5-1-4')!.explanation).not.toContain('風化侵蝕');
});
