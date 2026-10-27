import type { PlayerIsland } from './engine';
import { unitAbility } from './ability';
import { GAMES } from './games';
import { Zy } from './zhuyin';

export function IslandAbility({progress,unit,compact=false,details=false}: {progress:PlayerIsland;unit:string;compact?:boolean;details?:boolean}) {
  const ability=unitAbility(progress,unit);
  if(compact) return <span className="isl-ability compact" role="group" aria-label="本單元熟練度">
    <span className="isl-ability-heading"><b><Zy text="熟練度"/></b><strong>{ability.attempts?`${ability.score}%`:<Zy text="待練習"/>}</strong></span>
    <progress max={100} value={ability.score} aria-label={`本單元熟練度 ${ability.score}%`}/>
  </span>;
  return <section className="isl-ability" aria-label="本單元熟練度">
    <div className="isl-ability-heading"><b><Zy text="熟練度"/></b><strong>{ability.attempts?`${ability.score}%`:<Zy text="還沒練習"/>}</strong></div>
    <progress max={100} value={ability.score} aria-label={`本單元熟練度 ${ability.score}%`}/>
    <p><Zy text={ability.attempts?`已練 ${ability.practiced} / ${ability.total} 個小本領，繼續練就會更熟。`:'先玩幾題，看看哪些小本領學會了。'}/></p>
    {details&&<details><summary><Zy text="看看小本領"/></summary><div className="isl-ability-concepts">
      {ability.concepts.map(c=><div key={c.key}><span><Zy text={GAMES[c.key].name}/></span><b>{c.attempts?`${c.score}%`:'—'}</b><progress max={100} value={c.score} aria-label={`${GAMES[c.key].name}熟練度 ${c.score}%`}/></div>)}
      <p><Zy text="每種玩法看最近三次的第一次作答，連續答對三次就填滿。還沒練過的玩法不算學會；舊紀錄先按答對率估計。這個百分比是練習參考。"/></p>
    </div></details>}
  </section>;
}
