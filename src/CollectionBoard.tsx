import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { request } from './cloud';
import { petById, collectionWeekStart, type PlayerId, type RankingPeriod } from './game-view';
import PlayerAvatar from './PlayerAvatar';
import SocialDialog from './SocialDialog';
import './collection-board.css';
export type CollectionPerson = {key:string;id:PlayerId;name:string;avatarKey:string;isSelf:boolean;available:boolean;total?:number;unique?:number;duplicates?:number;scores?:Record<RankingPeriod,number>;cards?:{id:string;count:number;level:number}[]};
type Response={day:string;players?:CollectionPerson[];player?:CollectionPerson};
function useCollections(player:PlayerId,target:string|null,revision=0){
 const [data,setData]=useState<Response|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let cancelled=false;setData(null);setError('');
   request<Response>(`collections?player=${encodeURIComponent(player)}${target===null?'':`&target=${encodeURIComponent(target)}`}`).then(value=>{if(!cancelled)setData(value);}).catch(e=>{if(!cancelled)setError(e.message||'暫時無法讀取收藏');});
   return()=>{cancelled=true;};
 },[player,target,revision,retry]);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')setRetry(n=>n+1);};document.addEventListener('visibilitychange',refresh);return()=>document.removeEventListener('visibilitychange',refresh);},[]);
 return {data,error,retry:()=>setRetry(n=>n+1)};
}
function LoadState({data,error,retry}:{data:Response|null;error:string;retry:()=>void}){
 return error?<div role="alert"><p>{error}</p><button onClick={retry}>重新讀取</button></div>:!data?<p role="status">正在讀取雲端收藏…</p>:null;
}
export function CollectionViewer({player,target,onClose}:{player:PlayerId;target:string;onClose:()=>void}){
 const state=useCollections(player,target),person=state.data?.player,[limit,setLimit]=useState(24);
 useLayoutEffect(()=>{
   const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
   const fallback=document.querySelector<HTMLButtonElement>('.friends-toggle');
   return()=>{requestAnimationFrame(()=>{
     if(document.querySelector('dialog[open]'))return;
     const target=opener?.isConnected&&opener!==document.body?opener:fallback;
     if(target?.isConnected)target.focus({preventScroll:true});
   });};
 },[]);
 return <SocialDialog wide scrollBody title={person?`${person.name}的收藏`:'好友收藏'} onClose={onClose}>
   <LoadState {...state}/>
   {person&&<><div className="friend-collection-identity"><PlayerAvatar id={person.id} avatarKey={person.avatarKey}/><div><h3>{person.name}{person.isSelf?' · 我':''}</h3><p>{person.available?`${person.unique} 種夥伴 · ${person.total} 張卡`:'收藏暫時無法讀取'}</p></div></div>
    <p>這裡可以欣賞收藏；不會更換陪練夥伴或使用卡片。</p>
    {person.available&&!person.cards?.length&&<p>還沒有收集到夥伴，第一場冒險正在等著他！</p>}
    <ul className="friend-collection-cards">{person.cards?.slice(0,limit).map(card=>{const pet=petById(card.id);return pet?<li key={card.id}><img src={pet.image} alt="" loading="lazy" decoding="async"/><strong>{pet.name}</strong><span className={`rarity-label rarity-${pet.rarity}`}>{pet.rarity} 級 · Lv.{card.level}</span><span>{card.count} 張</span></li>:null;})}</ul>
    {(person.cards?.length??0)>limit&&<button onClick={()=>setLimit(n=>n+24)}>查看更多夥伴</button>}
   </>}
 </SocialDialog>;
}
export default function CollectionBoard({player,revision,onCollection,onMine,heading}:{heading:RefObject<HTMLHeadingElement>;player:PlayerId;revision:number;onCollection:(key:string)=>void;onMine:()=>void}){
 const state=useCollections(player,null,revision),[period,setPeriod]=useState<RankingPeriod>('all');
 const rows=[...(state.data?.players??[])].sort((a,b)=>(b.scores?.[period]??-1)-(a.scores?.[period]??-1)||a.key.localeCompare(b.key));
 let previous:number|undefined,rank:number|null=null;
 return <section className="collection-board cloud-collection-board" data-learning-content="true">
   <div className="page-title"><div><span className="eyebrow">一起收集，一起長大</span><h1 ref={heading} tabIndex={-1}>🏆 收藏排行榜</h1><p>你和好友的雲端收藏，離線的好友也會列在這裡。</p></div><button onClick={state.retry}>更新收藏</button></div>
   <div className="ranking-tabs" aria-label="排行榜期間">{([['day','日榜'],['week','週榜'],['all','累積榜']] as const).map(([value,label])=><button key={value} aria-pressed={period===value} onClick={()=>setPeriod(value)}>{label}</button>)}</div>
   <p className="ranking-caption">{period==='all'?'目前擁有的不同卡種 · 包含初始夥伴':state.data?`${period==='week'?collectionWeekStart(state.data.day)+' ～ ':''}${state.data.day} · 新取得的不同卡種`:''}</p>
   <LoadState {...state}/>
   <ol className="ranking-list" aria-label="收藏名次">{rows.map((row,i)=>{const score=row.scores?.[period];if(score!==previous)rank=score?i+1:null;previous=score;return <li key={row.key} className={`${rank===1?'leading':''} ${row.isSelf?'is-me':''}`}>
     <span className="rank-number" aria-label={rank?`第 ${rank} 名`:'尚無新收藏'}>{rank===1?'🏆':rank??'—'}</span>
     <PlayerAvatar id={row.id} avatarKey={row.avatarKey} className="ranking-avatar"/>
     <div className="ranking-person"><h2>{row.name} {row.isSelf&&<small>我</small>}</h2><p className="ranking-counts">{row.available?`${row.total} 張 · ${row.unique} 種 · ${row.duplicates} 張重複`:'收藏暫時無法讀取'}</p></div>
     <strong className="ranking-score">{score??'—'}<small>{period==='all'?'種':'新卡種'}</small></strong>
     <button className="collection-open" onClick={()=>onCollection(row.key)} aria-label={`看${row.name}的收藏`}>看收藏 →</button>
   </li>;})}</ol>
   {state.data&&rows.length===1&&<p>目前只有你的收藏；好友加入後會一起顯示。</p>}
   {state.data&&!rows.length&&<p>目前沒有可顯示的玩家。</p>}
   <details className="f-panel ranking-rules"><summary>怎麼計分</summary><p>累積榜計算目前擁有的不同卡種；日榜和週榜計算第一次取得的不同卡種。重複卡不重複加分，同分並列。依台灣時間換日，每週一開始新週。</p><p>排行榜不發額外獎勵，也不扣點數。</p></details>
   <button className="f-primary" onClick={onMine}>打開我的卡冊</button>
 </section>;
}
