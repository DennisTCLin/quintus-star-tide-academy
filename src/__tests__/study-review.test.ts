import { describe, it, expect } from 'vitest';
import { freshLearning, recordLearning, mergeLearning, validateLearning } from '../learning-engine';
import { LEARNING_BANK, questionById } from '../learning';
import { markMastered } from '../mastered-questions';
import { generatedId, GENERATED_POOLS } from '../question-generator';
import { newFamily, startRun, answerRun, nextQuestion, validateFamily } from '../adventure';
import { startStudy, answerStudy, nextStudy, hintStudy, pauseStudy, observeStudy, studySummary, studyDay } from '../study-review';
const day = '2026-10-26';
const mathPool = GENERATED_POOLS.find(p => p.grade === 4 && (p.course ?? 'math') === 'math')!;
const qs = Array.from({length:12}, (_,i)=>questionById(generatedId(mathPool,i))!);
const known = () => { const s = freshLearning(); qs.forEach(q => markMastered(s, q.id)); return s; };
const answer = (s: ReturnType<typeof freshLearning>, correct = true, date = day) => { const r = s.study!.session!, q = questionById(r.questions[r.index])!; return answerStudy(s, 4, r.id, r.index, correct ? q.answer : (q.answer + 1) % q.options.length, date); };
describe('dated review with immutable existing rewards', () => {
  it('keeps old snapshots and mastery intact; no invented dates', () => {
    const s = known(), old = structuredClone(s); validateLearning(s, 4);
    expect(studySummary(s, 4, day).due).toBe(0);
    startStudy(s, 4, day, 'session', 'due');
    expect(Object.keys(s.study!.entries)).toHaveLength(0);
    expect(s.mastered).toEqual(old.mastered);
    expect(s.study!.session!.questions).toHaveLength(6);
    answer(s); const saved = structuredClone(s.study);
    expect(mergeLearning(s, old).study).toEqual(saved);
    expect(validateLearning(JSON.parse(JSON.stringify(s)), 4)).toEqual(s);
  });
  it('uses 1/3/7 days only on separate-day unhinted success and counts first daily answers', () => {
    const s = freshLearning(), q = qs[0], d = studyDay(day);
    observeStudy(s, q, true, false, day);
    expect(s.study!.entries[q.id].due).toBe(d + 1);
    observeStudy(s, q, true, false, day);
    expect(s.study!.entries[q.id].stage).toBe(1); expect(studySummary(s,4,day).independent).toBe(1);
    observeStudy(s, q, true, false, '2026-10-27'); expect(s.study!.entries[q.id].due).toBe(d + 4);
    observeStudy(s, q, true, false, '2026-10-30'); expect(s.study!.entries[q.id].due).toBe(d + 11);
    expect(studySummary(s,4,'2026-10-30').crossDay).toBe(2);
    observeStudy(s, q, false, false, '2026-11-06'); expect(s.study!.entries[q.id].stage).toBe(0);
    observeStudy(s, q, true, false, '2026-11-06'); expect(s.study!.entries[q.id].stage).toBe(0);
    expect(studySummary(s,4,'2026-11-06').accuracy).toBe(75);
  });
  it('marks hinted successes and waits two intervening answered questions for original retry', () => {
    const s = known(); startStudy(s,4,day,'session','all'); const original=s.study!.session!.questions[0];
    hintStudy(s,'session',0); answer(s); expect(s.study!.session!.questions[3]).toBe(original);
    expect(s.study!.session!.retries).toEqual([3]);
    expect(s.study!.entries[original].needsPractice).toBe(true);
    expect(studySummary(s,4,day).independent).toBe(0);
    for(let index=1; index<=3; index++){nextStudy(s,'session',index-1); answer(s);}
    expect(s.study!.entries[original].stage).toBe(0);
    expect(s.study!.entries[original].needsPractice).toBe(false);
    expect(studySummary(s,4,day).independent).toBe(2);
  });
  it('does not force short pools to six or immediately retry a lone wrong item', () => {
    const s=freshLearning(); markMastered(s,qs[0].id);startStudy(s,4,day,'one','all');expect(s.study!.session!.questions).toHaveLength(1);
    answer(s,false); expect(s.study!.session!.status).toBe('complete');
    expect(()=>startStudy(s,4,day,'two','mistakes')).toThrow('間隔兩題');
    startStudy(s,4,'2026-10-27','two','mistakes');expect(s.study!.session!.questions).toHaveLength(1);
  });
  it('rotates known questions, pauses and resumes exactly, never accepts wrong session/index/choice', () => {
    const s=known();startStudy(s,4,day,'one','all');const first=[...s.study!.session!.questions];
    answer(s); pauseStudy(s,'one'); startStudy(s,4,day,'new','all');expect(s.study!.session!.id).toBe('one');expect(s.study!.session!.settled).toBe(true);
    expect(()=>answer(s)).toThrow();expect(()=>nextStudy(s,'bad',0)).toThrow();
    for(let i=1;i<6;i++){nextStudy(s,'one',i-1);answer(s);}
    startStudy(s,4,day,'two','all');expect(s.study!.session!.questions.every(id=>!first.includes(id))).toBe(true);
    expect(()=>answerStudy(s,4,'two',0,-1,day)).toThrow();
  });
  it('filters school, grade and English book; includes mastered generated bits', () => {
    const s=freshLearning();s.school='dunhua';
    LEARNING_BANK.filter(q=>q.grade===4&&q.examSources).forEach(q=>markMastered(s,q.id));
    expect(()=>startStudy(s,4,day,'one','all','english')).toThrow('先完成');
    s.school='nantun';startStudy(s,4,day,'two','all','english');
    expect(s.study!.session!.questions.every(id=>questionById(id)!.publisher==='翰林')).toBe(true);
    s.school='yongchun';expect(()=>startStudy(s,4,day,'three','all')).toThrow('學校版本');
    pauseStudy(s,'two',true);startStudy(s,4,day,'four','all','chinese');expect(s.study!.session!.questions.every(id=>questionById(id)!.publisher==='翰林')).toBe(true);
  });
  it('rechecks retry spacing after another learning path answered the paused current question', () => {
    const s=known();startStudy(s,4,day,'one','all');const r=s.study!.session!,q=questionById(r.questions[0])!;
    pauseStudy(s,'one');observeStudy(s,q,false,false,day);startStudy(s,4,day,'resume','all');
    expect(()=>answer(s)).toThrow('先完成另外兩題');
    observeStudy(s,qs.find(x=>x.id!==q.id)!,true,false,day);observeStudy(s,qs.find(x=>x.id!==q.id)!,true,false,day);expect(answer(s)).toBe(true);
  });
  it('surfaces skills needing help even when every assessment used hints', () => {
    const s=freshLearning(); for(const q of qs.slice(0,3))observeStudy(s,q,true,true,day);
    const summary=studySummary(s,4,day);expect(summary.accuracy).toBeNull();expect(summary.assisted).toBe(3);expect(summary.weak[0].assisted).toBe(3);
  });
  it('reschedules a full group of old mistakes without duplicating retry markers', () => {
    const s=freshLearning();for(const q of qs.slice(0,6))observeStudy(s,q,false,false,'2026-10-25');
    startStudy(s,4,day,'one','mistakes');expect(s.study!.session!.retries).toHaveLength(6);
    for(let i=0;i<6;i++){answer(s,false);validateLearning(s,4);if(i<5)nextStudy(s,'one',i);}
    expect(s.study!.session!.retries).toHaveLength(6);
  });
  it('rejects malformed schedules and sessions', () => {
    const s=known(); startStudy(s,4,day,'one','all');answer(s);
    for(const mutate of [(x:any)=>x.study.entries[qs[0].id]={},(x:any)=>x.study.session.questions=['unknown'],(x:any)=>x.study.session.answers.push(true),(x:any)=>x.study.sequence=-1]){const x=structuredClone(s);mutate(x);expect(()=>validateLearning(x,4)).toThrow();}
    expect(()=>studyDay('2026-02-31')).toThrow();
  });
  it('normal challenge observations and review preserve every pre-existing profile field and pending reward', () => {
    const f=newFamily();const p=f.profiles.quintus;
    startRun(f,'quintus','math','challenge',1,false,day);
    const run=p.run!;for(let i=0;i<6;i++){answerRun(f,'quintus',run.id,i,questionById(run.questions[i])!.answer,day);if(i<5)nextQuestion(f,'quintus',run.id,i);}
    expect(Object.keys(p.learning.study!.entries)).toHaveLength(6);
    const before=structuredClone(p); startStudy(p.learning,4,day,'review','all');
    for(let i=0;i<6;i++){answer(p.learning);if(i<5)nextStudy(p.learning,'review',i);}
    const {learning: _a,...after}=p, {learning:_b,...old}=before;
    expect(after).toEqual(old); expect(p.learning.mastered).toEqual(before.learning.mastered);validateFamily(f);
  });
  it('records same-day legacy review even when old skill leveling short-circuits', () => {
    const s=freshLearning();recordLearning(s,qs[0],true,false,true,day);recordLearning(s,qs[1],true,false,true,day);
    expect(Object.keys(s.study!.entries)).toHaveLength(2);
    const pool=GENERATED_POOLS.find(p=>p.grade===4)!; const id=generatedId(pool,0);markMastered(s,id);
    startStudy(s,4,day,'bits','all');expect(s.study!.session!.questions).toContain(id);
  });
});
