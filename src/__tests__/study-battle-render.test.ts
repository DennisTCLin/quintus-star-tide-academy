import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import StudyReview from '../StudyReview';
import type { StudySession } from '../study-review';
import { TOPIC_BY_ID } from '../adaptive-catalog';
import { questionById } from '../learning';

const question = questionById(TOPIC_BY_ID['2:math:add-1'].questions[0])!;
const base: StudySession = { id: 'render-study', mode: 'learn', phase: 'answer', course: 'math',
  questions: [question.id], index: 0, answers: [], retries: [], settled: false, assisted: false, status: 'active' };

describe('the learning route always includes its companion stage', () => {
  for (const [name, session, loading] of [
    ['selection', null, false], ['probe', base, false],
    ['lesson', { ...base, phase: 'lesson' }, false],
    ['practice', { ...base, assisted: true }, false],
    ['review', { ...base, mode: 'due', phase: undefined }, false],
    ['paused', { ...base, status: 'paused' }, false],
    ['loading', base, true],
    ['complete', { ...base, status: 'complete', settled: true, answers: [true] }, false],
  ] as [string, StudySession | null, boolean][]) {
    it(`keeps both characters in ${name}, without inventing combat stats or replaying an answer`, () => {
      let commands = 0;
      const html = renderToStaticMarkup(createElement(StudyReview, {
        session, question: loading ? undefined : question, grade: 2, busy: false, online: true,
        companion: 'tideglow', reduced: true,
        onCommand: async () => { commands++; }, onStart() {}, onHome() {}, onCourse() {}, onChallenge() {}, onError() {},
      }));
      expect(html.match(/aria-label="夥伴練招戰場"/g)).toHaveLength(1);
      expect(html.match(/data-body-species=/g)).toHaveLength(2);
      expect(html).toContain('data-action="idle"');
      expect(html).not.toContain('role="meter"');
      expect(html).not.toContain('<video');
      expect(commands).toBe(0);
    });
  }
});
