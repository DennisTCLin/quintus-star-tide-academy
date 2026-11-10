import {describe,it,expect} from 'vitest';
import {newFamily,validateFamily,readyQuestion,protectAdventureReservation,startRun,answerRun,nextQuestion,adaptRun,allocateBattleQuestion,recordBattleAnswer,settleCapture} from '../adventure';
import {enableAdaptive,reportSchoolExposure,observeAdaptive,challengeEligible,allocateMastered,validateAdaptive,adaptiveSummary,showExample,LearningPreparationNeeded} from '../adaptive-learning';
import {TOPIC_BY_ID,LEARNING_TOPICS,topicForQuestion} from '../adaptive-catalog';
import {freshLearning,validateLearning,mergeLearning,allocateQuestions,allocateAdventureQuestions} from '../learning-engine';
import {startStudy,startLearning,learningScope,learningLesson,answerStudy,nextStudy,pauseStudy,publicLearningLesson,observeStudy} from '../study-review';
import {createCaptureTrial,reserveCaptureTrial,validateCaptureTrial,skipCapture,adaptCapture,answerCapture,capturePending} from '../capture-trial';
import {questionById,LEARNING_BANK,COURSES,type Grade} from '../learning';
import {markMastered} from '../mastered-questions';
import {startIsland,answerIsland,finishIsland} from '../island/server';
import {islandConceptReady,reportIslandScope,observeIslandReadiness,protectIslandReservation} from '../island/adaptive';
import {makeItem,UNIT_BY_ID} from '../island/games';
import {islandOutcome,islandWrongFeedback} from '../island/presentation';
const day='2026-11-10';
const topic=TOPIC_BY_ID['4:math:mul-1'];
const questions=topic.questions.slice(1,20).map(id=>questionById(id)!);
const state=()=>{const s=freshLearning();s.school='yongchun';enableAdaptive(s);return s;};
function ready(s:ReturnType<typeof state>,count=10){reportSchoolExposure(s,4,topic.id,'taught',day);questions.slice(0,count).forEach(q=>observeAdaptive(s,q,true,false,day));}
const balances=(p:ReturnType<typeof newFamily>['profiles']['quintus'])=>JSON.stringify({coins:p.coins,tickets:p.tickets,growth:p.growth,owned:p.owned,milestones:p.milestones,credited:p.credited,rewardStars:p.rewardStars});
describe('school exposure and independent learning evidence',()=>{
 it('never treats unknown scope, correct-after-hint, or earned bits as readiness',()=>{
  const s=state();markMastered(s,questions[0].id);expect(challengeEligible(s,questions[0],4)).toBe(false);
  ready(s,1);expect(challengeEligible(s,questions[0],4)).toBe(false);
  observeAdaptive(s,questions[1],true,true,day);expect(()=>allocateMastered(s,4,'math',1)).toThrow(LearningPreparationNeeded);
  observeAdaptive(s,questions[1],true,false,day);expect(challengeEligible(s,questions[1],4)).toBe(false);
  observeAdaptive(s,questions[1],true,false,'2026-11-11');expect(challengeEligible(s,questions[1],4)).toBe(true);
  reportSchoolExposure(s,4,topic.id,'not-yet',day);expect(()=>allocateMastered(s,4,'math',1)).toThrow();
 });
 it('keeps school progress separate from ability; school changes revoke eligibility without deleting evidence',()=>{
  const s=state();ready(s);const before=structuredClone(s.adaptive!.evidence);s.school='nantun';expect(()=>allocateQuestions(s,4,'math',6)).toThrow();expect(s.adaptive!.evidence).toEqual(before);
  expect(()=>reportSchoolExposure(s,1,topic.id,'taught',day)).toThrow();
 });
 it('excludes all unmapped/mismatched exams and English variants, without a capacity fallback',()=>{
  const s=state();ready(s);for(const q of LEARNING_BANK.filter(q=>q.grade===4&&q.examSources))observeAdaptive(s,q,true,false,day);
  const chosen=allocateAdventureQuestions(s,4,'math',6);expect(chosen.every(x=>topicForQuestion(x.id)?.id===topic.id)).toBe(true);
  expect(()=>allocateAdventureQuestions(s,4,'english',6)).toThrow();expect(allocateMastered(s,4,'math',6,questions.map(q=>q.id)).every(x=>!questions.some(q=>q.id===x.id)&&challengeEligible(s,questionById(x.id),4))).toBe(true);
 });
 it('preserves server-owned scope and evidence on merge; offline files cannot forge them',()=>{
  const s=state();ready(s);const incoming=freshLearning();incoming.adaptive=structuredClone(s.adaptive);incoming.adaptive!.scope={};
  expect(mergeLearning(s,incoming).adaptive).toEqual(s.adaptive);
  expect(mergeLearning(freshLearning(),s).adaptive).toBeUndefined();expect(()=>validateLearning(s,4)).not.toThrow();expect(()=>validateAdaptive(s.adaptive,1)).toThrow();
 });
 it('has a usable original teaching route in each current grade/course and exact letter group mapping',()=>{
  for(const grade of [1,2,4,5,6] as Grade[])for(const c of COURSES[grade])expect(LEARNING_TOPICS.filter(t=>t.grade===grade&&t.course===c.id).flatMap(t=>t.questions).length,`${grade}:${c.id}`).toBeGreaterThan(6);
  const letters=TOPIC_BY_ID['1:english:intro-0'];expect(letters.questions).toHaveLength(26);expect(letters.questions.every(id=>questionById(id)!.prompt.startsWith('找出大寫'))).toBe(true);
 });
});
describe('teach then practise without spending progress or rewards',()=>{
 it('starts a low-stakes scope question for a novice; specific worked answer remains exposed for the day',()=>{
  const f=newFamily(),p=f.profiles.quintus;enableAdaptive(p.learning);const before=balances(p);
  expect(startRun(f,'quintus','math','start',1,false,day)).toBe('learn');expect(p.run).toBeNull();expect(balances(p)).toBe(before);
  const r=p.learning.study!.session!;expect(r.phase).toBe('scope');expect(publicLearningLesson(p.learning)?.example).toBeUndefined();
  learningScope(p.learning,4,r.id,'preview',day);expect(r.phase).toBe('lesson');expect(publicLearningLesson(p.learning)?.example?.answer).toBeDefined();expect(publicLearningLesson(p.learning)?.example?.id).toBe(r.questions[0]);
  learningLesson(p.learning,r.id,0,day,true);const q=questionById(r.questions[0])!;answerStudy(p.learning,4,r.id,0,q.answer,day);expect(challengeEligible(p.learning,q,4)).toBe(false);
  expect(balances(p)).toBe(before);expect(()=>validateFamily(f)).not.toThrow();
 });
 it('wrong independent answer leads to teaching before the next different question; hints never certify',()=>{
  const s=state();reportSchoolExposure(s,4,topic.id,'taught',day);startLearning(s,4,day,'learn','math');const r=s.study!.session!,q=questionById(r.questions[0])!;
  answerStudy(s,4,r.id,0,(q.answer+1)%q.options.length,day);nextStudy(s,r.id,0);expect(r.phase).toBe('lesson');expect(r.questions[1]).not.toBe(q.id);expect(s.adaptive!.examples[r.questions[1]]).toBe(day);
  const exposed=questionById(r.questions[1])!;pauseStudy(s,r.id,true,day);observeAdaptive(s,exposed,true,false,day);expect(challengeEligible(s,exposed,4)).toBe(false);startLearning(s,4,day,'replacement','math');s.study!.session=r;
  learningLesson(s,r.id,1,day,true);expect(r.phase).toBe('answer');expect(()=>validateLearning(s,4)).not.toThrow();
 });
 it('not yet taught persists even when no replacement scope is available, without a failed transaction',()=>{
  const s=state();startLearning(s,4,day,'learn','science');learningScope(s,4,'learn','not-yet',day);expect(s.study!.session).toBeNull();expect(Object.values(s.adaptive!.scope)[0].state).toBe('not-yet');
 });
 it('keeps pending old voyage answers/ledgers and replaces only unanswered questions',()=>{
  const f=newFamily(),p=f.profiles.quintus;startRun(f,'quintus','math','old',1,false,day);const r=p.run!;const q=questionById(r.questions[0])!;answerRun(f,'quintus',r.id,0,q.answer,day);nextQuestion(f,'quintus',r.id,0);
  const first=r.questions[0],answers=[...r.answers!],before=balances(p);enableAdaptive(p.learning);ready(p.learning);
  adaptRun(f,'quintus',r.id,day);expect(r.questions[0]).toBe(first);expect(r.answers).toEqual(answers);expect(balances(p)).toBe(before);
  const restored=validateFamily(f);expect(restored.profiles.quintus.run?.questions).toEqual(r.questions);
 });
 it('blocks capture and battle without mastered capacity; eligible capture uses only learned IDs',()=>{
  const f=newFamily(),p=f.profiles.quintus;enableAdaptive(p.learning);expect(()=>createCaptureTrial(p,4,'math',[])).toThrow();expect(()=>allocateBattleQuestion(f,'quintus','math','token')).toThrow();
  ready(p.learning);const t=createCaptureTrial(p,4,'math',[]);expect(t.questions.every(id=>challengeEligible(p.learning,questionById(id),4))).toBe(true);
  const a=allocateBattleQuestion(f,'quintus','math','token');reportSchoolExposure(p.learning,4,topic.id,'not-yet',day);expect(()=>recordBattleAnswer(f,'quintus','token',a.id,true,day)).toThrow();
 });
 it('reserves the earned capture opportunity without granting a card when learned capacity is insufficient',()=>{
  const f=newFamily(),p=f.profiles.quintus;startRun(f,'quintus','math','old',1,false,day);enableAdaptive(p.learning);const r=p.run!;const before=p.captureQuota?.attempts??0;
  settleCapture(p,r,day,.1,{grade:4,course:'math',exclude:[]});expect(r.capture?.outcome).toBe('pending');expect(r.capture?.version).toBe(3);expect(p.captureQuota?.attempts).toBe(before+1);expect(r.capture?.trial?.answers).toEqual([]);expect(r.capture?.trial?.questions).toEqual([]);expect(r.capture?.trial?.deferred).toBe(true);const saved=structuredClone(p);settleCapture(p,r,day,.8,{grade:4,course:'math',exclude:[]});expect(p).toEqual(saved);
 });
});
describe('separate math-island policy',()=>{
 it('only independent practice builds readiness; old stage flags do not grant a challenge',()=>{
  const f=newFamily(),p=f.profiles.qingqing;enableAdaptive(p.learning);p.learning.school='xingan';const r=startIsland(f,'qingqing','learn','1A-01','learn',day);
  for(let i=0;i<r.items.length;i++)answerIsland(f,'qingqing',r.id,i,r.items[i].answer,day);finishIsland(f,'qingqing',r.id,day);
  p.mathIsland!.units['1A-01'].play=true;expect(()=>startIsland(f,'qingqing','boss','1A-01','boss',day)).toThrow('獨立');
  reportIslandScope(p.mathIsland!,p.learning,'1A-01',true,1);expect(()=>startIsland(f,'qingqing','boss','1A-01','boss',day)).toThrow();
  const play=startIsland(f,'qingqing','play','1A-01','play',day);expect(play.practice).toBe(true);expect(play.items.every(q=>q.unit==='1A-01')).toBe(true);
 });
 it('protects an old unsafe boss reservation without clearing its answers or earned rewards',()=>{
  const f=newFamily(),p=f.profiles.qingqing;p.mathIsland={units:{'1A-01':{learn:true,play:true}},pool:[],stats:{},day,attempted:[]};
  const r=startIsland(f,'qingqing','boss','1A-01','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',day);const before=structuredClone(r);enableAdaptive(p.learning);protectIslandReservation(p.mathIsland,p.learning,1);
  expect(r.practice).toBe(true);expect({...r,practice:undefined}).toEqual({...before,practice:undefined});expect(()=>validateFamily(f)).not.toThrow();
 });
});

describe('reported counterexamples',()=>{
 it('teaches the actual unfamiliar word before practice and preserves preview for another session',()=>{
  const s=freshLearning();enableAdaptive(s);startLearning(s,6,day,'preview','english');learningScope(s,6,'preview','preview',day);
  const r=s.study!.session!;
  for(let i=0;i<r.questions.length;i++){
   if(i)nextStudy(s,r.id,i-1);
   expect(publicLearningLesson(s)?.example?.id).toBe(r.questions[i]);
   expect(publicLearningLesson(s)?.example?.explanation).toBe(questionById(r.questions[i])!.explanation);
   learningLesson(s,r.id,i,day,true);answerStudy(s,6,r.id,i,questionById(r.questions[i])!.answer,day);
   expect(challengeEligible(s,questionById(r.questions[i]),6)).toBe(false);
  }
  expect(()=>startLearning(s,6,day,'again','english')).not.toThrow();expect(s.study!.session!.phase).toBe('lesson');
 });
 it('uses attainable distinct-item readiness and allows a mock from ready A units only',()=>{
  const f=newFamily(),p=f.profiles.qingqing;enableAdaptive(p.learning);p.mathIsland={units:{'1A-02':{learn:true,play:true}},pool:[],stats:{},day,attempted:[]};
  const island=p.mathIsland;reportIslandScope(island,p.learning,'1A-02',true,1);
  for(const k of UNIT_BY_ID['1A-02'].games){const seen=new Set<string>();for(let n=0;n<200&&!island.readiness?.evidence[k]?.ready;n++){const q=makeItem(k,seen);seen.add(q.id);observeIslandReadiness(island,q,true,false);}expect(islandConceptReady(island,p.learning,{unit:'1A-02',k},1)).toBe(true);}
  const r=startIsland(f,'qingqing','mock',undefined,'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',day);expect(r.items.every(q=>q.unit==='1A-02')).toBe(true);
  expect(()=>validateFamily(f)).not.toThrow();
 });
 it('practice keeps reteaching after six errors without a failure outcome',()=>{
  expect(islandWrongFeedback('boss',6,'2',true).reteach).toBe(true);
  expect(islandOutcome({mode:'play',practice:true,size:6,right:0,wrong:6}).failed).toBe(false);
 });
});

it('preserves an old all-answered island completion awaiting settlement',()=>{
 const legacy=newFamily(),p=legacy.profiles.qingqing;p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day,attempted:[]};
 const r=startIsland(legacy,'qingqing','play','1A-01','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',day);
 for(let i=0;i<6;i++)answerIsland(legacy,'qingqing',r.id,i,r.items[i].answer,day);
 const upgraded=structuredClone(legacy);enableAdaptive(upgraded.profiles.qingqing.learning);protectIslandReservation(upgraded.profiles.qingqing.mathIsland,upgraded.profiles.qingqing.learning,1);
 finishIsland(legacy,'qingqing',r.id,day);finishIsland(upgraded,'qingqing',r.id,day);
 expect(balances(upgraded.profiles.qingqing)).toBe(balances(legacy.profiles.qingqing));expect(upgraded.profiles.qingqing.mathIsland!.run!.savedStar).toBe(true);
});

it('pauses the clock of a blocked old voyage before teaching, preserving correct answers and rewards',()=>{
 const f=newFamily(),p=f.profiles.quintus;startRun(f,'quintus','math','old-clock',1,false,day,'standard');const r=p.run!;
 readyQuestion(f,'quintus',r.id,0,1000);expect(r.challenge?.clock).toBeTruthy();const before=balances(p);
 enableAdaptive(p.learning);protectAdventureReservation(p,4);expect(r.challenge!.clock).toBeNull();expect(balances(p)).toBe(before);expect(r.challenge!.timeouts).toEqual([]);
});

it('a small mastered bank can support capture without importing unfamiliar filler',()=>{
 const f=newFamily(),p=f.profiles.quintus;enableAdaptive(p.learning);ready(p.learning,6);const ids=questions.slice(0,6).map(q=>q.id);
 const t=createCaptureTrial(p,4,'math',ids);expect(new Set(t.questions).size).toBe(3);expect(t.questions.every(id=>challengeEligible(p.learning,questionById(id),4))).toBe(true);
});

for(const prefix of [5,6])it(`preserves legacy island capture with ${prefix} answers, then resumes after learning across a day boundary`,()=>{
 const f=newFamily(),p=f.profiles.qingqing;p.mathIsland={units:{'1A-01':{learn:true}},pool:[],stats:{},day,attempted:[]};
 const r=startIsland(f,'qingqing','play','1A-01','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',day);
 for(let i=0;i<prefix;i++)answerIsland(f,'qingqing',r.id,i,r.items[i].answer,day);
 enableAdaptive(p.learning);protectIslandReservation(p.mathIsland,p.learning,1);
 for(let i=prefix;i<6;i++)answerIsland(f,'qingqing',r.id,i,r.items[i].answer,day);
 finishIsland(f,'qingqing',r.id,day);expect(r.capture?.outcome).toBe('pending');expect(capturePending(p)).toBe(true);
 const before=balances(p),quota=structuredClone(p.captureQuota),monster=r.capture!.monster;
 expect(()=>answerCapture(f,'qingqing','island',r.id,0,0,day)).toThrow('先練熟');
 expect(adaptCapture(f,'qingqing','island',r.id,day)).toBe('learn');expect(balances(p)).toBe(before);expect(r.capture!.monster).toBe(monster);
 expect(()=>startIsland(f,'qingqing','play','1A-01','new',day)).toThrow('降服');
 const t=TOPIC_BY_ID['1:math:add-1'];reportSchoolExposure(p.learning,1,t.id,'taught','2026-11-11');
 t.questions.slice(0,6).forEach(id=>observeAdaptive(p.learning,questionById(id)!,true,false,'2026-11-11'));
 expect(adaptCapture(f,'qingqing','island',r.id,'2026-11-11')).toBe(true);
 expect(r.capture!.trial!.questions).toHaveLength(3);expect(r.capture!.trial!.deferred).toBeUndefined();expect(r.capture!.trial!.questions.every(id=>challengeEligible(p.learning,questionById(id),1,'math'))).toBe(true);
 for(let i=0;i<3;i++)answerCapture(f,'qingqing','island',r.id,i,questionById(r.capture!.trial!.questions[i])!.answer,'2026-11-11');
 expect(['joined','duplicate']).toContain(r.capture!.outcome);expect(p.captureQuota).toEqual(quota);
 const settled=structuredClone(p);finishIsland(f,'qingqing',r.id,'2026-11-11');expect(p).toEqual(settled);expect(()=>validateFamily(f)).not.toThrow();
});

it('keeps a valid recoverable capture even with an empty reviewed catalog',()=>{
 const f=newFamily(),p=f.profiles.quintus;enableAdaptive(p.learning);const topics=LEARNING_TOPICS.splice(0);
 try{const t=reserveCaptureTrial(p,4,'math',[]);expect(t).toMatchObject({deferred:true,questions:[],answers:[]});expect(()=>validateCaptureTrial({version:3,chance:100,monster:'metal-storm-dragon',outcome:'pending',trial:t},4,'math')).not.toThrow();}
 finally{LEARNING_TOPICS.push(...topics);}
});
it('accepts only consistent deferred states and preserves explicit abandonment',()=>{
 const f=newFamily(),p=f.profiles.quintus;startRun(f,'quintus','math','old-deferred',1,false,day);const r=p.run!;enableAdaptive(p.learning);r.status='won';
 settleCapture(p,r,day,.1,{grade:4,course:'math',exclude:[]});const valid=structuredClone(r.capture!);expect(()=>validateCaptureTrial(valid,4,'math')).not.toThrow();
 for(const alter of [(c:any)=>delete c.trial.deferred,(c:any)=>c.trial.deferred=false,(c:any)=>c.trial.questions=['bad'],(c:any)=>c.trial.answers=[{choice:0,correct:true}],(c:any)=>c.outcome='joined',(c:any)=>c.outcome='unavailable',(c:any)=>c.trial.skipped=true,(c:any)=>c.trial.course='tones']){
  const c=structuredClone(valid);alter(c);expect(()=>validateCaptureTrial(c,4,'math')).toThrow();
 }
 skipCapture(f,'quintus','voyage',r.id);expect(r.capture!.outcome).toBe('escaped');expect(()=>validateCaptureTrial(r.capture!,4,'math')).not.toThrow();expect(()=>adaptCapture(f,'quintus','voyage',r.id,day)).toThrow();
});
