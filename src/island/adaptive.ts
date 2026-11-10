import type { LearningState } from '../learning-engine';
import { UNIT_BY_ID } from './catalog';
import type { CloudIsland } from './schema';
import type { Item } from './games';
export type IslandReadiness={scope:Record<string,boolean>;evidence:Record<string,{ids:string[];ready:boolean}>};
export const islandScopeKey=(s:LearningState,unit:string)=>`${s.school??'unconfirmed'}:115-1:${unit}`;
export function reportIslandScope(p:CloudIsland,s:LearningState,unit:string,taught:boolean,grade:number){
 if(!UNIT_BY_ID[unit]||Number(unit[0])!==grade||unit[1]!=='A'||typeof taught!=='boolean')throw Error('請選擇目前年級上學期的單元');
 (p.readiness??={scope:{},evidence:{}}).scope[islandScopeKey(s,unit)]=taught;return true;
}
export function islandConceptReady(p:CloudIsland,s:LearningState,q:Pick<Item,'unit'|'k'>,grade:number){
 return Number(q.unit[0])===grade&&q.unit[1]==='A'&&p.readiness?.scope[islandScopeKey(s,q.unit)]===true&&p.readiness.evidence[q.k]?.ready===true;
}
export function observeIslandReadiness(p:CloudIsland,q:Item,correct:boolean,assisted:boolean){
 const r=p.readiness??={scope:{},evidence:{}};
 const old=r.evidence[q.k]??{ids:[],ready:false};
 if(assisted)return;
 if(!correct){r.evidence[q.k]={ids:[],ready:false};return;}
 const ids=[...new Set([...old.ids,q.id])].slice(-2);
 r.evidence[q.k]={ids,ready:ids.length>=2};
}

export function protectIslandReservation(p:CloudIsland|undefined,s:LearningState,grade:number) {
 const r=p?.run;if(!p||!r||r.completed||r.mode==='learn'||!s.adaptive)return;
 if(r.answers.length===r.items.length||!r.practice&&r.answers.filter((a,i)=>a!==r.items[i].answer).length>=3)return;
 if(r.mode==='play'||r.items.slice(r.answers.length).some(q=>!islandConceptReady(p,s,q,grade)))r.practice=true;
}
