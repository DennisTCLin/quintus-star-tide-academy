import {it,expect} from 'vitest';
import {GRADE1_CHINESE_EXAMS as bank} from '../grade1-chinese-exams';
import {GRADE1_CHINESE_EXTRA_EXAMS as extra} from '../grade1-chinese-extra-exams';
import {questionById} from '../learning';
import {allocateQuestions,allocateAdventureQuestions,freshLearning,validateLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {coursePublisher,curriculumNotice} from '../school-curriculum';
import {EXAM_SOURCES,examSourceLabel} from '../exam-sources';
import {questionSpeech} from '../speech-text';
const courses=['medials','tones','pairs'] as const;
it('preserves the original 51 and adds traceable reviewed phonetic choices',()=>{
 const original=bank.filter(q=>!q.id.startsWith('cxg1-new-'));
 expect(original).toHaveLength(51);
 expect(bank).toHaveLength(51+extra.length);expect(new Set(bank.map(q=>q.id)).size).toBe(bank.length);
 expect(courses.map(c=>original.filter(q=>q.course===c).length)).toEqual([9,9,33]);
 expect(['g1ck1','g1ck2','g1ck3'].map(id=>bank.filter(q=>q.examSources![0].id===id).length)).toEqual([10,26,15]);
 for(const q of bank){
  expect(q.id).toMatch(/^[a-z0-9-]{2,40}$/i);expect(questionById(q.id)).toBe(q);expect(q.grade).toBe(1);expect(q.subject).toBe('chinese');expect(q.publisher).toBe('康軒');
  expect(q.options[q.answer]?.text).toBeTruthy();expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);
  expect(q.prompt).not.toMatch(/看圖|如下圖|如右圖|EMBED/);
  expect(q.audio).toBeUndefined();expect(q.speechText).toBeTruthy();expect(q.target).toBeUndefined();
  for(const choice of q.options){expect(choice.zy).toBe(choice.text);expect(choice.text).toMatch(/^[ㄅ-ㄩˊˇˋ˙― ]+$/u);}
  const s=q.examSources![0];expect([1,2]).toContain(s.page);expect(EXAM_SOURCES[s.id].status).toBe('active');expect(examSourceLabel(s)).toContain('一上');
 }
 expect(new Set(bank.filter(q=>q.course!=='tones').map(q=>q.answer)).size).toBe(3);
});
it('preserves Taiwan pronunciations, neutral tone, source blanks, and exact blends',()=>{
 const sourceQuestion=(suffix:string)=>bank.find(q=>`${q.examSources![0].id}-${q.examSources![0].locator}`===suffix)!;
 const answer=(suffix:string)=>{const q=sourceQuestion(suffix);return q.options[q.answer].text;};
 expect(answer('g1ck3-二4')).toBe('ㄑㄧˋ ㄜˊ');
 expect(answer('g1ck3-一2')).toBe('ㄙㄠˇ');
 expect(answer('g1ck2-三3-2')).toBe('˙ㄗ');
 expect(questionSpeech(sourceQuestion('g1ck2-三3-2'))).toBe('影子。請選出最後一個字的注音。');
 expect(['一1','一2','一3','一4'].map(loc=>answer('g1ck2-'+loc))).toEqual(['ㄐㄧ','ㄖㄠˋ','ㄍㄨㄛˇ','ㄊㄧㄠ']);
 expect(['五1-友','五1-遊','五2-小','五2-狗','五2-奶','五3-忙','五3-蓋','五4-豆','五4-芽'].map(loc=>answer('g1ck2-'+loc))).toEqual(['ˇ','ˊ','ˇ','ˇ','ˇ','ˊ','ˋ','ˋ','ˊ']);
 for(const q of bank.filter(q=>q.course==='tones'))expect(q.prompt).not.toMatch(/[ㄅ-ㄩˊˇˋ˙]/u);
});
it('prioritizes each supplied phonetic course for both schools in every lane',()=>{
 for(const school of ['yongchun','nantun'] as const){
  expect(curriculumNotice(school,1)).toContain('拼音、辨音、聲調');
  for(const course of courses){
   expect(coursePublisher(school,1,course)).toBe('康軒');
   for(const difficulty of [1,2,3] as const){
    const s={...freshLearning(),school};
    for(const selected of [allocateQuestions(s,1,course,6),allocateAdventureQuestions(s,1,course,6,difficulty)]){
     expect(selected).toHaveLength(6);expect(new Set(selected.map(q=>q.id)).size).toBe(6);
     for(const q of selected){const item=questionById(q.id)!;expect(item.id.startsWith('cxg1-')).toBe(true);expect(item.course).toBe(course);expect(item.grade).toBe(1);}
    }
   }
  }
 }
});
it('respects mastery after restore and excludes pending sources, unknown schools and grade two',()=>{
 for(const course of courses){
  let s={...freshLearning(),school:'yongchun' as const};
  const ids=bank.filter(q=>q.course===course).map(q=>q.id);
  ids.slice(0,-2).forEach(id=>markMastered(s,id));s=validateLearning(JSON.parse(JSON.stringify(s)),1) as typeof s;
  const picked=allocateQuestions(s,1,course,6);
  expect(picked.filter(q=>q.id.startsWith('cxg1-')).map(q=>q.id).sort()).toEqual(ids.slice(-2).sort());
  ids.forEach(id=>markMastered(s,id));expect(allocateQuestions(s,1,course,6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
  expect(allocateQuestions(freshLearning(),1,course,6).every(q=>!questionById(q.id)?.examSources)).toBe(true);
  expect(allocateQuestions({...freshLearning(),school:'nantun'},2,course,6).every(q=>questionById(q.id)?.grade===2&&!q.id.startsWith('cxg1-'))).toBe(true);
 }
 expect(EXAM_SOURCES.g1cn1.status).toBe('pending-school');expect(EXAM_SOURCES.g1ch1.status).toBe('pending-school');
});

it('adds only distinct self-contained questions and preserves mastered old records',()=>{
 expect(new Set(extra.map(q=>q.prompt)).size).toBe(extra.length);
 expect(extra.every(q=>!bank.filter(p=>!p.id.startsWith('cxg1-new-')).some(p=>p.prompt===q.prompt))).toBe(true);
 expect(new Set(extra.flatMap(q=>q.examSources!.map(s=>s.id)))).toEqual(new Set(['g1cxn1','g1cxn2','g1cxn3','g1cxn4','g1cxn5','g1cxn6','g1cxn7','g1cxn9','g1cxn10']));
 for(const course of courses){
  const state={...freshLearning(),school:'yongchun' as const};
  bank.filter(q=>!q.id.startsWith('cxg1-new-')).forEach(q=>markMastered(state,q.id));
  const restored=validateLearning(JSON.parse(JSON.stringify(state)),1);
  expect(restored.mastered).toEqual(state.mastered);
  const selected=allocateQuestions(restored,1,course,6);
  expect(selected).toHaveLength(6);expect(selected.every(q=>q.id.startsWith('cxg1-new-'))).toBe(true);
 }
 for(const word of ['洗手','老鼠','雨傘','水桶']){
  const q=extra.find(q=>q.prompt.startsWith(`「${word}」`))!;
  expect(q.prompt).toContain('本調');expect(q.speechText).toContain(word.split('').join('。'));
  expect(q.options.some(o=>o.text.split(' ')[0].endsWith('ˊ'))).toBe(false);
 }
});
