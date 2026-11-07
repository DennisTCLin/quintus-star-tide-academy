import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {FINALS_REVIEWED_20261107 as bank} from '../finals-reviewed-20261107';
import {LEARNING_BANK,questionById} from '../learning';
import {EXAM_SOURCES} from '../exam-sources';
import {eligibleExam} from '../school-curriculum';
import {freshLearning,allocateQuestions,allocateAdventureQuestions} from '../learning-engine';
import {markMastered} from '../mastered-questions';
import {newFamily,startRun,validateFamily,answerRun} from '../adventure';
import legacy from '../../docs/content-review/finals131-20261107/legacy-digests.json';
import blind from '../../docs/content-review/finals131-20261107/blind-results.json';
import mapping from '../../docs/content-review/finals131-20261107/mapping.json';
const cases=[['qingqing',1,'xingan','math'],['feifei',2,'nantun','math'],['jay',5,'dongmen','social'],['alston',6,'jianan','math']] as const;
const hash=(q:unknown)=>createHash('sha256').update(JSON.stringify(q)).digest('hex');

it('preserves all 6216 existing questions byte-for-byte, including saved IDs and answer semantics',()=>{
 expect(Object.keys(legacy)).toHaveLength(6216);
 for(const [id,digest] of Object.entries(legacy))expect(hash(questionById(id)),id).toBe(digest);
});
it('admits only individually reviewed source intersections and agrees with independent blind answers',()=>{
 expect(bank).toHaveLength(95);expect(new Set(bank.map(q=>q.id)).size).toBe(95);
 expect(mapping.filter(x=>x.status==='duplicate_suppressed')).toHaveLength(7);
 for(const q of bank){
  expect(q.options[q.answer].text,q.id).toBe(blind[q.id as keyof typeof blind].answerText);
  const m=mapping.find(x=>x.candidateId===q.id)!;
  expect(m.status).toBe('approved_candidate');
  expect(({1:[3,4,6,7,8,9],2:[7,8,9,10],5:[1,4],6:[6,7,8,9]} as const)[q.grade as 1|2|5|6]).toContain(m.unit);
  expect(q.id).toMatch(/^[a-z0-9-]{2,40}$/);
  expect(q.prompt).not.toMatch(/如下圖|右圖|左圖|看圖|聽音檔|承上題/);
  for(const citation of q.examSources!){const s=EXAM_SOURCES[citation.id];expect('grade' in s&&s.grade).toBe(q.grade);expect(s.publisher).toBe(q.publisher);expect('phase' in s&&s.phase).toBe('final');}
 }
 expect(bank.some(q=>q.course==='english')).toBe(false);
 expect(bank.some(q=>q.examSources!.some(s=>s.id.includes('20003318')))).toBe(false);
});
it.each(cases)('%s receives the matching additions without siblings, duplicates or mastered repeats',(player,grade,school,course)=>{
 const additions=bank.filter(q=>q.grade===grade&&q.course===course);
 const state={...freshLearning(),school};
 for(const q of LEARNING_BANK)if(!bank.some(n=>n.id===q.id)&&q.grade===grade&&q.course===course)markMastered(state,q.id);
 for(const q of additions)expect(eligibleExam(school,grade,course,q)).toBe(true);
 const picked=allocateAdventureQuestions(state,grade,course,6).map(q=>questionById(q.id)!);
 expect(picked.length).toBeGreaterThan(0);expect(picked.every(q=>additions.some(n=>n.id===q.id))).toBe(true);
 expect(new Set(picked.map(q=>q.sourceFamily)).size).toBe(picked.length);
 const first=picked[0];markMastered(state,first.id);
 expect(allocateQuestions(state,grade,course,6).every(q=>q.id!==first.id)).toBe(true);
 for(const q of additions)markMastered(state,q.id);
 try{expect(allocateQuestions(state,grade,course,6).every(q=>!questionById(q.id)?.examSources)).toBe(true);}catch(e){expect(String(e)).toMatch(/題目已全部答對|不足/);}
});
it('keeps every child’s saved voyage, mastery, collection and rewards through serialization/validation',()=>{
 const f=newFamily();
 for(const [player,grade,school,course] of cases){
  const p=f.profiles[player];p.learning.school=school;
  p.coins=1234;p.tickets=5;p.starTickets=4;p.rewardStars=1;p.rewardRounds=6;
  startRun(f,player,course,'saved-before-content-release',7);
  p.run!.questions=LEARNING_BANK.filter(q=>q.grade===grade&&q.course===course&&Object.prototype.hasOwnProperty.call(legacy,q.id)).slice(0,6).map(q=>q.id);
  markMastered(p.learning,LEARNING_BANK.find(q=>q.grade===grade&&q.course===course&&Object.prototype.hasOwnProperty.call(legacy,q.id)&&!p.run!.questions.includes(q.id))!.id);
 }
 const before=structuredClone(f),after=validateFamily(JSON.parse(JSON.stringify(f)));
 for(const [player] of cases){
  const a=after.profiles[player],b=before.profiles[player];
  for(const key of ['run','learning','coins','tickets','starTickets','rewardStars','rewardRounds','owned','firstAcquired','equipped','growth','credited','attempted'] as const)expect(a[key],`${player}.${key}`).toEqual(b[key]);
 }
});
it('credits every newly admitted question once and never changes other players on replay',()=>{
 for(const q of bank){
  const [player,,school]=cases.find(([,grade])=>grade===q.grade)!;
  const f=newFamily(),p=f.profiles[player];p.learning.school=school;p.coins=1234;
  startRun(f,player,q.course,'new-content-award',7);p.run!.questions[0]=q.id;
  const peers=Object.fromEntries(Object.entries(f.profiles).filter(([id])=>id!==player).map(([id,p])=>[id,structuredClone(p)]));
  answerRun(f,player,p.run!.id,0,q.answer);expect(p.coins).toBe(1244);expect(p.run!.answers?.[0]).toBe(true);
  try{answerRun(f,player,p.run!.id,0,q.answer);}catch{/* Settled answers are rejected. */}
  expect(p.coins).toBe(1244);
  for(const [id,old] of Object.entries(peers))expect(f.profiles[id as keyof typeof f.profiles]).toEqual(old);
 }
});

it('uses reviewed Taiwan polyphones inside the added low-grade questions',async()=>{
 const {syllables}=await import('../readability');
 for(const [text,suffix] of [['做哪件事花的時間比較長','ㄔㄤˊ'],['一般完整洗澡所需的時間比洗手長','ㄔㄤˊ'],['佩華沿著邊長','ㄔㄤˊ'],['一個四邊形的四條邊依序長','ㄔㄤˊ'],['又抽中','ㄓㄨㄥˋ']]){
  const reading=syllables(text).map(s=>s.zy);expect(reading[reading.length-1],text).toBe(suffix);
 }
});
