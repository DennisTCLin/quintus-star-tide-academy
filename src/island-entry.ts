import type { Run } from './game-view';
import type { IslandRun } from './island/schema';
import type { Course } from './learning';
import { unfinishedJourney } from './journey-progress';
import { islandFailed } from './island/schema';
export type IslandDestination = Course | 'island';
export function islandEntry(target: IslandDestination, run?: Run | null, math?: IslandRun) {
  // Results must be settled before any quit command can erase the encounter.
  if (run?.reward === 'pending') return 'reward' as const;
  if (unfinishedJourney(run)) return target === run!.course ? 'resume' as const : 'confirm' as const;
  if (math && !math.completed) {
    if (target === 'island') return 'math-resume' as const;
    return math.answers.length >= math.items.length || islandFailed(math) ? 'math-result' as const : 'confirm' as const;
  }
  return target === 'island' ? 'math-open' as const : 'start' as const;
}
