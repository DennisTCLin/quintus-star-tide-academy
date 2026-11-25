import { describe, expect, it } from 'vitest';
import type { StudySession } from '../study-review';
import { studyBattleAction, studyBattleSnapshot } from '../study-battle-presentation';

const session = (overrides: Partial<StudySession> = {}): StudySession => ({
  id: 'study-1', mode: 'learn', phase: 'answer', questions: ['q1', '', ''], index: 0,
  answers: [], retries: [], settled: false, assisted: false, status: 'active', ...overrides,
});
const action = (before: StudySession | null, after: StudySession | null) => studyBattleAction(studyBattleSnapshot(before), studyBattleSnapshot(after));

describe('study battle acknowledgement boundary', () => {
  it('plays an attack or harmless guard only after a new server answer', () => {
    for (const mode of ['learn', 'due', 'mistakes', 'all'] as const) {
      const before = session({ mode });
      expect(action(before, session({ mode, settled: true, answers: [true] }))).toBe('attack');
      expect(action(before, session({ mode, settled: true, answers: [false] }))).toBe('guard');
      expect(action(before, structuredClone(before))).toBeNull();
    }
  });
  it('does not replay on initial mount, reload or duplicate synchronization', () => {
    const answered = session({ settled: true, answers: [true] });
    expect(action(null, answered)).toBeNull();
    expect(action(answered, structuredClone(answered))).toBeNull();
    expect(action(answered, null)).toBeNull();
  });
  it('does not turn hints, lessons or navigation into attacks', () => {
    expect(action(session(), session({ assisted: true }))).toBeNull();
    expect(action(session(), session({ phase: 'lesson' }))).toBeNull();
    expect(action(session({ phase: 'lesson' }), session({ assisted: true }))).toBeNull();
    expect(action(session(), session({ status: 'paused' }))).toBeNull();
    expect(action(session({ status: 'paused' }), session({ settled: true, answers: [true] }))).toBeNull();
  });
  it('rejects a different session, question, missing answer or cross-device jump', () => {
    expect(action(session(), session({ id: 'study-2', settled: true, answers: [true] }))).toBeNull();
    expect(action(session(), session({ index: 1, settled: true, answers: [true, true] }))).toBeNull();
    expect(action(session(), session({ settled: true }))).toBeNull();
    expect(action(session(), session({ settled: true, answers: [true, true] }))).toBeNull();
  });
  it('keeps the final answered action even when the pilot shortens to three probes', () => {
    const before = session({ index: 2, answers: [true, true], questions: ['', '', 'q3', '', '', ''] });
    const after = session({ index: 2, answers: [true, true, true], settled: true, status: 'complete', questions: ['', '', 'q3'] });
    expect(action(before, after)).toBe('attack');
  });
  it('copies scalar state without mutating or retaining a live server reference', () => {
    const value = session();
    const before = studyBattleSnapshot(value);
    value.answers.push(true); value.settled = true;
    expect(studyBattleAction(before, studyBattleSnapshot(value))).toBe('attack');
    const frozen = Object.freeze(session({ answers: Object.freeze([true]) as unknown as boolean[], settled: true }));
    expect(() => studyBattleSnapshot(frozen)).not.toThrow();
  });
});
