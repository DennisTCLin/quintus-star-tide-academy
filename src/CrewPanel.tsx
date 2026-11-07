import './crew.css';
import {parseCrewView}from'./social-views';
import {useContext,useEffect,useState}from'react';
import {ReadingContext,annotateTree}from'./readability';
import {request}from'./cloud';
import type{PlayerId}from'./game-view';
type Crew={code?:string;requests:{id:string;incoming:boolean;status:'pending'|'accepted'|'declined';name:string;expiresAt:string}[]};
export default function CrewPanel({player,csrf,onConnected}:{player:PlayerId;csrf:string;onConnected?:()=>void}){
 const {grade}=useContext(ReadingContext);
 const [state,setState]=useState<Crew>({requests:[]}),[code,setCode]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;const load=()=>{void request<Crew>(`crew?player=${player}`).then(parseCrewView).then(s=>{if(active)setState(old=>({...s,code:old.code}));}).catch(()=>{});};load();const timer=setInterval(()=>{if(!document.hidden)load();},10000);return()=>{active=false;clearInterval(timer);};},[player,csrf]);
 async function act(action:string,extra:Record<string,string>={}){if(busy)return;setBusy(true);setNotice('');try{const s=parseCrewView(await request<Crew>('crew',{player,action,...extra},csrf));setState(old=>({...s,code:s.code??old.code}));setCode('');if(action==='accept')onConnected?.();if(action==='request')setNotice('邀請已送出，等家人確認後就能一起玩。');}catch(e){setNotice((e as Error).message);}finally{setBusy(false);}}
 return annotateTree(<section className="f-panel crew-panel"><h2>邀請家人一起玩</h2><p>分享你的邀請碼，家人送出申請後，由你確認加入好友。邀請碼只用於連結好友，不會交出帳號或學習紀錄。</p><button disabled={busy} onClick={()=>void act('create')}>產生同玩邀請碼</button>{state.code&&<div><output className="crew-code">{state.code}</output><p>24 小時內有效，每組只用一次；重新產生會替換尚未使用的舊碼。</p></div>}<form onSubmit={e=>{e.preventDefault();void act('request',{code});}}><label className="form-label">家人的邀請碼<input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required maxLength={16} minLength={16} pattern="[A-Fa-f0-9]{16}" autoComplete="off"/></label><button className="f-primary" disabled={busy||code.length!==16}>送出同玩申請</button></form>{notice&&<p role="status">{notice}</p>}<ul className="crew-requests">{state.requests.map(r=><li key={r.id}><strong>{r.name}</strong><span>{r.status==='accepted'?'已成為好友':r.status==='declined'?'未加入':r.incoming?'想與你一起玩':'等待家人確認'}</span>{r.incoming&&r.status==='pending'&&<><button className="f-primary" disabled={busy} onClick={()=>void act('accept',{requestId:r.id})}>確認是家人，加入好友</button><button disabled={busy} onClick={()=>void act('decline',{requestId:r.id})}>不加入</button></>}</li>)}</ul></section>,grade);
}
