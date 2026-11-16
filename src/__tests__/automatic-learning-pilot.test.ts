import { describe, it, expect } from 'vitest';
import { freshLearning, validateLearning } from '../learning-engine';
import { newFamily, startRun, answerRun, nextQuestion, validateFamily } from '../adventure';
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
  it('uses independent dated history immediately, without daily or three-round re-onboarding',()=>{
    const f=newFamily(),p=f.profiles.feifei;enableAdaptive(p.learning);
    for(const id of cluster().slice(0,2))observeStudy(p.learning,questionById(id)!,true,false,'2026-11-15');
    const history=structuredClone(p.learning.study!.entries);p.rewardRounds=3;p.day=day;
    expect(startRun(f,'feifei','math','battle',1,false,day)).not.toBe('learn');
    expect(p.run!.questions).toHaveLength(6);expect(p.learning.study!.entries).toEqual(history);expect(p.learning.adaptive!.scope).toEqual({});
    for(let i=0;i<3;i++){const q=questionById(p.run!.questions[i])!;answerRun(f,'feifei','battle',i,(q.answer+1)%q.options.length,day);if(i<2)nextQuestion(f,'feifei','battle',i);}
    expect(p.run!.status).toBe('failed');expect(()=>validateFamily(f)).not.toThrow();
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
