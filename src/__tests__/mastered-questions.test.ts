import {startAfterDecliningCapture} from './helpers/capture';
import { describe, expect, it } from 'vitest';
import { allocateAdventureQuestions, allocateQuestions, freshLearning, recordLearning, validateLearning } from '../learning-engine';
import { GENERATED_POOLS, generatedId } from '../question-generator';
import { ENGLISH_REPHRASES, LEARNING_BANK, questionById } from '../learning';
import { hasMastered, markMastered, validateMastered } from '../mastered-questions';
import { answerRun, claimReward, correctRun, newFamily, nextQuestion, readyQuestion, startRun, validateFamily, allocateBattleQuestion, recordBattleAnswer } from '../adventure';
import { restoreFamily } from '../family-store';

const day = '2026-10-25';
const english = [...LEARNING_BANK.filter(q => q.grade === 4 && q.course === 'english' && !q.examSources && !q.rephraseOf).map(q => q.id),
  ...GENERATED_POOLS.filter(p => p.grade === 4 && p.course === 'english').flatMap(p => p.params.map((_, i) => generatedId(p, i)))];

describe('permanent correct-answer exclusion', () => {
  it('never repeats a correct fourth-grade English question across all 276 questions, tiers, days and saves', () => {
    for (const difficulty of [1, 2, 3] as const) {
      let state = freshLearning(); const answered = new Set<string>();
      for (let round = 0; round < 46; round++) {
        const batch = allocateQuestions(state, 4, 'english', 6, difficulty);
        for (const { id, review } of batch) {
          expect(answered.has(id), `${difficulty}/${round}/${id}`).toBe(false);
          answered.add(id);
          recordLearning(state, questionById(id)!, true, round % 2 === 0, review, round % 2 ? day : '2026-10-26');
        }
        state = validateLearning(JSON.parse(JSON.stringify(state)), 4);
      }
      expect(answered.size).toBe(276);
      const before = structuredClone(state);
      expect(() => allocateQuestions(state, 4, 'english', 6, difficulty)).toThrow('已全部答對');
      expect(state).toEqual(before);
      expect(allocateQuestions(freshLearning(), 4, 'english', 6, difficulty)).toHaveLength(6);
    }
  });

  it('reproduces the real tier-one sixth-run regression and preserves successes beyond daily rewards', () => {
    let family = newFamily(); const answered = new Set<string>();
    for (let round = 0; round < 10; round++) {
      startAfterDecliningCapture(family, 'quintus', 'english', `english-${round}`, round, false, day, 'relaxed');
      const run = family.profiles.quintus.run!;
      for (let i = 0; i < 6; i++) {
        const q = questionById(run.questions[i])!;
        expect(answered.has(q.id)).toBe(false); answered.add(q.id);
        readyQuestion(family, 'quintus', run.id, i, 1000);
        answerRun(family, 'quintus', run.id, i, q.answer, day, .99, 2000);
        if (i < 5) nextQuestion(family, 'quintus', run.id, i);
      }
      if (run.reward === 'pending') claimReward(family, 'quintus', run.id, 'save');
      family = validateFamily(JSON.parse(JSON.stringify(family)));
    }
    expect(answered.size).toBe(60);
  });

  it('does not refill a short batch with mastered questions or consume its remaining cursors', () => {
    for (let remaining = 1; remaining < 6; remaining++) {
      const state = freshLearning();
      english.slice(remaining).forEach(id => markMastered(state, id));
      const before = structuredClone(state);
      expect(() => allocateQuestions(state, 4, 'english', 6, 1)).toThrow(`還有 ${remaining} 題`);
      expect(state).toEqual(before);
      for (let i = 0; i < remaining; i++) {
        const q = allocateQuestions(state, 4, 'english', 1, 1)[0];
        expect(english.slice(0, remaining)).toContain(q.id);
        markMastered(state, q.id);
      }
      expect(() => allocateQuestions(state, 4, 'english', 1)).toThrow('已全部答對');
    }
  });

  it('retains wrong/unanswered questions and records assisted/same-day reviewed successes before adaptation throttling', () => {
    const state = freshLearning();
    state.seen = LEARNING_BANK.filter(q => q.grade === 4 && q.course === 'english' && !q.examSources).map(q => q.id);
    for (const p of GENERATED_POOLS.filter(p => p.course === 'english')) state.cursors[p.key] = p.params.length;
    const batch = allocateQuestions(state, 4, 'english', 6, 1);
    expect(batch.every(q => q.review)).toBe(true);
    for (const q of batch.slice(0, 5)) recordLearning(state, questionById(q.id)!, true, true, true, day);
    recordLearning(state, questionById(batch[5].id)!, false, false, true, day);
    expect(batch.slice(0, 5).every(q => hasMastered(state, q.id))).toBe(true);
    expect(hasMastered(state, batch[5].id)).toBe(false);
    expect(allocateQuestions(state, 4, 'english', 6, 1).every(q => !batch.slice(0, 5).some(x => x.id === q.id))).toBe(true);
  });

  it('backfills only proven successes, replaces pending legacy repeats and never interprets reserved XP as success', () => {
    const family = newFamily(); startAfterDecliningCapture(family, 'quintus', 'english', 'legacy', 1, false, day);
    const p = family.profiles.quintus, old = p.run!.questions[0], unanswered = p.run!.questions[1];
    delete p.learning.mastered;
    p.credited = [old]; p.milestones.awardedByDay[day] = [old];
    p.growth.credited = [...p.run!.questions];
    const migrated = validateFamily(family), next = migrated.profiles.quintus;
    expect(hasMastered(next.learning, old)).toBe(true);
    expect(hasMastered(next.learning, unanswered)).toBe(false);
    expect(next.run!.questions).not.toContain(old);
    expect(next.run!.questions).toContain(unanswered);
    expect(next.coins).toBe(p.coins);
    expect(validateFamily(migrated)).toEqual(migrated);
  });

  it('includes remediation and battle assists, remains isolated by learner, and survives stale backup restore', () => {
    const family = newFamily(); startAfterDecliningCapture(family, 'quintus', 'english', 'wrong', 1, false, day);
    const run = family.profiles.quintus.run!, stale = structuredClone(family);
    for (let i = 0; i < 3; i++) {
      const q = questionById(run.questions[i])!;
      answerRun(family, 'quintus', run.id, i, (q.answer + 1) % q.options.length, day);
      if (i < 2) nextQuestion(family, 'quintus', run.id, i);
    }
    const corrected = run.questions[0];
    correctRun(family, 'quintus', run.id, 0, questionById(corrected)!.answer, day);
    expect(hasMastered(family.profiles.quintus.learning, corrected)).toBe(true);
    const assist = allocateBattleQuestion(family, 'quintus', 'english', 'assist');
    recordBattleAnswer(family, 'quintus', assist.token, assist.id, true, day);
    restoreFamily(family, stale);
    expect(hasMastered(family.profiles.quintus.learning, corrected)).toBe(true);
    expect(hasMastered(family.profiles.quintus.learning, assist.id)).toBe(true);
    expect(family.profiles.quintus.run!.questions).not.toContain(corrected);
    expect(family.profiles.feifei.learning.mastered?.ids).toEqual([]);
  });

  it('keeps generated completion storage bounded and rejects corrupt/cross-grade histories', () => {
    const state = freshLearning();
    for (const pool of GENERATED_POOLS.filter(p => p.grade === 4))
      for (let i = 0; i < pool.params.length; i++) markMastered(state, generatedId(pool, i));
    expect(JSON.stringify(state.mastered).length).toBeLessThan(5000);
    validateMastered(state.mastered, 4);
    expect(() => validateMastered(state.mastered, 1)).toThrow();
    for (const value of [{ ids: [english[0], english[0]], generated: {} }, { ids: [], generated: { 'g4-englishread-1': 'zz' } },
      { ids: [], generated: { 'g4-englishread-1': 'f'.repeat(100) } }]) expect(() => validateMastered(value, 4)).toThrow();
  });
});

it('offers finite paraphrases only after the source was correct, preserves meanings and excludes completed variants',()=>{
  expect(ENGLISH_REPHRASES).toHaveLength(266);
  for(const variant of ENGLISH_REPHRASES){const source=questionById(variant.rephraseOf!)!;
    expect(variant.prompt).not.toBe(source.prompt);
    expect(variant.options[variant.answer]).toEqual(source.options[source.answer]);
    expect([...variant.options].sort((a,b)=>a.text.localeCompare(b.text))).toEqual([...source.options].sort((a,b)=>a.text.localeCompare(b.text)));
    expect(variant.grade).toBe(source.grade);expect(variant.explanation).toBe(source.explanation);
  }
  const state=freshLearning(),source=questionById('c1-g4-english-01')!;
  expect(allocateAdventureQuestions(state,4,'english',6,1,[],()=>0).every(q=>!q.id.startsWith('r1-'))).toBe(true);
  markMastered(state,source.id);
  const batch=allocateAdventureQuestions(state,4,'english',6,1,[],()=>0),variant=batch.find(q=>q.id.startsWith('r1-'))!;
  expect(questionById(variant.id)!.rephraseOf).toBe(source.id);expect(batch.some(q=>q.id===source.id)).toBe(false);
  markMastered(state,variant.id);
  expect(allocateAdventureQuestions(state,4,'english',6,1,[],()=>0).every(q=>q.id!==variant.id)).toBe(true);
  english.forEach(id=>markMastered(state,id));
  expect(allocateAdventureQuestions(state,4,'english',6,1,[],()=>0.9).every(q=>q.id.startsWith('r1-'))).toBe(true);
  ENGLISH_REPHRASES.forEach(q=>markMastered(state,q.id));
  expect(()=>allocateAdventureQuestions(state,4,'english',6)).toThrow('已全部答對');
});
it('backfills legacy milestone-only imports even when factories initialize a new learning state',()=>{
  const source=newFamily();source.profiles.quintus.milestones.awardedByDay[day]=[english[0]];
  const imported=newFamily(JSON.stringify(source.profiles.quintus.milestones));
  expect(hasMastered(imported.profiles.quintus.learning,english[0])).toBe(true);
});
