import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {FINALS_FOLLOWUP_20261107 as bank} from '../finals-followup-20261107';
import {LEARNING_BANK,questionById} from '../learning';
import {EXAM_SOURCES} from '../exam-sources';
import {eligibleExam} from '../school-curriculum';
import {freshLearning,allocateQuestions} from '../learning-engine';
import {syllables} from '../readability';
import {markMastered} from '../mastered-questions';
import {newFamily,startRun,answerRun,validateFamily} from '../adventure';
import legacy from '../../docs/content-review/finals131-followup-20261107/legacy-digests.json';
import expected from '../../docs/content-review/finals131-followup-20261107/blind-expected.json';
import mapping from '../../docs/content-review/finals131-followup-20261107/mapping.json';
import fixtures from '../../docs/content-review/finals131-followup-20261107/fixtures/base92ad-families.json';
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cases=[
 ['qingqing',1,'xingan','math'],['qingqing',1,'xingan','tones'],
 ['qingqing',1,'xingan','medials'],['qingqing',1,'xingan','pairs'],
 ['feifei',2,'nantun','words'],['feifei',2,'nantun','pairs'],
 ['jay',5,'dongmen','chinese'],['alston',6,'jianan','science'],
] as const;

it('preserves every base92ad static question, saved ID and answer semantics',()=>{
 expect(Object.keys(legacy)).toHaveLength(6311);
 for(const [id,digest] of Object.entries(legacy))expect(hash(questionById(id)),id).toBe(digest);
});
it('binds only the individually solved, self-contained source intersections',()=>{
 expect(bank).toHaveLength(210);expect(new Set(bank.map(q=>q.id)).size).toBe(210);
 expect(Object.keys(expected)).toHaveLength(210);
 expect(mapping.filter(x=>x.status==='held')).toHaveLength(6);
 for(const q of bank){
  expect(q.options[q.answer].text,q.id).toBe(expected[q.id as keyof typeof expected].answerText);
  expect(q.id).toMatch(/^[a-z0-9-]{2,40}$/);
  expect(q.prompt).not.toMatch(/如下圖|右圖|左圖|看圖|聽音檔|承上題/);
  expect(q.options.some(o=>/以上皆是|以上都是|上述皆是/.test(o.text)),q.id).toBe(false);
  expect(q.image).toBeUndefined();expect(q.audio).toBeUndefined();
  for(const source of q.examSources!){
   const meta=EXAM_SOURCES[source.id];
   expect('grade' in meta&&meta.grade,q.id).toBe(q.grade);
   expect(meta.publisher,q.id).toBe(q.publisher);
   expect('phase' in meta&&meta.phase).toBe('final');
   expect('book' in meta&&meta.book).toBe(`第${({1:1,2:3,5:9,6:7} as Record<number,number>)[q.grade]}冊`);
  }
  if(q.grade<=2&&q.subject==='chinese')expect(q.hideReadingHints,q.id).toBe(true);
 }
 expect(bank.some(q=>q.course==='english')).toBe(false);
 for(const held of mapping.filter(x=>x.status==='held'))expect(bank.some(q=>q.id===held.candidateId)).toBe(false);
});
it.each(cases)('%s grade%s %s %s can receive its matching additions without sibling repeats',(_player,grade,school,course)=>{
 const additions=bank.filter(q=>q.grade===grade&&q.course===course);
 const state={...freshLearning(),school};
 for(const q of LEARNING_BANK)if(q.grade===grade&&q.course===course&&!additions.some(n=>n.id===q.id))markMastered(state,q.id);
 for(const q of additions)expect(eligibleExam(school,grade,course,q),q.id).toBe(true);
 const count=Math.min(6,new Set(additions.map(q=>q.sourceFamily)).size);
 expect(count).toBeGreaterThan(0);
 const chosen=allocateQuestions(state,grade,course,count).map(q=>questionById(q.id)!);
 expect(chosen).toHaveLength(count);expect(chosen.every(q=>additions.some(n=>n.id===q.id))).toBe(true);
 expect(new Set(chosen.map(q=>q.sourceFamily)).size).toBe(count);
 markMastered(state,chosen[0].id);
 expect(allocateQuestions(state,grade,course,1).some(q=>q.id===chosen[0].id)).toBe(false);
});
it('does not discard new version-matched math because of excluded historic warmups',()=>{
 for(const id of ['phase2-g1h-20000773-i1a','phase2-g1h-20003306-vii1']){
  const target=bank.find(q=>q.id===id)!;expect(target).toBeDefined();
  const state={...freshLearning(),school:'xingan' as const};
  for(const q of LEARNING_BANK)if(q.grade===1&&q.course==='math'&&q.id!==id)markMastered(state,q.id);
  expect(allocateQuestions(state,1,'math',1)[0].id).toBe(id);
 }
});
it('retains full pinned pre-followup voyages and rewards across both storage representations',()=>{
 expect(fixtures.base).toBe('92ad44e7e95a94a6e6d75ed583c2378bca3123c5');
 expect(fixtures.items).toHaveLength(8);
 for(const item of fixtures.items){
  for(const [id,digest] of Object.entries(item.runQuestionHashes))expect(hash(questionById(id)),id).toBe(digest);
  for(const storage of [item.storedFamily,item.expectedRuntime]){
   const restored=validateFamily(structuredClone(storage));
   expect(structuredClone(restored),`${item.grade}.${item.course}`).toEqual(item.expectedRuntime);
   expect(restored.profiles[item.player as keyof typeof restored.profiles].run!.index).toBe(1);
  }
 }
});
it('issues only the first answer reward and leaves every other learner untouched',()=>{
 for(const q of bank){
  const [player,,school]=cases.find(([,grade,,course])=>grade===q.grade&&course===q.course)!;
  const f=newFamily(),p=f.profiles[player];p.learning.school=school;p.coins=1234;
  startRun(f,player,q.course,'followup-once-reward',7,false,'2026-11-07');p.run!.questions[0]=q.id;
  const peers=Object.fromEntries(Object.entries(f.profiles).filter(([id])=>id!==player).map(([id,p])=>[id,structuredClone(p)]));
  answerRun(f,player,p.run!.id,0,q.answer,'2026-11-07');expect(p.coins,q.id).toBe(1244);
  try{answerRun(f,player,p.run!.id,0,q.answer,'2026-11-07');}catch{/* A settled answer may be rejected. */}
  expect(p.coins,q.id).toBe(1244);expect(p.run!.answers![0],q.id).toBe(true);
  for(const [id,before] of Object.entries(peers))expect(f.profiles[id as keyof typeof f.profiles],q.id).toEqual(before);
 }
});
it('uses existing large tone symbols and explicit phonetic-only answer rendering',()=>{
 for(const q of bank.filter(q=>q.course==='tones'))expect(q.options.every(o=>['―','ˊ','ˇ','ˋ','˙'].includes(o.text))).toBe(true);
 for(const q of bank.filter(q=>q.course==='pairs'||q.course==='medials'))
  for(const option of q.options)if(/^[ㄅ-ㄯˊˇˋ˙]+$/.test(option.text))expect(option.zy,q.id).toBe(option.text);
});

it('uses reviewed contextual readings in new material without global character rewrites',()=>{
 for(const [text,reading] of Object.entries({
  '長長的道路旁':'ㄔㄤˊ ㄔㄤˊ ˙ㄉㄜ ㄉㄠˋ ㄌㄨˋ ㄆㄤˊ',
  '長耳兔':'ㄔㄤˊ ㄦˇ ㄊㄨˋ','的長鼻':'˙ㄉㄜ ㄔㄤˊ ㄅㄧˊ',
  '沒看到東西':'ㄇㄟˊ ㄎㄢˋ ㄉㄠˋ ㄉㄨㄥ ˙ㄒㄧ',
  '陸佰元':'ㄌㄧㄡˋ ㄅㄞˇ ㄩㄢˊ','鹿柴':'ㄌㄨˋ ㄓㄞˋ','返景':'ㄈㄢˇ ㄧㄥˇ',
 }))expect(syllables(text).map(x=>x.zy).join(' '),text).toBe(reading);
});
