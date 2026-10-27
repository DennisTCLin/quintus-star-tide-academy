import { UNIT_BY_ID } from './catalog';
import type { Mode } from './games';
import type { IslandRun } from './schema';
import { islandFailed } from './schema';
import { gradeName, type MathGrade } from './curriculum';

export type IslandDestination = { mode: Mode; unit?: string; grade?:number };
type ActiveIsland = Pick<IslandRun,'id'|'mode'|'unit'|'completed'|'grade'>;
export const semesterName = (unit?: string) => unit?.[1]==='B' ? '下學期' : '上學期';
export const islandStageName = (mode: Mode) => ({learn:'學一學',play:'玩一玩',boss:'挑戰神獸',mock:'島主大挑戰'})[mode];
export function islandLocation(unit?: string) {
  const u = unit ? UNIT_BY_ID[unit] : undefined;
  return u ? `${Number(u.id[0])>1?gradeName(Number(u.id[0]) as MathGrade)+'・':''}${semesterName(unit)}・第 ${u.n} 單元・${u.title}` : '全學年・島主大挑戰';
}
export function mustSwitchIsland(active: ActiveIsland | undefined, target: IslandDestination) {
  return !!active && !active.completed && (active.mode !== target.mode || active.unit !== target.unit || (target.mode==='mock'&&(active.grade??1)!==(target.grade??1)));
}
/** Call only after the child confirms. Never start a new round before quit is acknowledged. */
export async function openIslandDestination(
  active: IslandRun | undefined,
  target: IslandDestination,
  actions: {quit: (id: string) => Promise<boolean | undefined>; finish: (id: string) => Promise<IslandRun | undefined>; start: (mode: Mode, unit?: string, grade?:number) => Promise<IslandRun | undefined>},
) {
  if (mustSwitchIsland(active,target)) {
    // The final answer may be saved before the child opens the result. Settle it first.
    if(active!.answers.length===active!.items.length || islandFailed(active!)) {
      if(!(await actions.finish(active!.id))?.completed) return undefined;
    } else if(await actions.quit(active!.id) !== true) return undefined;
  }
  return target.grade===undefined?actions.start(target.mode,target.unit):actions.start(target.mode,target.unit,target.grade);
}

/** Demonstrations do not count as submitted questions; remedial demos refer to the preceding question. */
export function islandQuestionPosition(size: number, preceding: number, answered: number, teaching: boolean, remedial = false) {
  const number = Math.max(1,Math.min(size,preceding+(teaching && remedial ? 0 : 1)));
  const completed = Math.min(size,Math.max(0,answered));
  return {number,completed,total:size,label:`${teaching?`${remedial?'再看一次':'看示範'}・`:''}第 ${number} 題 / 共 ${size} 題`};
}
