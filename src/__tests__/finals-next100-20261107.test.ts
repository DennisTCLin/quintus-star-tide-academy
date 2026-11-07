import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {FINALS_NEXT100_20261107 as bank} from '../finals-next100-20261107';
import {LEARNING_BANK,questionById} from '../learning';
import {EXAM_SOURCES} from '../exam-sources';
import {eligibleExam} from '../school-curriculum';
import {freshLearning,allocateQuestions} from '../learning-engine';
import {syllables} from '../readability';
import {markMastered} from '../mastered-questions';
import {newFamily,startRun,answerRun,validateFamily} from '../adventure';
import legacy from '../../docs/content-review/finals131-next100-20261107/fixtures/base65d-digests.json';
import generatedBaseline from '../../docs/content-review/finals131-next100-20261107/fixtures/base65d-generated-digests.json';
import {GENERATED_POOLS,generatedId,generatedQuestion} from '../question-generator';
import expected from '../../docs/content-review/finals131-next100-20261107/blind-expected.json';

import fixtures from '../../docs/content-review/finals131-next100-20261107/fixtures/base65d-families.json';
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cases=[['qingqing',1,'xingan','pairs'],['feifei',2,'nantun','words'],['feifei',2,'nantun','math'],['alston',6,'jianan','science'],['alston',6,'jianan','math']] as const;

it('preserves every actual-main65d static question, saved ID and answer semantics',()=>{
 expect(Object.keys(legacy)).toHaveLength(6629);
 for(const [id,digest] of Object.entries(legacy))expect(hash(questionById(id)),id).toBe(digest);
});
it('preserves all generated question objects from the exact actual-main65d source',()=>{
 expect(generatedBaseline.base).toBe('65d3a309bf012f6f54bd21d9b81387d45bf1c992');
 expect(generatedBaseline.count).toBe(23192);
 expect(GENERATED_POOLS.map(p=>p.key)).toEqual(generatedBaseline.pools.map(p=>p.key));
 for(const pinned of generatedBaseline.pools){
  const pool=GENERATED_POOLS.find(p=>p.key===pinned.key)!;
  expect(pool.params.length,pool.key).toBe(pinned.count);
  expect(hash(pool.params.map((_,i)=>generatedQuestion(generatedId(pool,i)))),pool.key).toBe(pinned.hash);
 }
});
it('binds only the individually solved, self-contained source intersections',()=>{
 expect(bank).toHaveLength(100);expect(new Set(bank.map(q=>q.id)).size).toBe(100);
 expect(Object.keys(expected)).toHaveLength(100);

 for(const q of bank){
  expect(questionById(q.id),q.id).toEqual(q);
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
   expect('book' in meta&&meta.book).toBe(`第${q.grade===1?1:q.grade===2?3:q.grade===5?(q.course==='math'?9:5):(q.course==='math'?11:7)}冊`);
  }
  if(q.grade<=2&&q.subject==='chinese')expect(q.hideReadingHints,q.id).toBe(true);
 }
 expect(bank.some(q=>q.course==='english')).toBe(false);

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
it('retains full pinned pre-next100 voyages and rewards across both storage representations',()=>{
 expect(fixtures.base).toBe('65d3a309bf012f6f54bd21d9b81387d45bf1c992');
 expect(fixtures.items).toHaveLength(5);
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

it('uses reviewed readings for看家and長頸鹿',()=>{
 expect(syllables('看家').map(x=>x.zy)).toEqual(['ㄎㄢ','ㄐㄧㄚ']);
 expect(syllables('長頸鹿').map(x=>x.zy)).toEqual(['ㄔㄤˊ','ㄐㄧㄥˇ','ㄌㄨˋ']);
});

it('keeps the precise磅礴reading separate from the weight-unit fallback',()=>{
 expect(syllables('磅礴').map(x=>x.zy)).toEqual(['ㄆㄤ','ㄅㄛˊ']);
 expect(syllables('氣勢磅礴').slice(-2).map(x=>x.zy)).toEqual(['ㄆㄤ','ㄅㄛˊ']);
 expect(syllables('一磅').at(-1)?.zy).toBe('ㄅㄤˋ');
 expect(syllables('英磅').map(x=>x.zy)).toEqual(['ㄧㄥ','ㄅㄤˋ']);
 expect(syllables('看家').map(x=>x.zy)).toEqual(['ㄎㄢ','ㄐㄧㄚ']);
 expect(syllables('觀看').at(-1)?.zy).toBe('ㄎㄢˋ');
 expect(syllables('看').at(-1)?.zy).toBe('ㄎㄢˋ');
});

it('reads new complete contexts accurately without globally changing polyphones',()=>{
 expect(syllables('傳統鋅碳乾電池中的導電碳棒').slice(4,7).map(x=>x.zy)).toEqual(['ㄍㄢ','ㄉㄧㄢˋ','ㄔˊ']);
 expect(syllables('一線縫的').map(x=>x.zy)).toEqual(['ㄧ','ㄒㄧㄢˋ','ㄈㄥˊ','˙ㄉㄜ']);
 expect(syllables('不是頭髮的髮').map(x=>x.zy)).toEqual(['ㄅㄨˋ','ㄕˋ','ㄊㄡˊ','ㄈㄚˇ','˙ㄉㄜ','ㄈㄚˇ']);
 expect(syllables('手牽著手用牽').map(x=>x.zy)).toEqual(['ㄕㄡˇ','ㄑㄧㄢ','˙ㄓㄜ','ㄕㄡˇ','ㄩㄥˋ','ㄑㄧㄢ']);
 expect(syllables('大格換成分鐘').slice(-2).map(x=>x.zy)).toEqual(['ㄈㄣ','ㄓㄨㄥ']);
 expect(syllables('二分之一倍縮圖的對應邊長為原圖的二分之一')[12].zy).toBe('ㄨㄟˊ');
 expect(syllables('不當開發及不當施肥都可能影響土壤品質與植物生長').at(-1)?.zy).toBe('ㄓㄤˇ');
 expect(syllables('為取得石材而開山採石')[0].zy).toBe('ㄨㄟˋ');
 expect(syllables('為因應地震後可能出現的通訊中斷').slice(0,3).map(x=>x.zy)).toEqual(['ㄨㄟˋ','ㄧㄣ','ㄧㄥˋ']);
 expect(syllables('這個實驗的操作變因應是哪一項')[9].zy).toBe('ㄧㄥ');
 expect(syllables('著手').map(x=>x.zy)).toEqual(['ㄓㄨㄛˊ','ㄕㄡˇ']);
 expect(syllables('熟悉').map(x=>x.zy)).toEqual(['ㄕㄡˊ','ㄒㄧ']);
});
