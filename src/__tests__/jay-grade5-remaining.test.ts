import {GRADE5_NEW_EXAMS} from '../grade5-new-exams';
import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GRADE5_REMAINING_EXAMS} from '../grade5-remaining-exams';
import {GRADE5_DONGMEN_EXAMS} from '../grade5-dongmen-exams';
import {questionById} from '../learning';
import {freshLearning,allocateQuestions} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {eligibleExam} from '../school-curriculum';
import {EXAM_SOURCES} from '../exam-sources';
import {newFamily,startRun,answerRun,validateFamily} from '../adventure';
describe('Jay remaining matching papers',()=>{
 it('preserves the published first-wave source and all old IDs byte-for-byte',()=>{
  expect(createHash('sha256').update(readFileSync('src/grade5-dongmen-exams.ts')).digest('hex')).toBe('8c2b948be48f06b8aa1e20a43cfc0ecb28a6010d892b55a55f88205cb7d84239');
  for(const q of GRADE5_DONGMEN_EXAMS)expect(questionById(q.id)).toEqual(q);
 });
 it('has reviewed unique IDs, complete provenance and one valid answer',()=>{
  expect(GRADE5_REMAINING_EXAMS).toHaveLength(407);expect(['chinese','science','english'].map(c=>GRADE5_REMAINING_EXAMS.filter(q=>q.course===c).length)).toEqual([308,86,13]);
  const ids=new Set(GRADE5_DONGMEN_EXAMS.map(q=>q.id));
  for(const q of GRADE5_REMAINING_EXAMS){expect(ids.has(q.id)).toBe(false);ids.add(q.id);expect(questionById(q.id)).toEqual(q);expect(eligibleExam('dongmen',5,q.course,q)).toBe(true);expect(eligibleExam('yongchun',5,q.course,q)).toBe(false);expect(q.options[q.answer]?.text).toBeTruthy();for(const source of q.examSources!){expect(EXAM_SOURCES[source.id].status).toBe('active');expect(source.page).toBeGreaterThan(0);}}
  expect(new Set(GRADE5_REMAINING_EXAMS.flatMap(q=>q.examSources!.map(s=>s.id)))).toEqual(new Set([...Array.from({length:10},(_,i)=>'j5s'+(i+1)),...Array.from({length:10},(_,i)=>'j5s'+(i+31)),'j5s44']));
 });
 it('matches the independently resolved blind answers after source-backed corrections',()=>{
  const answers=JSON.parse(readFileSync('output/jay-grade5-remaining/blind-answers.json','utf8'));expect(Object.keys(answers).sort()).toEqual(GRADE5_REMAINING_EXAMS.map(q=>q.id).sort());for(const q of GRADE5_REMAINING_EXAMS)expect(q.answer,q.id).toBe(answers[q.id]);
 });
 it.each(['chinese','science','english'] as const)('allocates new %s after previous-source mastery and preserves a live old run',course=>{
  const s=freshLearning();s.school='dongmen';for(const q of [...GRADE5_DONGMEN_EXAMS,...GRADE5_NEW_EXAMS])markMastered(s,q.id);
  const ids=allocateQuestions(s,5,course,6);expect(ids).toHaveLength(6);expect(ids.every(({id})=>GRADE5_REMAINING_EXAMS.some(q=>q.id===id))).toBe(true);
  const f=newFamily();f.profiles.jay.learning.school='dongmen';startRun(f,'jay',course,'retained-old-run',0,false,'2026-10-27');const r=f.profiles.jay.run!;answerRun(f,'jay',r.id,0,questionById(r.questions[0])!.answer,'2026-10-27',0);const before=structuredClone(f);expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(before);
 });
});
