import {GRADE5_NEW_EXAMS} from '../grade5-new-exams';
import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {GRADE5_REMAINING_EXAMS} from '../grade5-remaining-exams';
import {GRADE5_DONGMEN_EXAMS} from '../grade5-dongmen-exams';
import {EXAM_SOURCES,examSourceLabel} from '../exam-sources';
import {coursePublisher,eligibleExam,examPracticePriority} from '../school-curriculum';
import {freshLearning,allocateQuestions} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {questionById} from '../learning';
import {newFamily,startRun,answerRun,nextQuestion,validateFamily} from '../adventure';
const supplied=['chinese','science','english'] as const;
describe('Jay 115 Dongmen grade-five sources',()=>{
 it('uses the current official publishers, without treating the old downloaded version list as current',()=>{
  expect(['chinese','math','social','science','english'].map(c=>coursePublisher('dongmen',5,c))).toEqual(['翰林','康軒','南一','翰林','翰林']);
  expect(coursePublisher('dongmen',4,'math')).toBeUndefined();
 });
 it('retains unique stable source IDs and complete source references for every reviewed question',()=>{
  expect(GRADE5_DONGMEN_EXAMS).toHaveLength(96);expect(new Set(GRADE5_DONGMEN_EXAMS.map(q=>q.id)).size).toBe(96);
  expect(supplied.map(c=>GRADE5_DONGMEN_EXAMS.filter(q=>q.course===c).length)).toEqual([40,36,20]);
  for(const q of GRADE5_DONGMEN_EXAMS){expect(questionById(q.id)).toEqual(q);expect(q.grade).toBe(5);expect(q.options.length).toBeGreaterThanOrEqual(2);expect(new Set(q.options.map(o=>o.text)).size).toBe(q.options.length);expect(q.options[q.answer]).toBeDefined();expect(eligibleExam('dongmen',5,q.course,q)).toBe(true);for(const s of q.examSources!){expect(EXAM_SOURCES[s.id].status).toBe('active');expect(s.page).toBeGreaterThan(0);expect(examSourceLabel(s)).toContain('五上');expect(examSourceLabel(s)).toContain('補充');}}
 });
 it('matches every independent blind-solver answer, including the published option order',()=>{
  const answers=JSON.parse(readFileSync('output/jay-grade5/blind-answers.json','utf8'));expect(Object.keys(answers).sort()).toEqual(GRADE5_DONGMEN_EXAMS.map(q=>q.id).sort());for(const q of GRADE5_DONGMEN_EXAMS)expect(q.answer,q.id).toBe(answers[q.id]);
 });
 it('does not infer English book from publisher or admit the wrong math/social publishers',()=>{
  const english=GRADE5_DONGMEN_EXAMS.find(q=>q.course==='english')!;
  expect(eligibleExam('dongmen',5,'english',{...english,examSources:[{id:'he-cd114',page:2,locator:'1',kind:'test'}]})).toBe(false);
  expect(eligibleExam('dongmen',5,'math',{publisher:'南一',examSources:english.examSources})).toBe(false);
  expect(eligibleExam('dongmen',5,'social',{publisher:'翰林',examSources:english.examSources})).toBe(false);
  expect(eligibleExam(undefined,5,'english',english)).toBe(false);
  expect(eligibleExam('jianan',5,'english',english)).toBe(false);
 });
 it('prioritizes unseen midterm sources, then final supplements, then general practice after mastery',()=>{
  const s=freshLearning();s.school='dongmen';const first=allocateQuestions(s,5,'chinese',6);
  expect(first.every(item=>examPracticePriority(questionById(item.id)!)===0)).toBe(true);
  for(const q of [...GRADE5_DONGMEN_EXAMS,...GRADE5_REMAINING_EXAMS].filter(q=>q.course==='chinese'&&examPracticePriority(q)===0))markMastered(s,q.id);
  expect(allocateQuestions(s,5,'chinese',6).every(item=>item.id.startsWith('j5-')&&examPracticePriority(questionById(item.id)!)===1)).toBe(true);
  for(const q of [...GRADE5_DONGMEN_EXAMS,...GRADE5_REMAINING_EXAMS].filter(q=>q.course==='chinese'))markMastered(s,q.id);
  expect(allocateQuestions(s,5,'chinese',6).every(item=>item.id.startsWith('g5-general-'))).toBe(true);
 });
 it.each(['math','social'] as const)('uses original %s general questions after source mastery',course=>{
  const s=freshLearning();s.school='dongmen';for(const q of GRADE5_NEW_EXAMS)markMastered(s,q.id);const ids=allocateQuestions(s,5,course,6);expect(ids).toHaveLength(6);for(const {id} of ids){const q=questionById(id)!;expect(q.grade).toBe(5);expect(q.course).toBe(course);expect(q.examSources).toBeUndefined();}
 });
 it.each(supplied)('completes a six-question %s voyage and round-trips without rewriting other players',course=>{
  const f=newFamily();f.profiles.jay.learning.school='dongmen';const before=structuredClone(f);startRun(f,'jay',course,'jay-'+course,0,false,'2026-10-27');
  for(let i=0;i<6;i++){const r=f.profiles.jay.run!,q=questionById(r.questions[i])!;expect(q.examSources?.length).toBeGreaterThan(0);answerRun(f,'jay',r.id,i,q.answer,'2026-10-27',0);if(i<5)nextQuestion(f,'jay',r.id,i);}
  expect(f.profiles.jay.run!.status).toBe('won');expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);
  for(const id of Object.keys(before.profiles) as (keyof typeof f.profiles)[])if(id!=='jay')expect(f.profiles[id]).toEqual(before.profiles[id]);
 });
 it('preserves a previously allocated general run and its ledger when the school is enabled',()=>{
  const f=newFamily();startRun(f,'jay','chinese','existing-general',0,false,'2026-10-26');const saved=structuredClone(f);f.profiles.jay.learning.school='dongmen';
  const loaded=validateFamily(JSON.parse(JSON.stringify(f)));expect(loaded.profiles.jay.run).toEqual(saved.profiles.jay.run);expect(loaded.profiles.jay.coins).toBe(saved.profiles.jay.coins);expect(loaded.profiles.jay.tickets).toBe(saved.profiles.jay.tickets);expect(loaded.profiles.jay.learning.seen).toEqual(saved.profiles.jay.learning.seen);expect(loaded.profiles.jay.run!.questions.every(id=>questionById(id)?.id.startsWith('g5-general-'))).toBe(true);
 });
});
