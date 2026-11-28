import { expect, it } from 'vitest';
import { newFamily, validateFamily } from '../adventure';
import { challengeEligible, reportSchoolExposure } from '../adaptive-learning';
import { topicForQuestion } from '../adaptive-catalog';
import { pilotQuestions } from '../adaptive-pilot';
import { questionById } from '../learning';
import { freshLearning } from '../learning-engine';
import { answerStudy, learningLesson, nextStudy, pauseStudy, publicLearningLesson, startStudy, studyDay, studySummary, updateLearningProgress } from '../study-review';
import { NANYI_FOUR_TOPICS } from '../nanyi-four-pilot';

const today = '2026-11-29', tomorrow = '2026-11-30';
const topic = '4:math:nanyi-fraction-kind';
const exam = questionById('g4m-tcool-20003314-i1')!;
const current = (state: ReturnType<typeof freshLearning>) => state.study!.session!;

it('teaches with a distinct example before independent practice, then admits the exact exam and schedules tomorrow', () => {
  const profile = newFamily().profiles.quintus;
  const state = profile.learning;
  state.school = 'dunhua';
  reportSchoolExposure(state, 4, topic, 'taught', today);
  startStudy(state, 4, today, 'nanyi-pilot', 'learn', 'math');
  const round = current(state);
  expect(round.topic).toBe(topic);
  expect(round.phase).toBe('lesson');
  const sample = publicLearningLesson(state)?.example;
  expect(sample?.id).toBe('ny4-fraction-kind-0');
  expect(round.questions).not.toContain(sample?.id);
  expect(round.questions).not.toContain(exam.id);
  expect(challengeEligible(state, exam, 4, 'math')).toBe(false);

  learningLesson(state, round.id, 0, today, true);
  expect(round.assisted).toBe(false);
  const practiced = [];
  for (let index = 0; index < 2; index++) {
    const q = questionById(round.questions[index])!;
    expect(topicForQuestion(q)?.id).toBe(topic);
    expect(q.id).not.toBe(exam.id);
    practiced.push(q.id);
    answerStudy(state, 4, round.id, index, q.answer, today);
    expect(state.adaptive!.evidence[q.id]).toMatchObject({correct:true, assisted:false});
    nextStudy(state, round.id, index, today);
  }
  expect(new Set(practiced).size).toBe(2);
  expect(round.questions[round.index]).toBe(exam.id);
  expect(publicLearningLesson(state)?.stage).toBe('exam');
  expect(challengeEligible(state, exam, 4, 'math')).toBe(false);
  answerStudy(state, 4, round.id, 2, exam.answer, today);
  expect(challengeEligible(state, exam, 4, 'math')).toBe(true);
  expect(state.study!.entries[exam.id].due).toBe(studyDay(tomorrow));
  expect(studySummary(state, 4, tomorrow).due).toBe(3);
});

it('keeps school progress, publisher, and coached attempts separate', () => {
  const state = freshLearning();
  state.school = 'dunhua';
  startStudy(state, 4, today, 'unknown-progress', 'learn', 'math');
  const round=current(state);
  learningLesson(state, round.id, 0, today, true);
  const first = questionById(round.questions[0])!;
  answerStudy(state, 4, round.id, 0, (first.answer + 1) % first.options.length, today);
  nextStudy(state, round.id, 0, today);
  expect(round.phase).toBe('lesson');
  expect(publicLearningLesson(state)?.example?.id).not.toBe(round.questions[1]);
  learningLesson(state, round.id, 1, today, true);
  learningLesson(state, round.id, 1, today, false);
  learningLesson(state, round.id, 1, today, true);
  answerStudy(state, 4, round.id, 1, questionById(round.questions[1])!.answer, today);
  expect(state.adaptive!.evidence[round.questions[1]].assisted).toBe(true);
  expect(pilotQuestions(state, 4, 'math', today, 6)).not.toContain(exam.id);

  reportSchoolExposure(state, 4, topic, 'not-yet', today);
  expect(pilotQuestions(state, 4, 'math', today, 6).every(id=>topicForQuestion(id)?.id!==topic)).toBe(true);
  state.school='nantun';
  expect(pilotQuestions(state, 4, 'math', today, 6).some(id=>id.startsWith('ny4-'))).toBe(false);
  expect(()=>reportSchoolExposure(state,4,topic,'taught',today)).toThrow();
});

it('round-trips the active example and preserves rewards, prior records and every topic’s separate roles', () => {
  const family=newFamily(), p=family.profiles.quintus, s=p.learning;
  s.school='dunhua';
  p.coins=75; p.tickets=2; p.starTickets=3;
  startStudy(s,4,today,'resume-example','learn','math');
  const before=structuredClone(family);
  expect(validateFamily(JSON.parse(JSON.stringify(family)))).toEqual(before);
  pauseStudy(s,'resume-example');
  startStudy(s,4,today,'new-start-id','learn','math');
  expect(family).toEqual(before);
  for (const t of NANYI_FOUR_TOPICS) {
    expect(t.practice).toHaveLength(4);
    expect(new Set([t.example,t.exam,...t.practice]).size).toBe(6);
    expect(questionById(t.exam)?.examSources?.[0].id).toBe('g4m20003314');
  }
});

it('starts with the school’s taught decimal concept and keeps next-day retrieval eligible', () => {
  const state=freshLearning();
  state.school='dunhua';
  const decimal='4:math:nanyi-decimal-hundredths';
  reportSchoolExposure(state,4,decimal,'taught',today);
  startStudy(state,4,today,'decimal-pilot','learn','math');
  const round=current(state);
  expect(round.topic).toBe(decimal);
  expect(publicLearningLesson(state)?.example?.id).toBe('ny4-decimal-hundredths-0');
  learningLesson(state,round.id,0,today,true);
  for(let index=0;index<2;index++){
    const q=questionById(round.questions[index])!;
    expect(q.id.startsWith('ny4-decimal-hundredths-')).toBe(true);
    answerStudy(state,4,round.id,index,q.answer,today);
    nextStudy(state,round.id,index,today);
  }
  const check=questionById(round.questions[round.index])!;
  expect(check.id).toBe('g4m-tcool-20003314-i13');
  expect(check.options[check.answer].text).toBe('7 個 0.01');
  answerStudy(state,4,round.id,2,check.answer,today);
  pauseStudy(state,round.id,true,today);
  startStudy(state,4,tomorrow,'decimal-review','due','math');
  const review=current(state);
  expect(review.questions).toContain(check.id);
  const previous=questionById(review.questions[0])!;
  answerStudy(state,4,review.id,0,previous.answer,tomorrow);
  expect(studySummary(state,4,tomorrow).crossDay).toBe(1);
  nextStudy(state,review.id,0,tomorrow);
  pauseStudy(state,review.id);
  updateLearningProgress(state,4,decimal,'not-yet',tomorrow);
  expect(review.questions).toEqual([previous.id]);
  expect(review.answers).toEqual([true]);
  expect(review).toMatchObject({status:'complete',index:0,settled:true});
  expect(state.study!.entries[check.id].correct).toBe(1);
});

it('removes a reserved review exam when a new miss invalidates its practice evidence', () => {
  const state=freshLearning();
  state.school='dunhua';
  reportSchoolExposure(state,4,topic,'taught',today);
  startStudy(state,4,today,'learn-before-review','learn','math');
  const learn=current(state);
  learningLesson(state,learn.id,0,today,true);
  for(let index=0;index<3;index++){
    const q=questionById(learn.questions[index])!;
    answerStudy(state,4,learn.id,index,q.answer,today);
    if(index<2)nextStudy(state,learn.id,index,today);
  }
  pauseStudy(state,learn.id,true,today);
  startStudy(state,4,tomorrow,'miss-during-review','due','math');
  const review=current(state);
  expect(review.questions).toContain(exam.id);
  const first=questionById(review.questions[0])!;
  answerStudy(state,4,review.id,0,(first.answer+1)%first.options.length,tomorrow);
  expect(review.questions).not.toContain(exam.id);
  expect(review.answers).toEqual([false]);
  nextStudy(state,review.id,0,tomorrow);
  const second=questionById(review.questions[1])!;
  answerStudy(state,4,review.id,1,second.answer,tomorrow);
  expect(review.status).toBe('complete');
});
