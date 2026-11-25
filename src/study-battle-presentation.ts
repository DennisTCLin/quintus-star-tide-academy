import type { StudySession } from './study-review';

/** A copied, public-state snapshot: presentation never mutates a study session. */
export function studyBattleSnapshot(session?: StudySession | null) {
  return session ? {
    id: session.id, index: session.index, settled: session.settled,
    status: session.status, phase: session.phase, count: session.answers.length,
    answer: session.answers[session.index],
  } : null;
}
export type StudyBattleSnapshot = ReturnType<typeof studyBattleSnapshot>;

/** Only a newly acknowledged answer can start an action. Mounts, reloads,
 * duplicate responses, lessons and cross-device jumps never replay a hit. */
export function studyBattleAction(before: StudyBattleSnapshot, after: StudyBattleSnapshot): 'attack' | 'guard' | null {
  if (!before || !after || before.id !== after.id || before.index !== after.index
    || before.status !== 'active' || before.phase === 'lesson' || before.settled || !after.settled
    || after.count !== before.count + 1 || typeof after.answer !== 'boolean') return null;
  return after.answer ? 'attack' : 'guard';
}
