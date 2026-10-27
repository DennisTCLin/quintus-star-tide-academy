import type { Run } from './game-view';
import type { IslandRun } from './island/schema';
import { islandFailed } from './island/schema';

export type Journey = Pick<Run, 'course' | 'status' | 'reward' | 'index' | 'questions' | 'settled' | 'answers' | 'remediation'>;
export type ChallengeProgress = { done: number; total: number; label: string };
export function unfinishedJourney(run?: Journey | null) {
  return run?.status === 'active' || run?.reward === 'pending' || (run?.status === 'failed' && run.remediation?.receipt === null) ? run : null;
}
export function journeyProgress(run: Journey): ChallengeProgress {
  const total = run.questions.length;
  return { done: Math.min(total, Math.max(0, (run.answers?.length ?? run.index + Number(run.settled)))), total,
    label: run.reward === 'pending' ? '待領獎勵' : run.status === 'won' ? '挑戰成功' : run.status === 'failed' ? (run.remediation?.receipt === null ? '錯題待補練' : '本趟已結束') : '挑戰中' };
}
export function mathJourneyProgress(run: IslandRun): ChallengeProgress {
  return { done: Math.min(run.items.length, run.answers.length), total: run.items.length,
    label: run.completed ? (islandFailed(run) ? '本趟已結束' : '本關已完成') : islandFailed(run) || run.answers.length === run.items.length ? '查看結果' : '挑戰中' };
}
