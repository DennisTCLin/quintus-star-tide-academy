import './crew.css';
import {parseTradeView}from'./social-views';
import {useContext,useEffect,useState}from'react';
import {request,CloudError}from'./cloud';
import {clientId}from'./client-id';
import {petById,type PlayerId}from'./game-view';
import {ReadingContext,annotateTree}from'./readability';
type Card={id:string;copies:number};
type Offer={id:string;incoming:boolean;friend:string;name:string;give:string;receive:string;status:'pending'|'accepted'|'declined'|'cancelled'|'expired';expiresAt:string};
type View={offers:Offer[];friend?:string;name?:string;mine?:Card[];theirs?:Card[]};
export default function FriendTrades({player,csrf,account,friend:fixedFriend,onChanged}:{player:PlayerId;csrf:string;account:string;friend?:string;onChanged?:()=>void}){
 const {grade}=useContext(ReadingContext),key=`star-tide.friend-trade.pending.${location.pathname.startsWith('/adult')?'adult':'child'}.${account}.${player}`;
 const [friends,setFriends]=useState<{key:string;name:string}[]>([]),[friend,setFriend]=useState(fixedFriend??''),[state,setState]=useState<View>({offers:[]}),[give,setGive]=useState(''),[receive,setReceive]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState<Record<string,unknown>|null>(null),[version,setVersion]=useState(0);
 useEffect(()=>{let active=true;void request<{friends:{key:string;name:string;sameAccount?:boolean}[]}>('friends').then(s=>{if(active)setFriends(s.friends.filter(f=>f.sameAccount===false));}).catch(()=>{});return()=>{active=false;};},[account,player,csrf]);
 useEffect(()=>{try{const saved=JSON.parse(sessionStorage.getItem(key)??'null');if(saved?.player===player&&typeof saved.commandId==='string')setPending(saved);}catch{setNotice('待確認交換無法讀取，請先重新連線。');}},[key,player]);
 useEffect(()=>{let active=true;setGive('');setReceive('');const load=()=>{if(document.hidden)return;void request<View>(`friend-trades?player=${player}${friend?'&friend='+encodeURIComponent(friend):''}`).then(parseTradeView).then(s=>{if(active)setState(s);}).catch(e=>{if(active)setNotice((e as Error).message);});};load();const timer=setInterval(load,10000);return()=>{active=false;clearInterval(timer);};},[friend,player,csrf,version]);
 async function act(action?:string,extra:Record<string,string>={}){
  if(busy||pending&&action)return;setBusy(true);setNotice('');let body=pending;
  try{if(!body){body={player,action,commandId:clientId(),...extra};sessionStorage.setItem(key,JSON.stringify(body));setPending(body);}const result=parseTradeView(await request<View>('friend-trades',body,csrf));sessionStorage.removeItem(key);setPending(null);setState(result);setVersion(v=>v+1);onChanged?.();setNotice(action==='propose'?'交換邀請已送出，雙方確認後才會移動卡片。':'交換結果已同步。');}
  catch(e){setNotice((e as Error).message);if(e instanceof CloudError&&[400,401,403,404,409].includes(e.status)){sessionStorage.removeItem(key);setPending(null);setVersion(v=>v+1);}}
  finally{setBusy(false);}
 }
 const name=(id:string)=>petById(id)?.name??id,locked=busy||!!pending;
 return annotateTree(<section className="f-panel friend-trades"><h2>與好友交換夥伴</h2><p>雙方確認後各交換一張；初始夥伴不能交換。等級與經驗留在原帳號，卡片不會把另一人的學習成果帶走。</p>{!fixedFriend&&<label className="form-label">選擇已確認的好友<select value={friend} onChange={e=>setFriend(e.target.value)} disabled={locked}><option value="">選擇好友</option>{friends.map(f=><option key={f.key} value={f.key}>{f.name}</option>)}</select></label>}
 {friend&&state.friend===friend&&<form onSubmit={e=>{e.preventDefault();void act('propose',{friend,give,receive});}}><label className="form-label">你送出的一張夥伴卡<select required value={give} onChange={e=>setGive(e.target.value)} disabled={locked}><option value="">選擇夥伴</option>{state.mine?.map(c=><option key={c.id} value={c.id}>{name(c.id)} · {c.copies} 張</option>)}</select></label><label className="form-label">向 {state.name} 交換的一張夥伴卡<select required value={receive} onChange={e=>setReceive(e.target.value)} disabled={locked}><option value="">選擇夥伴</option>{state.theirs?.filter(c=>c.id!==give).map(c=><option key={c.id} value={c.id}>{name(c.id)} · {c.copies} 張</option>)}</select></label><button className="f-primary" disabled={locked||!give||!receive||give===receive}>送出交換邀請</button>{(!state.mine?.length||!state.theirs?.length)&&<p>雙方都需要初始夥伴以外的卡片，才能交換。</p>}</form>}
 {notice&&<p role="status">{notice}</p>}{pending&&<div className="notice"><p>上次操作尚待確認，先查回結果，避免重複交換。</p><button disabled={busy} onClick={()=>void act()}>重試原交換操作</button></div>}
 <ul className="crew-requests">{state.offers.map(o=><li key={o.id}><strong>{o.name} · {o.incoming?'送給你的交換邀請':'你送出的交換邀請'}</strong><span>你給 {name(o.incoming?o.receive:o.give)} 一張，換 {name(o.incoming?o.give:o.receive)} 一張</span><b>{({pending:'等待確認',accepted:'交換完成',declined:'未同意',cancelled:'已取消',expired:'已到期'})[o.status]}</b>{o.status==='pending'&&(o.incoming?<><button className="f-primary" disabled={locked} onClick={()=>void act('accept',{offer:o.id})}>同意這筆交換</button><button disabled={locked} onClick={()=>void act('decline',{offer:o.id})}>不同意</button></>:<button disabled={locked} onClick={()=>void act('cancel',{offer:o.id})}>取消這筆邀請</button>)}</li>)}</ul></section>,grade);
}
