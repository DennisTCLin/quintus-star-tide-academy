import {createElement as h} from 'react';
import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {GRADE2_CHINESE_EXAMS as bank} from '../grade2-chinese-exams';
import {allocateQuestions,allocateAdventureQuestions,freshLearning} from '../learning-engine';
import {questionById} from '../learning';
import {markMastered} from '../mastered-questions';
import {examSourceLabel} from '../exam-sources';
import {annotateTree} from '../readability';
import QuestionPrompt from '../QuestionPrompt';
import ChoiceView from '../ChoiceView';
it('has unique stable, source-backed second-grade questions with valid answers',()=>{
 expect(bank).toHaveLength(99);expect(new Set(bank.map(q=>q.id)).size).toBe(99);
 expect(new Set(bank.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(7);
 expect(bank.flatMap(q=>q.examSources!).length).toBe(110);
 for(const q of bank){
  expect(q.id).toMatch(/^[a-z0-9-]{2,40}$/);expect(q.grade).toBe(2);expect(q.publisher).toBe('康軒');
  expect(q.options[q.answer]).toBeTruthy();expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  for(const s of q.examSources!)expect(examSourceLabel(s)).toContain('二上');
  if(q.course==='pairs'){expect(q.hideReadingHints).toBe(true);expect(q.speechText).toBe('請看畫面中的詞句，選出標示字的正確注音。');}
 }
});
it('uses both schools supplied sources before general questions, preserving grade isolation and mastery',()=>{
 for(const school of ['yongchun','nantun'] as const)for(const course of ['words','pairs'] as const){
  const s={...freshLearning(),school};
  for(const level of [1,2,3] as const)for(const picked of [allocateQuestions(s,2,course,6),allocateAdventureQuestions(s,2,course,6,level)]){
   expect(picked).toHaveLength(6);expect(new Set(picked.map(q=>q.id)).size).toBe(6);
   for(const q of picked){expect(q.id.startsWith('cxg2-')).toBe(true);expect(questionById(q.id)?.course).toBe(course);}
  }
  bank.forEach(q=>markMastered(s,q.id));expect(allocateQuestions(s,2,course,6).every(q=>!q.id.startsWith('cxg2-'))).toBe(true);
  expect(allocateQuestions(freshLearning(),2,course,6).every(q=>!q.id.startsWith('cxg2-'))).toBe(true);
  for(const grade of [1,4] as const)expect(allocateQuestions(s,grade,grade===1?'pairs':'chinese',6).every(q=>!q.id.startsWith('cxg2-'))).toBe(true);
 }
});
it('shows grade-two Chinese without auxiliary ruby, preserving phonetic answer content',()=>{
 for(const q of bank.filter(q=>q.hideReadingHints)){
  const html=renderToStaticMarkup(annotateTree(h('section',null,h(QuestionPrompt,{question:q,grade:2}),...q.options.map((choice,i)=>h(ChoiceView,{key:i,choice,grade:2,hideReadingHints:q.hideReadingHints}))),2));
  expect(html).not.toContain('<ruby');expect(html).not.toContain('<rt>');
 }
 const q=bank.find(q=>!q.hideReadingHints)!;
 expect(renderToStaticMarkup(h(QuestionPrompt,{question:q,grade:2}))).not.toContain('<ruby');
 expect(renderToStaticMarkup(h(ChoiceView,{choice:{text:'老師',zy:'ㄌㄠˇ ㄕ'},grade:2}))).toContain('<span>老師</span>');
 const phonetic=renderToStaticMarkup(h(ChoiceView,{choice:{text:'老師',zy:'ㄌㄠˇ ㄕ'},grade:2,hideReadingHints:true}));
 expect(phonetic).toContain('zhuyin-only');expect(phonetic).not.toContain('<ruby');
});
