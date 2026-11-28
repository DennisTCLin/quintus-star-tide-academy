import { expect, it } from 'vitest';
import review from '../../docs/content-review/heshun114/source-review.json';
import { challengeEligible, enableAdaptive } from '../adaptive-learning';
import { EXAM_SOURCES } from '../exam-sources';
import { LEARNING_BANK, questionById } from '../learning';
import { allocateQuestions, freshLearning } from '../learning-engine';
import { markMastered } from '../mastered-questions';

it('matches each published option to the printed key and serves it in the compatible practice pool', () => {
  const state = { ...freshLearning(), school: 'dunhua' as const };
  const batch = new Set(review.batch);
  const source = EXAM_SOURCES.g4m20003314;
  expect([source.publisher, source.book, source.phase]).toEqual(['南一', '第7冊', 'final']);

  for (const id of batch) {
    const question = questionById(id)!;
    const item = review.items.find(row => question.examSources?.[0].locator === `一${row.number}` && row.section === '一');
    expect(item?.matchesSourceKey, id).toBe(true);
    expect('①②③④'[question.answer], id).toBe(item?.answer);
  }

  for (const question of LEARNING_BANK) {
    if (question.grade === 4 && question.course === 'math' && !batch.has(question.id)) {
      markMastered(state, question.id);
    }
  }
  const selected = allocateQuestions(state, 4, 'math', 6);
  expect(selected).toHaveLength(6);
  expect(selected.every(question => batch.has(question.id))).toBe(true);
  const other = allocateQuestions({ ...state, school: 'nantun' }, 4, 'math', 6);
  expect(other.every(question => !batch.has(question.id))).toBe(true);

  enableAdaptive(state);
  expect([...batch].every(id => !challengeEligible(state, questionById(id), 4, 'math'))).toBe(true);
});
