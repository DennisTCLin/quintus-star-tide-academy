import{useContext,useEffect,useRef,useState}from'react';
import BrandIcon from'./BrandIcon';
import SocialDialog from'./SocialDialog';
import CharacterPortrait from'./CharacterPortrait';
import{Ruby}from'./ChoiceView';
import ReadAloud from'./ReadAloud';
import{ReadingContext}from'./readability';
import{petById,type PlayerId,type Profile}from'./game-view';
import{request,CloudError}from'./cloud';
import{clientId}from'./client-id';
import{PetSelect,selectedOwnedPet}from'./OnlineBattle';
import type{OnlineController}from'./online-battle';
import type{PresenceSnapshot}from'./presence';
import{parseWorld,trackWorld,type WorldView}from'./world-client';
import{WORLD_PHRASES,WORLD_STATUS,WORLD_LABELS,worldNameReading}from'./world-catalog';
import{speak,stopVoice}from'./voice';
import'./world.css';
type Label=keyof typeof WORLD_LABELS;
export function WorldText({item}:{item:{text:string;zy:string}}){const{grade}=useContext(ReadingContext);return grade===1||grade===2?<Ruby text={item.text} zy={item.zy}/>:<>{item.text}</>;}
function Label({name}:{name:Label}){return<WorldText item={WORLD_LABELS[name]}/>;}
function Name({name}:{name:string}){const reading=worldNameReading(name);return<><WorldText item={{text:reading.name,zy:reading.zy}}/><span className="world-number">{reading.number}</span></>;}
export default function WorldLobby({player,account,csrf,profile,social,presence,occupied=false}:{player:PlayerId;account:string;csrf:string;profile:Profile;social:OnlineController;presence:PresenceSnapshot;occupied?:boolean}){
 const{grade}=useContext(ReadingContext),[open,setOpen]=useState(false),[view,setView]=useState<WorldView|null>(null),[selected,setSelected]=useState<string|null>(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState<Record<string,unknown>|null>(null),[pet,setPet]=useState(profile.equipped),[version,setVersion]=useState(0);
 const gate=useRef(false),readGeneration=useRef(0),storageKey=`star-tide.world.pending.${account}.${player}`;
 const eligible=presence?.data.world?.eligible,known=presence&&Date.now()-presence.receivedAt<25000;
 useEffect(()=>{setView(null);setSelected(null);try{const saved=JSON.parse(sessionStorage.getItem(storageKey)??'null');if(saved&&saved.player===player&&typeof saved.commandId==='string')setPending(saved);else setPending(null);}catch{setNotice('待確認世界操作無法讀取。');}},[storageKey,player,csrf]);
 useEffect(()=>{if(!open||!eligible||occupied)return;const life=readGeneration.current;const tracker=trackWorld(player,s=>{if(life!==readGeneration.current)return;setView(s);setNotice('');},e=>setNotice(e.message));return tracker.stop;},[open,eligible,occupied,player,csrf,version]);
 useEffect(()=>{if(occupied||eligible===false){setOpen(false);setSelected(null);}},[occupied,eligible]);
 useEffect(()=>()=>stopVoice(),[]);
 async function act(action?:string,extra:Record<string,unknown>={}){
  if(gate.current||pending&&action||document.hidden||!navigator.onLine)return;gate.current=true;readGeneration.current++;setBusy(true);setNotice('');let body=pending;
  try{if(!body){body={player,action,commandId:clientId(),...extra};sessionStorage.setItem(storageKey,JSON.stringify(body));setPending(body);}const next=parseWorld(await request('world',body,csrf));setView(next);sessionStorage.removeItem(storageKey);setPending(null);setNotice('世界操作已確認。');}
  catch(e){setNotice((e as Error).message);if(e instanceof CloudError&&[400,401,403,404,409,429].includes(e.status)){sessionStorage.removeItem(storageKey);setPending(null);}}
  finally{gate.current=false;setBusy(false);setVersion(n=>n+1);}
 }
 if(eligible===false)return null;
 const person=view?.roster.find(p=>p.key===selected),chosen=selectedOwnedPet(profile,pet),locked=busy||!!pending,roomBusy=social.state?.room&&['pending','active'].includes(social.state.room.status),outgoing=view?.requests.some(r=>!r.incoming&&r.key===person?.key),canInteract=person?.status==='harbor'&&!occupied&&!locked;
 const close=()=>{setOpen(false);setSelected(null);stopVoice();};
 return<div className="world-entry"><button className="world-toggle" aria-haspopup="dialog" aria-expanded={open} disabled={!known||!eligible||occupied} onClick={()=>{setOpen(true);setPet(profile.equipped);}}><BrandIcon name="compass"/><span><Label name="world"/> · {known&&eligible?presence!.data.world!.online:'…'} <Label name="online"/></span></button>
 {open&&<SocialDialog title="世界港口" titleContent={<Label name="title"/>} onClose={close} scrollBody wide>
 <p>用世界暱稱相遇。好友要雙方確認；學習中不會被邀請打斷。</p><ReadAloud grade={grade}><button onClick={()=>speak('這裡是世界港口。點一位航海員，可以打招呼或邀請加好友。雙方確認後才能對戰。學習中的朋友，等他回港口再邀請。',setNotice)}><BrandIcon name="speaker"/><Label name="listen"/></button></ReadAloud>
 {notice&&<p role="status">{notice}</p>}{pending&&<button disabled={busy} onClick={()=>void act()}><Label name="retry"/></button>}
 {!view?<p role="status">正在確認世界港口…</p>:<>
 <div className="world-preferences"><span><Name name={view.self.name}/></span><label><input type="checkbox" checked={view.self.receiveInvites} disabled={locked} onChange={e=>void act('invites',{enabled:e.target.checked})}/><Label name="receive"/></label></div>
 {person?<><button onClick={()=>setSelected(null)}><Label name="back"/></button><section className="world-person-detail"><div className="world-avatar"><BrandIcon name={person.avatar}/></div><h3><Name name={person.name}/></h3><p><WorldText item={WORLD_STATUS[person.status]}/></p>{person.pet&&<p>同行夥伴：{petById(person.pet)?.name}</p>}
 {!person.self&&<><div className="world-phrases">{Object.entries(WORLD_PHRASES).map(([key,phrase])=><button key={key} disabled={!canInteract} onClick={()=>void act('greet',{target:person.key,phrase:key})}><BrandIcon name={phrase.icon}/><WorldText item={phrase}/></button>)}</div>
 {person.friend?<><PetSelect profile={profile} value={chosen} onChange={setPet}/><button className="f-primary" disabled={!canInteract||!!roomBusy||social.busy||!social.connected||!!social.uncertain} onClick={async()=>{if(await social.act('invite',{friend:person.key,pet:chosen}))close();}}><BrandIcon name="battle"/><Label name="invite"/></button>{social.error&&<p role="alert">{social.error}</p>}</>:<button className="f-primary" disabled={!canInteract||outgoing} onClick={()=>void act('request',{target:person.key})}><BrandIcon name="people"/><Label name={outgoing?'waiting':'request'}/></button>}
 {person.status!=='harbor'&&<p>等對方回到港口再邀請。</p>}<button disabled={locked} onClick={async()=>{await act('mute',{target:person.key,value:true});setSelected(null);}}><Label name="mute"/></button></>}
 </section></>:<><div className="world-phrases">{Object.entries(WORLD_PHRASES).map(([key,phrase])=><button key={key} disabled={locked} onClick={()=>void act('greet',{phrase:key})}><BrandIcon name={phrase.icon}/><WorldText item={phrase}/></button>)}</div>
 <ul className="world-roster">{view.roster.map(p=>{const companion=petById(p.pet??'');return<li key={p.key}><button className="world-person" onClick={()=>setSelected(p.key)}><span className="world-avatar"><BrandIcon name={p.avatar}/></span><span><strong><Name name={p.name}/></strong><small><WorldText item={WORLD_STATUS[p.status]}/>{p.self?' · ':p.friend?' · ':''}{p.self?<Label name="self"/>:p.friend?<Label name="friend"/>:null}</small>{companion&&<small>{companion.name}</small>}</span>{companion&&<CharacterPortrait characterId={companion.id} src={companion.image} alt="" paused/>}</button></li>;})}</ul>{!view.roster.length&&<p>港口暫時安靜，稍後再來看看。</p>}
 <section className="world-greetings" aria-label="固定圖文招呼"><h3>港口招呼</h3>{view.greetings.filter(g=>g.expiresAt>view.serverNow).map(g=><p key={g.id}><Name name={g.name}/>：<BrandIcon name={WORLD_PHRASES[g.phrase].icon}/><WorldText item={WORLD_PHRASES[g.phrase]}/></p>)}</section>
 <section><h3><Label name="requests"/></h3>{view.requests.length?view.requests.map(r=><div className="world-request" key={r.id}><strong><Name name={r.name}/></strong>{r.incoming?<><button className="f-primary" disabled={locked} onClick={()=>void act('accept',{requestId:r.id})}><Label name="accept"/></button><button disabled={locked} onClick={()=>void act('decline',{requestId:r.id})}><Label name="decline"/></button></>:<span><Label name="waiting"/></span>}</div>):<p>目前沒有待確認邀請。</p>}</section>
 <details><summary>靜音管理</summary><p>靜音後，雙方不會再收到彼此的新招呼、好友或對戰邀請。</p>{view.mutes.map(m=><div className="world-request" key={m.key}><Name name={m.name}/><button disabled={locked} onClick={()=>void act('mute',{target:m.key,value:false})}><Label name="unmute"/></button></div>)}</details></>}
 <button disabled={busy} onClick={()=>setVersion(v=>v+1)}><Label name="refresh"/></button><p className="fine-print">離開頁面會暫停更新；只提供固定招呼，不開放文字聊天或麥克風。</p></>}
 </SocialDialog>}</div>;
}
