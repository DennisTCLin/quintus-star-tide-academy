import { describe, it, expect } from 'vitest';
import { freshLearning, validateLearning, allocateAdventureQuestions, questionDifficulty } from '../learning-engine';
import { newFamily, startRun, answerRun, nextQuestion, readyQuestion, validateFamily } from '../adventure';
import { skipCapture } from '../capture-trial';
import { enableAdaptive, observeAdaptive, independentSuccess, hasChallengeCapacity, challengeEligible, showExample } from '../adaptive-learning';
import { TOPIC_BY_ID, topicForQuestion } from '../adaptive-catalog';
import { questionById, COURSES, type Grade } from '../learning';
import { startLearning, answerStudy, nextStudy, learningLesson, pauseStudy, publicLearningLesson, observeStudy } from '../study-review';
import { pilotQuestions } from '../adaptive-pilot';
import { transferSignature } from '../adaptive-transfer';
const day='2026-11-16';
const fresh=()=>{const s=freshLearning();enableAdaptive(s);return s;};
function respond(s:ReturnType<typeof fresh>,correct=true){const r=s.study!.session!,q=questionById(r.questions[r.index])!;answerStudy(s,q.grade,r.id,r.index,correct?q.answer:(q.answer+1)%q.options.length,day);}
function cluster(topic='2:math:add-1') {const groups=new Map<string,string[]>();for(const id of TOPIC_BY_ID[topic].questions){const sig=transferSignature(questionById(id)!);if(sig)groups.set(sig,[...groups.get(sig)??[],id]);}return [...groups.values()].find(ids=>ids.length>=10)!;}

describe('automatic learning pilot',()=>{
  for(const grade of [1,2,4,5,6] as Grade[])for(const course of COURSES[grade])
  it(`${grade}:${course.id} starts without a school questionnaire; six errors are safe probes`,()=>{
    const s=fresh();startLearning(s,grade,day,'probe',course.id);
    expect(s.study!.session!.phase).toBe('answer');expect(s.adaptive!.scope).toEqual({});
    const answered:string[]=[];
    for(let n=0;n<6;n++){
      const r=s.study!.session!;expect(r.questions.length).toBeLessThanOrEqual(6);
      if(r.phase==='lesson')learningLesson(s,r.id,r.index,day,true);
      answered.push(r.questions[r.index]);respond(s,false);expect(()=>validateLearning(s,grade)).not.toThrow();
      if(r.status==='complete')break;nextStudy(s,r.id,r.index,day);
    }
    expect(s.study!.session!.status).toBe('complete');expect(new Set(answered).size).toBe(answered.length);
    expect(s.adaptive!.scope).toEqual({});expect(hasChallengeCapacity(s,grade,course.id)).toBe(false);
  });
  it('uses independent dated history immediately, without daily re-onboarding',()=>{
    const f=newFamily(),p=f.profiles.feifei;enableAdaptive(p.learning);
    for(const id of cluster().slice(0,2))observeStudy(p.learning,questionById(id)!,true,false,'2026-11-15');
    const history=structuredClone(p.learning.study!.entries);p.day=day;
    expect(startRun(f,'feifei','math','battle',1,false,day)).not.toBe('learn');
    expect(p.run!.questions).toHaveLength(6);expect(p.learning.study!.entries).toEqual(history);expect(p.learning.adaptive!.scope).toEqual({});
    for(let i=0;i<3;i++){const q=questionById(p.run!.questions[i])!;answerRun(f,'feifei','battle',i,(q.answer+1)%q.options.length,day);if(i<2)nextQuestion(f,'feifei','battle',i);}
    expect(p.run!.status).toBe('failed');expect(()=>validateFamily(f)).not.toThrow();
  });
  it('automatically probes a reviewed next step once after three rewarded rounds, without charging rewards',()=>{
    const f=newFamily(),p=f.profiles.feifei;enableAdaptive(p.learning);p.day=day;p.rewardRounds=3;
    cluster().slice(0,2).forEach(id=>observeAdaptive(p.learning,questionById(id)!,true,false,day));
    const ledger=()=>{const {learning,...rest}=p;return structuredClone(rest);},before=ledger();
    expect(startRun(f,'feifei','math','step-up',1,false,day)).toBe('learn');
    expect(p.learning.study!.session!.topic).toBe('2:math:add-2');expect(p.learning.study!.session!.phase).toBe('answer');
    expect(p.learning.adaptive!.coachedRound).toBe(`${day}:3`);expect(ledger()).toEqual(before);
    // The same milestone cannot demand another probe or duplicate a reward.
    expect(startRun(f,'feifei','math','continue',1,false,day)).not.toBe('learn');expect(p.run!.questions).toHaveLength(6);
  });
  it('does not force fully evidenced content back into a probe at a three-round milestone',()=>{
    const f=newFamily(),p=f.profiles.alston;enableAdaptive(p.learning);p.day=day;p.rewardRounds=3;
    for(const id of TOPIC_BY_ID['6:english:vocabulary'].questions)observeAdaptive(p.learning,questionById(id)!,true,false,day);
    expect(startRun(f,'alston','english','known',1,false,day)).not.toBe('learn');expect(p.run!.questions).toHaveLength(6);expect(p.learning.study?.session).toBeFalsy();
  });
  it('keeps an earned checkpoint across midnight and preserves paused learning',()=>{
    const f=newFamily(),p=f.profiles.feifei;enableAdaptive(p.learning);p.day='2026-11-15';p.rewardRounds=4;
    cluster().slice(0,2).forEach(id=>observeAdaptive(p.learning,questionById(id)!,true,false,'2026-11-15'));
    startLearning(p.learning,2,'2026-11-15','saved','math');pauseStudy(p.learning,'saved',false,'2026-11-15');
    const saved=structuredClone(p.learning.study!.session!);expect(startRun(f,'feifei','math','ignored',1,false,day)).toBe('learn');
    expect(p.learning.study!.session).toEqual({...saved,status:'active'});expect(p.learning.adaptive!.coachedRound).toBe('2026-11-15:3');expect(p.day).toBe('2026-11-15');expect(p.rewardRounds).toBe(4);
  });
  it('scheduled probes select unmet facts instead of due, already independent vocabulary',()=>{
    const f=newFamily(),p=f.profiles.alston;enableAdaptive(p.learning);p.day=day;p.rewardRounds=3;
    const old=TOPIC_BY_ID['6:english:vocabulary'].questions.slice(0,6);
    old.forEach(id=>observeStudy(p.learning,questionById(id)!,true,false,'2026-11-10'));
    expect(startRun(f,'alston','english','expand',1,false,day)).toBe('learn');
    expect(p.learning.study!.session!.advance).toBe(true);expect(p.learning.study!.session!.questions.every(id=>!old.includes(id))).toBe(true);
  });
  it('uses the requested battle difficulty only within the independently safe pool',()=>{
    const s=fresh();for(const topic of ['2:math:add-1','2:math:add-2'])cluster(topic).slice(0,2).forEach(id=>observeAdaptive(s,questionById(id)!,true,false,day));
    const got=allocateAdventureQuestions(s,2,'math',6,2);expect(got).toHaveLength(6);expect(got.every(x=>questionDifficulty(questionById(x.id)!)===2&&challengeEligible(s,questionById(x.id),2))).toBe(true);
    expect(allocateAdventureQuestions(s,2,'math',6,3).every(x=>questionDifficulty(questionById(x.id)!)<=2&&challengeEligible(s,questionById(x.id),2))).toBe(true);
  });
  it.each(['relaxed','standard'] as const)('advances automatically during twelve real %s voyages',mode=>{
    const f=newFamily(),p=f.profiles.feifei;enableAdaptive(p.learning);
    cluster().slice(0,2).forEach(id=>observeAdaptive(p.learning,questionById(id)!,true,false,day));
    const checkpoints:number[]=[],probedTopics=new Set<string>();
    for(let round=1;round<=12;round++){
      const result=startRun(f,'feifei','math',`departure-${round}`,round,false,day,mode);
      if(result==='learn'){
        checkpoints.push(round);const study=p.learning.study!.session!;expect(study.advance).toBe(true);
        while(study.status!=='complete'){
          probedTopics.add(study.topic!);
          if(study.phase==='lesson')learningLesson(p.learning,study.id,study.index,day,true);
          const q=questionById(study.questions[study.index])!;
          answerStudy(p.learning,2,study.id,study.index,q.answer,day);expect(()=>validateFamily(f)).not.toThrow();
          if(p.learning.study!.session!.status!=='complete'){nextStudy(p.learning,study.id,study.index,day);expect(()=>validateFamily(f)).not.toThrow();}
        }
        expect(study.answers).toHaveLength(3);
        expect(startRun(f,'feifei','math',`voyage-${round}`,round,false,day,mode)).not.toBe('learn');
      }
      const run=p.run!;expect(run.questions).toHaveLength(6);
      expect(run.questions.every(id=>challengeEligible(p.learning,questionById(id),2,'math'))).toBe(true);
      for(let index=0;index<6;index++){
        const q=questionById(run.questions[index])!;readyQuestion(f,'feifei',run.id,index,1000);
        answerRun(f,'feifei',run.id,index,q.answer,day,0.9,2000);
        if(index<5)nextQuestion(f,'feifei',run.id,index);expect(()=>validateFamily(f)).not.toThrow();
      }
      expect(run.status).toBe('won');expect(p.rewardRounds).toBe(round);
      if(run.capture?.outcome==='pending')skipCapture(f,'feifei','voyage',run.id);
      expect(()=>validateFamily(f)).not.toThrow();
    }
    expect(checkpoints).toEqual([4,7,10]);expect(probedTopics.has('2:math:add-2')).toBe(true);expect(probedTopics.has('2:math:sub-2')).toBe(true);
  });
  it('bypasses coaching when the only gap is still retry-spacing blocked',()=>{
    const f=newFamily(),p=f.profiles.alston;enableAdaptive(p.learning);p.day=day;p.rewardRounds=3;
    const ids=TOPIC_BY_ID['6:english:vocabulary'].questions;
    ids.slice(0,-1).forEach(id=>observeAdaptive(p.learning,questionById(id)!,true,false,day));
    const gap=questionById(ids.at(-1)!)!;observeStudy(p.learning,gap,false,false,day);observeAdaptive(p.learning,gap,false,false,day);
    expect(startRun(f,'alston','english','blocked-gap',1,false,day)).not.toBe('learn');expect(p.run!.questions).toHaveLength(6);expect(p.run!.questions).not.toContain(gap.id);
    expect(p.run!.questions.every(id=>challengeEligible(p.learning,questionById(id),6,'english'))).toBe(true);
    expect(p.learning.study!.session).toBeNull();expect(p.learning.adaptive!.coachedRound).toBeUndefined();expect(()=>validateFamily(f)).not.toThrow();
  });
  it('keeps a reserved six-question fact battle usable after errors in different concepts',()=>{
    const f=newFamily(),p=f.profiles.quintus;enableAdaptive(p.learning);
    for(const topic of ['4:science:observe','4:science:fair-test','4:science:data'])
      for(const id of TOPIC_BY_ID[topic].questions.slice(0,2))observeAdaptive(p.learning,questionById(id)!,true,false,day);
    startRun(f,'quintus','science','facts',1,false,day);expect(p.run!.questions).toHaveLength(6);
    for(let i=0;i<3;i++){const q=questionById(p.run!.questions[i])!;answerRun(f,'quintus','facts',i,(q.answer+1)%q.options.length,day);if(i<2)nextQuestion(f,'quintus','facts',i);}
    expect(p.run!.status).toBe('failed');expect(()=>validateFamily(f)).not.toThrow();
  });
  it('probes preserve the entire economy, including previous-day reward ledgers',()=>{
    const f=newFamily(),p=f.profiles.quintus;enableAdaptive(p.learning);p.coins=345;p.tickets=7;p.credited=['n1-g4-mul-1-0'];p.day='2026-11-15';
    const untouched=()=>{const {learning,...rest}=p;return structuredClone(rest);},before=untouched();
    expect(startRun(f,'quintus','math','pilot',1,false,day)).toBe('learn');expect(untouched()).toEqual(before);
    respond(p.learning,false);nextStudy(p.learning,'pilot',0,day);learningLesson(p.learning,'pilot',1,day,true);respond(p.learning);pauseStudy(p.learning,'pilot',false,day);
    expect(untouched()).toEqual(before);
  });
  it('uses a different numeric example and keeps assisted practice separate from the next probe',()=>{
    const s=fresh();startLearning(s,2,day,'learn','math');respond(s,false);nextStudy(s,'learn',0,day);
    const r=s.study!.session!;expect(r.phase).toBe('lesson');expect(r.example).not.toBe(r.questions[1]);
    expect(transferSignature(questionById(r.example!)!)).toBe(transferSignature(questionById(r.questions[1])!));
    const example=r.example;learningLesson(s,'learn',1,day,true);respond(s);expect(challengeEligible(s,questionById(r.questions[1]),2)).toBe(false);
    nextStudy(s,'learn',1,day);expect(r.phase).toBe('answer');expect(r.assisted).toBe(false);
    expect(r.questions[2]).not.toBe(example);expect(()=>validateLearning(s,2)).not.toThrow();
  });
  it('moves to a reviewed next step after independent evidence, steps back after a miss',()=>{
    const s=fresh(),ids=cluster();ids.slice(0,2).forEach(id=>observeAdaptive(s,questionById(id)!,true,false,day));
    expect(topicForQuestion(pilotQuestions(s,2,'math',day,1,[],'2:math:add-1')[0])?.id).toBe('2:math:add-2');
    startLearning(s,2,day,'learn','math','2:math:add-2');const r=s.study!.session!;expect(r.topic).toBe('2:math:add-2');
    respond(s,false);nextStudy(s,r.id,0,day);expect(r.topic).toBe('2:math:add-1');expect(r.phase).toBe('lesson');
  });
  it('teaches actual unknown vocabulary, not another word from the same broad topic',()=>{
    const s=fresh();startLearning(s,6,day,'word','english');const r=s.study!.session!;
    learningLesson(s,r.id,0,day);expect(publicLearningLesson(s)?.example?.id).toBe(r.questions[0]);
    learningLesson(s,r.id,0,day,true);respond(s);expect(challengeEligible(s,questionById(r.questions[0]),6)).toBe(false);
    nextStudy(s,r.id,0,day);expect(r.phase).toBe('answer');expect(r.questions[1]).not.toBe(r.questions[0]);
  });
  for(const phase of ['scope','answer','lesson'] as const)it(`resumes legacy ${phase} without replacing questions, answers, or history`,()=>{
    const s=fresh();startLearning(s,2,day,'old','math');const r=s.study!.session!;delete r.pilot;r.phase=phase;r.status='paused';
    const before=structuredClone(r);startLearning(s,2,day,'replacement','math');
    expect(r).toEqual({...before,status:'active',phase:phase==='scope'?'answer':phase});expect(()=>validateLearning(s,2)).not.toThrow();
  });
  it('does not infer mastery from exposed answers, one family, or imported independent entries',()=>{
    for(const kind of ['exposed','import'] as const){const s=fresh();for(const id of cluster().slice(0,2)){
      const q=questionById(id)!;if(kind==='exposed'){showExample(s,id,day);observeAdaptive(s,q,true,false,day);}else observeStudy(s,q,true,false,day);
    }if(kind==='import')s.adaptive!.ignoreLegacyEvidence=true;expect(hasChallengeCapacity(s,2,'math')).toBe(false);}
  });
  for(const finish of [false,true])it(`marks the visible legacy example on a later-day ${finish?'finish':'continue'}, not its stale first-example pointer`,()=>{
    const s=fresh();startLearning(s,6,'2026-11-15','legacy','english');const r=s.study!.session!;
    delete r.pilot;r.index=1;r.answers=[true];r.phase='lesson';r.status='paused';
    const shown=r.questions[1],stale=r.example!;showExample(s,shown,'2026-11-15');
    startLearning(s,6,day,'resume','english');expect(publicLearningLesson(s)?.example?.id).toBe(shown);
    if(finish)pauseStudy(s,r.id,true,day);else learningLesson(s,r.id,1,day,true);
    expect(s.adaptive!.examples[shown]).toBe(day);expect(s.adaptive!.examples[stale]).not.toBe(day);
    observeAdaptive(s,questionById(shown)!,true,false,day);expect(independentSuccess(s,questionById(shown)!)).toBe(false);
  });
  it('validates mixed-topic pilot snapshots and rejects cross-subject/mismatched current topics',()=>{
    const s=fresh();startLearning(s,4,day,'mixed','science');const r=s.study!.session!;
    expect(new Set(r.questions.map(id=>topicForQuestion(id)!.id)).size).toBeGreaterThan(1);expect(()=>validateLearning(s,4)).not.toThrow();
    const saved=structuredClone(s);r.questions[1]=TOPIC_BY_ID['4:english:details'].questions[0];expect(()=>validateLearning(s,4)).toThrow();
    saved.study!.session!.topic='4:science:fair-test';expect(()=>validateLearning(saved,4)).toThrow();
  });
});
