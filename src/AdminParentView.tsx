import {StudySummary} from './StudyReview';
import type {Grade} from './learning';
import type {studySummary} from './study-review';
import {useEffect,useRef,useState} from 'react';
import {SKILL_NAMES} from './learning-catalog';
export type ParentReport={memberId:string;username:string;displayName:string;grade:Grade;study?:ReturnType<typeof studySummary>;cloudSavedAt:string;cloudVerified:number|null;gardenImported:boolean;
 collection:{species:number;copies:number;draws:number};rewards:{stars:number;starsPerTicket:number;completedRounds:number};
 run:{course:string;day:string;status:string;answered:number|null;correct:number|null;total:number;practice:boolean}|null;
 lastDraw:{name:string;rarity:string|null;ticketType:string;duplicate:boolean}|null;
 grants:{grantId:string;amount:number;ticketType:string;reason:string;createdAt:string}[];updatedAt:string};
const date=(v:string)=>new Date(v).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});
const kind=(v:string)=>v==='standard'?'一般扭蛋券':'星耀券';
export default function AdminParentView({memberId,refreshToken,load}:{memberId:string;refreshToken:string|null;load:(id:string,signal:AbortSignal)=>Promise<ParentReport>}){
 const read=useRef(load);read.current=load;const [data,setData]=useState<ParentReport|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();let active=true;setError('');const timeout=setTimeout(()=>controller.abort(new Error('讀取逾時，請重試')),10000);
  void read.current(memberId,controller.signal).then(value=>{if(active){if(value.memberId!==memberId)throw Error('孩子資料已變更，請重新整理');setData(value);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>clearTimeout(timeout));
  return()=>{active=false;clearTimeout(timeout);controller.abort();};
 },[memberId,refreshToken,retry]);
 return <section className="admin-parent" aria-label="所選孩子的家長艙">
  <header><h2>孩子的家長艙</h2><p>查看這位孩子的進度與紀錄。</p></header>
  {error&&<div role="alert"><p>{error}</p><button onClick={()=>setRetry(n=>n+1)}>重新讀取家長艙</button></div>}
  {!data&&!error&&<p role="status">正在讀取家長艙…</p>}
  {data&&<><p className="admin-help">{data.displayName}（{data.username}） · 資料更新於 {date(data.updatedAt)}</p>
   <StudySummary name={data.displayName} grade={data.grade} summary={data.study}/>
   <div className="admin-parent-section"><h3>收藏與獎勵</h3><dl className="admin-stats"><div><dt>夥伴種類</dt><dd>{data.collection.species}</dd></div><div><dt>夥伴卡片</dt><dd>{data.collection.copies}</dd></div><div><dt>累計扭蛋</dt><dd>{data.collection.draws}</dd></div><div><dt>已存星星</dt><dd>{data.rewards.stars} / {data.rewards.starsPerTicket}</dd></div></dl>
    <p>每存滿 {data.rewards.starsPerTicket} 顆星，自動換一張一般扭蛋券。使用券不會扣除學習成就。</p>
    {data.lastDraw?<p>最近一次扭蛋：{data.lastDraw.name}（{data.lastDraw.rarity??'夥伴'}） · {kind(data.lastDraw.ticketType)} · {data.lastDraw.duplicate?'再次遇見':'新夥伴'}</p>:<p>尚無扭蛋紀錄。</p>}</div>
   <div className="admin-parent-section"><h3>最近挑戰</h3>{data.run?<><p>{SKILL_NAMES[data.run.course]??data.run.course} · {data.run.day} · {data.run.status==='active'?'進行中':data.run.status==='won'?'已完成':'已結束'}{data.run.practice?' · 練習模式':''}</p><p>已作答 {data.run.answered??'未記錄'} / {data.run.total} 題 · 首次答對 {data.run.correct??'未記錄'} 題</p></>:<p>尚無挑戰紀錄。</p>}<p className="admin-help">能力調整、訂正與數學島的紀錄請看上方學習狀態；不以單次挑戰判定孩子的能力。</p></div>
   <div className="admin-parent-section"><h3>帳號與雲端進度</h3><p>孩子帳號：{data.username}</p><p>最近雲端存檔：{date(data.cloudSavedAt)}</p><p>雲端驗證的歷史學習成就：{data.cloudVerified??'未記錄'}</p>{data.gardenImported&&<p>已保留注音航海團的原始學習紀錄。</p>}<p className="admin-help">換裝置登入同一個孩子帳號，可以接續學習與收藏。閱讀、聲音與減少動畫仍由孩子使用的裝置設定。</p></div>
   <div className="admin-parent-section"><h3>最近收到的扭蛋券</h3>{data.grants.length?<ul className="admin-parent-grants">{data.grants.map(g=><li key={g.grantId}><b>+{g.amount} 張{kind(g.ticketType)}</b><small>{date(g.createdAt)}</small><p>{g.reason}</p></li>)}</ul>:<p>尚無管理員發券紀錄。</p>}</div>
  </>}
 </section>;
}
