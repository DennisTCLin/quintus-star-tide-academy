import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import QuestionPrompt from '../QuestionPrompt';
import {describe,it,expect} from 'vitest';
import {CHINESE_EXAMS} from '../chinese-exams';
import oldRows from '../data/chinese-exams-20261025.json';
import rows from '../data/chinese-exams-20261026.json';
import {questionById} from '../learning';
import {allocateQuestions,allocateAdventureQuestions,freshLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {examSourceLabel} from '../exam-sources';
const sources=new Set(['wx112','wx109','sw109']);
const added=CHINESE_EXAMS.filter(q=>q.examSources?.some(s=>sources.has(s.id)));
const key=(r:typeof oldRows[number])=>JSON.stringify([r.prompt,[...r.options].sort(),r.passage??'']);
describe('grade-four Kang Hsuan supplement',()=>{
 it('renders the complete reading passage through the actual question component',()=>{
  for(const id of ['cx1-sw109-7-1','cx1-sw109-7-2','cx1-sw109-7-3']){
   const question=questionById(id)!;
   const html=renderToStaticMarkup(createElement(QuestionPrompt,{question,grade:4}));
   expect(html).toContain('每年的六、七月');expect(html).toContain('染白了溪水');
   expect(html).toContain('流連忘返');expect(html).toContain(question.prompt.split('\n\n').at(-1)!);
  }
 });
 it('retains prior mastery IDs and merges repeated source questions without changing their answer',()=>{
  const old=new Map<string,typeof oldRows[number]>();
  for(const row of oldRows)if(!old.has(key(row)))old.set(key(row),row);
  for(const row of old.values()){
   const q=questionById(row.id)!;
   expect(q).toBeTruthy();expect(q.options.map(o=>o.text)).toEqual(row.options);
   expect(q.answer).toBe(row.answer);expect(q.prompt).toBe(row.passage?`閱讀文章：${row.passage}\n\n${row.prompt}`:row.prompt);
  }
  expect(CHINESE_EXAMS.length-old.size).toBe(79);
  expect(rows).toHaveLength(81);
  expect(questionById('cx1-sw109-2-1b')).toBeUndefined();
  expect(questionById('cx1-dl111-2-10')!.examSources).toContainEqual({id:'sw109',page:1,locator:'2-1b',kind:'改錯字轉選擇'});
  expect(questionById('cx1-wx111-2-12')!.examSources?.some(s=>s.id==='sw109')).toBe(true);
 });
 it('keeps complete source labels, unique options and passage evidence',()=>{
  expect(added).toHaveLength(81);
  for(const q of added){
   expect(q.grade).toBe(4);expect(q.publisher).toBe('康軒');
   expect(q.options[q.answer]?.text).toBeTruthy();
   expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
   for(const s of q.examSources!){expect(examSourceLabel(s)).toContain('四上');expect(s.page).toBeGreaterThan(0);}
  }
  for(const [id,answer] of [['cx1-sw109-7-1','夏季'],['cx1-sw109-7-2','內含石灰'],['cx1-sw109-7-3','白河舉行的攝影比賽'],['cx1-wx112-3-2','立刻、馬上']]){
   const q=questionById(id)!;expect(q.options[q.answer].text).toBe(answer);
   if(q.format==='short-passage'){
    expect(q.prompt).toContain('每年的六、七月');expect(q.prompt).toContain('流連忘返');
    expect(q.prompt).not.toContain('（ˉ）');
   }
  }
 });
 it('selects new items after prior mastery and never sends grade-four Kang Hsuan items to other grades or publishers',()=>{
  const state={...freshLearning(),school:'nantun' as const};
  oldRows.forEach(q=>markMastered(state,q.id));
  for(const level of [1,2,3] as const)for(const selected of [allocateQuestions(state,4,'chinese',6),allocateAdventureQuestions(state,4,'chinese',6,level)]){
   expect(selected).toHaveLength(6);
   expect(selected.every(q=>questionById(q.id)?.examSources?.some(s=>sources.has(s.id)))).toBe(true);
  }
  for(const school of ['yongchun',undefined] as const){
   expect(allocateQuestions({...freshLearning(),school},4,'chinese',6).every(q=>!added.some(a=>a.id===q.id))).toBe(true);
  }
  for(const grade of [1,2] as const)expect(allocateQuestions(state,grade,grade===1?'tones':'words',6).every(q=>questionById(q.id)?.grade===grade)).toBe(true);
 });
});
