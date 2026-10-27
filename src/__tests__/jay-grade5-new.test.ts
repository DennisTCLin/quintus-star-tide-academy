import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GRADE5_NEW_EXAMS} from '../grade5-new-exams';
import {GRADE5_DONGMEN_EXAMS} from '../grade5-dongmen-exams';
import {GRADE5_REMAINING_EXAMS} from '../grade5-remaining-exams';
import {LEARNING_BANK,questionById} from '../learning';
import {freshLearning,allocateQuestions} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {eligibleExam,examPracticePriority} from '../school-curriculum';
import {EXAM_SOURCES} from '../exam-sources';
import {newFamily,startRun,answerRun,nextQuestion,validateFamily} from '../adventure';
const old=[...GRADE5_DONGMEN_EXAMS,...GRADE5_REMAINING_EXAMS];
describe('Jay new math/social and reviewed English intersection',()=>{
 it('keeps all503 prior source questions,160 general questions and old source bytes',()=>{
  const hashes={"grade5-dongmen-exams.ts": "8c2b948be48f06b8aa1e20a43cfc0ecb28a6010d892b55a55f88205cb7d84239", "grade5-remaining-exams.ts": "fb46f6bf5c5e4693207af42fa8cf738d0895821edd1ee1c442d63c9f8e59cbcc", "grade5-starter.ts": "abfc9b84ee8514315b57408c87cfbf24ed56a05fc28cd999f3a96077fe31a9fd", "grade5-math-extra.ts": "dc948a2a51224e78a8782cc4870f79e40dc2f3c77011745b0541e4e7ac3c679f", "grade5-general.ts": "f5a864f85bc90bc77d82725b7d40bbe10bfca6639eb5632a2f0b738ea1ceb332"};for(const [file,hash] of Object.entries(hashes))expect(createHash('sha256').update(readFileSync('src/'+file)).digest('hex')).toBe(hash);
  expect(old).toHaveLength(503);for(const q of old)expect(questionById(q.id)).toEqual(q);expect(LEARNING_BANK.filter(q=>q.grade===5&&!q.examSources)).toHaveLength(160);
 });
 it('has complete provenance, matching publishers and uniquely keyed reviewed questions',()=>{
  const ids=new Set(old.map(q=>q.id));expect(GRADE5_NEW_EXAMS).toHaveLength(457);expect(['math','social','english'].map(c=>GRADE5_NEW_EXAMS.filter(q=>q.course===c).length)).toEqual([272,125,60]);
  for(const q of GRADE5_NEW_EXAMS){expect(ids.has(q.id)).toBe(false);ids.add(q.id);expect(questionById(q.id)).toEqual(q);expect(q.grade).toBe(5);expect(q.publisher).toBe(({math:'康軒',social:'南一',english:'翰林'} as Record<string,string>)[q.course]);expect(eligibleExam('dongmen',5,q.course,q)).toBe(true);expect(eligibleExam('dunhua',5,q.course,q)).toBe(false);for(const s of q.examSources!){expect(EXAM_SOURCES[s.id].status).toBe('active');expect(s.page).toBeGreaterThan(0);}expect(q.options[q.answer]).toBeDefined();}
  expect(new Set(GRADE5_NEW_EXAMS.flatMap(q=>q.examSources!.map(s=>s.id))).size).toBe(21);
 });
 it('requires both a reviewed English question marker and a reviewed source compatibility scope',()=>{
  const q=GRADE5_NEW_EXAMS.find(q=>q.course==='english')!;expect(q.curriculumMatch).toBe('hwg7-u1-u2');expect(eligibleExam('dongmen',5,'english',{...q,curriculumMatch:undefined})).toBe(false);
  expect(eligibleExam('dongmen',5,'english',{...q,examSources:[{id:'he-cd114',page:1,locator:'x',kind:'test'}]})).toBe(false);
  expect(eligibleExam('nantun',4,'english',q)).toBe(false);expect(eligibleExam('dunhua',4,'english',q)).toBe(false);
  for(const r of GRADE5_NEW_EXAMS.filter(q=>q.course==='english'))for(const s of r.examSources!){const m=EXAM_SOURCES[s.id];expect('compatibleBook' in m&&m.compatibleBook).toBe('Here We Go 7');expect('book' in m&&m.book).not.toBe('Here We Go 7');}
 });
 it('matches final independent blind answers for the complete new bank',()=>{
  const a=JSON.parse(readFileSync('output/jay-grade5-new/blind-answers.json','utf8'));expect(Object.keys(a).sort()).toEqual(GRADE5_NEW_EXAMS.map(q=>q.id).sort());for(const q of GRADE5_NEW_EXAMS)expect(q.answer,q.id).toBe(a[q.id]);
 });
 it.each(['math','social','english'] as const)('allocates new %s after prior mastery and finishes a saved six-question voyage',course=>{
  const f=newFamily();f.profiles.jay.learning.school='dongmen';f.profiles.jay.coins=789;f.profiles.jay.tickets=3;for(const q of old)markMastered(f.profiles.jay.learning,q.id);const before=structuredClone(f);
  startRun(f,'jay',course,'new-source-'+course,0,false,'2026-10-27');
  for(let i=0;i<6;i++){const r=f.profiles.jay.run!,q=questionById(r.questions[i])!;expect(GRADE5_NEW_EXAMS.some(n=>n.id===q.id)).toBe(true);answerRun(f,'jay',r.id,i,q.answer,'2026-10-27',0);expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(f);if(i<5)nextQuestion(f,'jay',r.id,i);}
  expect(f.profiles.jay.run!.status).toBe('won');expect(f.profiles.jay.coins).toBeGreaterThanOrEqual(789);expect(f.profiles.jay.tickets).toBeGreaterThanOrEqual(3);for(const q of old)expect(f.profiles.jay.learning.mastered!.ids).toContain(q.id);for(const id of Object.keys(before.profiles) as (keyof typeof f.profiles)[])if(id!=='jay')expect(f.profiles[id]).toEqual(before.profiles[id]);
 });
 it('does not rewrite existing old-source runs and rewards on reload',()=>{
  const f=newFamily();f.profiles.jay.learning.school='dongmen';for(const q of GRADE5_NEW_EXAMS)markMastered(f.profiles.jay.learning,q.id);startRun(f,'jay','english','old-source-run',0,false,'2026-10-27');expect(f.profiles.jay.run!.questions.every(id=>old.some(q=>q.id===id))).toBe(true);const saved=structuredClone(f);expect(validateFamily(JSON.parse(JSON.stringify(f)))).toEqual(saved);
 });
 it('keeps midterm before final within the unseen lane and falls back after mastery',()=>{
  const s=freshLearning();s.school='dongmen';expect(allocateQuestions(s,5,'social',6).every(({id})=>examPracticePriority(questionById(id)!)===0)).toBe(true);for(const q of GRADE5_NEW_EXAMS.filter(q=>q.course==='social'&&examPracticePriority(q)===0))markMastered(s,q.id);expect(allocateQuestions(s,5,'social',6).every(({id})=>examPracticePriority(questionById(id)!)===1)).toBe(true);for(const q of GRADE5_NEW_EXAMS.filter(q=>q.course==='social'))markMastered(s,q.id);expect(allocateQuestions(s,5,'social',6).every(({id})=>!questionById(id)!.examSources)).toBe(true);
 });
});
