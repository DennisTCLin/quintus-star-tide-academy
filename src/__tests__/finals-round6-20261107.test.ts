import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {FINALS_ROUND6_20261107 as bank} from '../finals-round6-20261107';
import {LEARNING_BANK,questionById} from '../learning';
import {GENERATED_POOLS,generatedId,generatedQuestion} from '../question-generator';
import {EXAM_SOURCES} from '../exam-sources';
import {eligibleExam} from '../school-curriculum';
import {allocateQuestions,freshLearning} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {newFamily,startRun,answerRun,validateFamily} from '../adventure';
import {syllables} from '../readability';
import {questionSpeech} from '../speech-text';
import {canListenToEnglishChoices} from '../english-choice-listening';
import expected from '../../docs/content-review/finals131-round6-20261107/blind-expected.json';
import legacy from '../../docs/content-review/finals131-round6-20261107/fixtures/base-static-digests.json';
import generated from '../../docs/content-review/finals131-round6-20261107/fixtures/base-generated-digests.json';
import pinned from '../../docs/content-review/finals131-round6-20261107/fixtures/base-c66-families.json';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const cases=[['qingqing',1,'xingan','math'],['qingqing',1,'yongchun','math'],['jay',5,'dongmen','chinese'],['alston',6,'jianan','chinese']] as const;
it('preserves every6729 current-main static object, ID, answer and provenance',()=>{
 expect(Object.keys(legacy)).toHaveLength(6729);for(const[id,digest]of Object.entries(legacy))expect(hash(questionById(id)),id).toBe(digest);
});
it('preserves all23192 generated question objects and all42 pool identities',()=>{
 expect(generated.base).toBe('c66f492811c51298673fede44d0997d33aa64494');expect(generated.count).toBe(23192);expect(generated.pools).toHaveLength(42);
 expect(GENERATED_POOLS.map(p=>p.key)).toEqual(generated.pools.map(p=>p.key));for(const old of generated.pools){const p=GENERATED_POOLS.find(p=>p.key===old.key)!;expect(hash(p.params.map((_,i)=>generatedQuestion(generatedId(p,i)))),p.key).toBe(old.hash);}
});
it('binds35 unique self-contained answers to independent blind evidence and exact book routes',()=>{
 expect(bank).toHaveLength(35);expect(Object.keys(expected)).toHaveLength(35);expect(new Set(bank.map(q=>q.id)).size).toBe(35);
 expect(bank.filter(q=>q.grade===1)).toHaveLength(7);expect(bank.filter(q=>q.grade===5)).toHaveLength(7);expect(bank.filter(q=>q.grade===6)).toHaveLength(21);
 for(const q of bank){expect(questionById(q.id)).toEqual(q);const oracle=expected[q.id as keyof typeof expected];expect(q.options[q.answer].text,q.id).toBe(oracle.answerText);expect(oracle.unique).toBe(true);expect(oracle.sourceSupported).toBe(true);expect(q.prompt).not.toMatch(/如下圖|右圖|左圖|看圖|聽音檔|承上題/);expect(q.image).toBeUndefined();expect(q.audio).toBeUndefined();expect(q.course).not.toBe('english');expect(q.grade).not.toBe(3);
  for(const s of q.examSources!){const m=EXAM_SOURCES[s.id];expect(m.publisher).toBe(q.publisher);expect('grade'in m&&m.grade).toBe(q.grade);expect('book'in m&&m.book).toBe(`第${q.grade===1?1:q.grade===5?9:11}冊`);expect('phase'in m&&m.phase).toBe('final');}
 }
 expect(bank.some(q=>q.id==='r6-g1m-20000588-i7'||q.id==='r6-g6c-20003716-su')).toBe(false);
 expect(questionById('m1hx-983719628affd954')).toBeDefined();expect(questionById('g6c-55ded244eb74ad9a50')).toBeDefined();
});
it.each(cases)('%s grade%s %s %s receives new matching sources, distinct families, no mastered repeats',(_id,grade,school,course)=>{
 const add=bank.filter(q=>q.grade===grade&&q.course===course),s={...freshLearning(),school};for(const q of LEARNING_BANK)if(q.grade===grade&&q.course===course&&!add.some(n=>n.id===q.id))markMastered(s,q.id);
 for(const q of add)expect(eligibleExam(school,grade,course,q),q.id).toBe(true);const chosen=allocateQuestions(s,grade,course,6);expect(chosen).toHaveLength(6);expect(chosen.every(q=>add.some(n=>n.id===q.id))).toBe(true);expect(new Set(chosen.map(q=>questionById(q.id)!.sourceFamily)).size).toBe(6);markMastered(s,chosen[0].id);expect(allocateQuestions(s,grade,course,6).some(q=>q.id===chosen[0].id)).toBe(false);
});
it('keeps mismatched publishers and grades out of actual allocation',()=>{
 for(const q of bank.filter(q=>q.grade===1))expect(eligibleExam('nantun',1,'math',q)).toBe(false);
 const brownie=allocateQuestions({...freshLearning(),school:'dunhua'},4,'chinese',6);expect(brownie.every(q=>questionById(q.id)!.grade===4)).toBe(true);expect(brownie.some(q=>bank.some(n=>n.id===q.id))).toBe(false);
});
it('retains actual-main c66 partially answered voyages and every stored reward',()=>{
 expect(pinned.base).toBe('c66f492811c51298673fede44d0997d33aa64494');expect(pinned.items).toHaveLength(4);for(const item of pinned.items){for(const[id,digest]of Object.entries(item.runQuestionHashes))expect(hash(questionById(id)),id).toBe(digest);for(const old of [item.storedFamily,item.expectedRuntime]){const restored=structuredClone(validateFamily(structuredClone(old)));expect(restored).toEqual(item.expectedRuntime);expect(restored.profiles[item.player as keyof typeof restored.profiles].run!.index).toBe(1);}}
});
it('awards each new correct answer once without touching siblings, tickets or existing collections',()=>{
 for(const q of bank){const[player,,school]=cases.find(([,g,,c])=>g===q.grade&&c===q.course)!;const f=newFamily(),p=f.profiles[player];p.learning.school=school;p.coins=1234;p.tickets=3;p.starTickets=2;startRun(f,player,q.course,'round6-once-reward',117,false,'2026-11-07');p.run!.questions[0]=q.id;const peers=Object.fromEntries(Object.entries(f.profiles).filter(([id])=>id!==player).map(([id,x])=>[id,structuredClone(x)])),owned=structuredClone(p.owned);answerRun(f,player,p.run!.id,0,q.answer,'2026-11-07');try{answerRun(f,player,p.run!.id,0,q.answer,'2026-11-07');}catch{/* A settled duplicate may be rejected. */}expect(p.coins,q.id).toBe(1244);expect(p.tickets).toBe(3);expect(p.starTickets).toBe(2);expect(p.owned).toEqual(owned);for(const[id,old]of Object.entries(peers))expect(f.profiles[id as keyof typeof f.profiles],q.id).toEqual(old);}
});
it('renders phonetic answers explicitly, never substitutes glyph spelling choices or speaks the target',()=>{
 for(const q of bank.filter(q=>q.subject==='chinese')){expect(q.hideReadingHints,q.id).toBe(true);expect(questionSpeech(q)).toBe('請看畫面中的詞句，選出正確答案。');expect(canListenToEnglishChoices(q.grade,q)).toBe(false);for(const o of q.options){if(/^[ㄅ-ㄯˊˇˋ˙]+$/.test(o.text))expect(o.zy,q.id).toBe(o.text);else expect(o.zy,q.id).toBeUndefined();}}
});
it('uses complete prompt/hint/answer contexts for points, polyphones and rare Chinese words',()=>{
 const q=bank.find(q=>q.id==='r6-g1m-20000588-iv5')!;expect(syllables(q.prompt).filter(x=>x.text==='得').map(x=>x.zy)).toEqual(['ㄉㄜˊ','ㄉㄜˊ']);expect(syllables(q.hint).filter(x=>x.text==='得').map(x=>x.zy)).toEqual(['ㄉㄜˊ','ㄉㄜˊ']);
 expect(syllables(bank.find(q=>q.id==='r6-g6c-20003716-hua')!.prompt).filter(x=>x.text==='划').map(x=>x.zy)).toEqual(['ㄏㄨㄚˊ']);
 expect(syllables(bank.find(q=>q.id==='r6-g6c-20003716-idiom4')!.prompt).filter(x=>x.text==='為').map(x=>x.zy)).toEqual(['ㄨㄟˊ']);
 expect(syllables(bank.find(q=>q.id==='r6-g6c-20003716-bo2')!.explanation).filter(x=>x.text==='薄').map(x=>x.zy)).toEqual(['ㄅㄛˊ','ㄅㄛˊ']);
 expect(syllables('腳踝').map(x=>x.zy)).toEqual(['ㄐㄧㄠˇ','ㄏㄨㄞˊ']);expect(syllables('醞釀').map(x=>x.zy)).toEqual(['ㄩㄣˋ','ㄋㄧㄤˋ']);expect(syllables('恣意').map(x=>x.zy)).toEqual(['ㄗˋ','ㄧˋ']);
});
