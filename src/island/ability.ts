import { UNIT_BY_ID } from './catalog';
import type { PlayerIsland } from './engine';

/** Every concept gets equal weight; unseen concepts cannot look mastered after one easy answer. */
export function unitAbility(player:PlayerIsland,unit:string) {
  const games=UNIT_BY_ID[unit]?.games??[];
  const concepts=games.map(key=>{
    const stats=player.stats[key]??{a:0,w:0},recent=player.recent?.[key]??[];
    const right=recent.filter(Boolean).length,oldAttempts=Math.max(0,stats.a-recent.length);
    const oldRight=Math.max(0,stats.a-stats.w-right);
    // Until three new observations exist, use the old accuracy only for missing evidence.
    const carry=oldAttempts?oldRight/oldAttempts*Math.min(oldAttempts,3-recent.length):0;
    return {key,attempts:stats.a,score:Math.max(0,Math.min(100,Math.round((right+carry)/3*100)))};
  });
  const attempts=concepts.reduce((n,c)=>n+c.attempts,0);
  return {score:concepts.length?Math.round(concepts.reduce((n,c)=>n+c.score,0)/concepts.length):0,
    attempts,practiced:concepts.filter(c=>c.attempts>0).length,total:concepts.length,concepts};
}
