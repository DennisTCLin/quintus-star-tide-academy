import { describe, it, expect } from 'vitest';
import { newFamily, startRun, answerRun, nextQuestion, validateFamily, claimReward, useSkill } from '../adventure';
import { questionById, COURSES } from '../learning';
import { completedHits } from '../companion-growth';
import { allyVitals, quizVitals } from '../quiz-combat';
import { mistakeCount } from '../challenge-rules';
import { PLAYERS } from '../game-view';
const day = '2026-10-25';
function start(practice = false) { const s = newFamily(); startRun(s, 'quintus', 'math', 'strict', 0, practice, day); return s; }
function answer(s: ReturnType<typeof start>, correct: boolean) {
  const r = s.profiles.quintus.run!, q = questionById(r.questions[r.index])!;
  answerRun(s, 'quintus', r.id, r.index, correct ? q.answer : (q.answer + 1) % q.options.length, day, 0);
}
function next(s: ReturnType<typeof start>) { const r = s.profiles.quintus.run!; nextQuestion(s, 'quintus', r.id, r.index); }
describe('six-question challenge contract', () => {
  it('allocates six unique, age-specific questions for every course', () => {
    for (const p of PLAYERS) for (const course of COURSES[p.grade]) {
      const s = newFamily(); if(p.grade===6)s.profiles[p.id].learning.school='jianan'; startRun(s, p.id, course.id, 'all', 0, false, day);
      const r = s.profiles[p.id].run!;
      expect(r.questions).toHaveLength(6); expect(new Set(r.questions).size).toBe(6);
      expect(r.questions.every(id => questionById(id)!.grade === p.grade)).toBe(true);
      expect(validateFamily(s)).toEqual(s);
    }
  });
  it('locks a wrong first answer and keeps cumulative damage across correct answers and reload', () => {
    let s = start();
    for (const correct of [false, true, false, true, false]) {
      const r = s.profiles.quintus.run!;
      answer(s, correct);
      const settled = structuredClone(s);
      expect(() => answer(s, !correct)).toThrow(); expect(s).toEqual(settled);
      s = validateFamily(JSON.parse(JSON.stringify(s)));
      expect(allyVitals(s.profiles.quintus.run!).hp).toBe([100, 67, 34, 0][mistakeCount(s.profiles.quintus.run!)]);
      if (r.status === 'active') next(s);
    }
    const p = s.profiles.quintus, r = p.run!;
    expect(r.status).toBe('failed'); expect(r.answers).toEqual([false, true, false, true, false]);
    expect(completedHits(r)).toBe(2); expect(quizVitals(r).hp).toBeGreaterThan(0);
    expect(r.reward).toBe('none'); expect(r.capture).toBeUndefined(); expect(p.captureQuota).toBeUndefined();
    expect(p.milestones.completedVoyages).toBe(0); expect(p.rewardRounds).toBe(0); expect(p.growth.xp[r.companion]).toBe(20);
    expect(() => next(s)).toThrow(); expect(() => useSkill(s, 'quintus', r.id, r.index)).toThrow();
    expect(() => claimReward(s, 'quintus', r.id, 'save')).toThrow();
  });
  it('evaluates every answer pattern, including a wrong sixth answer and sixth-answer defeat', () => {
    for (let bits = 0; bits < 64; bits++) {
      const s = start(), r = s.profiles.quintus.run!;
      let wrong = 0, right = 0;
      for (let i = 0; i < 6; i++) {
        const correct = !!(bits & (1 << i)); correct ? right++ : wrong++;
        answer(s, correct);
        expect(completedHits(r)).toBe(right);
        expect(r.status).toBe(wrong === 3 ? 'failed' : i === 5 ? 'won' : 'active');
        expect(validateFamily(s)).toEqual(s);
        if (r.status !== 'active') break;
        expect(quizVitals(r).hp).toBeGreaterThan(0);
        next(s);
      }
      expect(r.capture !== undefined).toBe(wrong < 3);
      expect(r.reward === 'saved').toBe(wrong < 3);
    }
  });
  it('persists all six correct answers, 60 XP and 120 points', () => {
    const s = start(), p = s.profiles.quintus, r = p.run!;
    for (let i = 0; i < 6; i++) { answer(s, true); if (i < 5) next(s); }
    expect(r.encounter.earned).toBe(60); expect(r.points).toBe(120);
    expect(p.milestones.bestVoyagePoints).toBe(120); expect(quizVitals(r).hp).toBe(0);
    expect(validateFamily(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it('practice has the same failure rule without XP or rewards', () => {
    const s = start(true), p = s.profiles.quintus;
    for (let i = 0; i < 3; i++) { answer(s, false); if (i < 2) next(s); }
    expect(p.run!.status).toBe('failed'); expect(p.growth.credited).toEqual([]); expect(p.learningRewards).toBeUndefined();
    expect(allyVitals(p.run!).hp).toBe(0); expect(validateFamily(s)).toEqual(s);
  });
  it('rejects missing or contradictory six-question ledgers', () => {
    for (const mutate of [
      (r: any) => delete r.answers,
      (r: any) => { r.answers = [false]; },
      (r: any) => { r.streak = 1; },
      (r: any) => { r.status = 'won'; },
    ]) { const s = start(); mutate(s.profiles.quintus.run); expect(() => validateFamily(s)).toThrow(); }
  });
  it('upgrades unfinished legacy five-question progress once, without erasing earned XP', () => {
    const s = start(); answer(s, true); next(s);
    const r = s.profiles.quintus.run!;
    r.questions.pop(); r.review.pop(); delete r.answers;
    const snapshot = JSON.parse(JSON.stringify(s)), oldQuestions = [...r.questions];
    const upgraded = validateFamily(snapshot), ur = upgraded.profiles.quintus.run!;
    expect(snapshot.profiles.quintus.run.questions).toHaveLength(5);
    expect(ur.questions).toHaveLength(6); expect(ur.questions.slice(0, 5)).toEqual(oldQuestions);
    expect(ur.answers).toEqual([true]); expect(ur.encounter.earned).toBe(10);
    expect(validateFamily(upgraded)).toEqual(upgraded); expect(validateFamily(snapshot)).toEqual(upgraded);
    answer(upgraded, false); expect(allyVitals(upgraded.profiles.quintus.run!).hp).toBe(67);
  });
  it('keeps a completed legacy five-question reward unchanged', () => {
    const s = start(); for (let i = 0; i < 5; i++) { answer(s, true); if (i < 4) next(s); }
    const r = s.profiles.quintus.run!; r.questions.pop(); r.review.pop(); delete r.answers;
    r.status = 'won'; r.reward = 'pending';
    expect(validateFamily(s)).toEqual(s);
  });
});
