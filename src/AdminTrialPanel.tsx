import {useEffect,useRef,useState} from 'react';
import {clientId} from './client-id';
import type {AdminApi} from './AdminAccessPanel';
type Config={username:string;displayName:string;grade:number;coins:number;tickets:number;starTickets:number;ready:boolean};
type Trial={memberId:string;username:string;displayName:string;grade:number;curriculumLabel:string;createdAt:string;creator?:string;coins:number|null;tickets:number|null;starTickets:number|null;ready:boolean;preparedMonster?:string|null};
type Receipt=Config&{requestId:string;memberId:string;createdAt:string;curriculumLabel:string;replayed?:boolean};
type Pending={requestId:string;config:Config};
const defaults:Config={username:'',displayName:'同事試用',grade:6,coins:5000,tickets:20,starTickets:5,ready:true};
const makePassword=()=>String(crypto.getRandomValues(new Uint32Array(1))[0]%10000).padStart(4,'0');
export default function AdminTrialPanel({api,owner,onRefreshStudents}:{api:AdminApi;owner:string;onRefreshStudents:()=>Promise<void>}){
 const [form,setForm]=useState<Config>({...defaults}),[password,setPassword]=useState(makePassword),[trials,setTrials]=useState<Trial[]>([]);
 const [grades,setGrades]=useState<{grade:number;label:string}[]>([]),[pending,setPending]=useState<Pending|null>(null),[result,setResult]=useState<Receipt|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[copyPassword,setCopyPassword]=useState('');
 const lock=useRef(false),key='star-tide-admin-trial-pending-v1:'+owner;
 async function load(){const d=await api<{trials:Trial[];grades:{grade:number;label:string}[]}>('trials');setTrials(d.trials);setGrades(d.grades);}
 useEffect(()=>{let active=true;void api<{trials:Trial[];grades:{grade:number;label:string}[]}>('trials').then(d=>{if(active){setTrials(d.trials);setGrades(d.grades);}}).catch(e=>{if(active)setError(e.message)});
  try{const saved=JSON.parse(sessionStorage.getItem(key)||'null') as Pending|null;if(saved?.requestId&&saved.config){setPending(saved);setForm(saved.config);setPassword('');setNotice('有一筆尚待確認的建立操作，請先核對結果；密碼不會儲存在瀏覽器。');}}catch{setError('無法讀取先前建立狀態，請先查看試用帳號清單。');}
  return()=>{active=false;};
 },[owner]);
 function update<K extends keyof Config>(k:K,value:Config[K]){setForm(f=>({...f,[k]:value}));}
 async function complete(trial:Receipt,usedPassword=''){
  setResult(trial);setCopyPassword(usedPassword);setPending(null);sessionStorage.removeItem(key);setNotice('試用帳號已建立，可以分享給同事。');
  try{await load();await onRefreshStudents();}catch{setNotice('帳號已建立，清單暫時無法更新，稍後重新整理即可。');}
 }
 async function create(e?:React.FormEvent){e?.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  let saved:Pending|undefined;
  try{
   saved=pending??{requestId:clientId(),config:{...form,username:form.username.trim()}};
   // Keep only a request ID and non-secret form values. Reloads reconcile the same operation.
   sessionStorage.setItem(key,JSON.stringify(saved));setPending(saved);
   const d=await api<{trial:Receipt}>('trials/create',{requestId:saved.requestId,...saved.config,password});await complete(d.trial,password);
  }catch(e){
   setError((e as Error).message);
   if(saved&&[400,409].includes((e as Error&{status?:number}).status??0)){
    try{const d=await api<{status:string;trial?:Receipt}>('trials/status',{requestId:saved.requestId});if(d.trial)await complete(d.trial);else{sessionStorage.removeItem(key);setPending(null);}}
    catch{setNotice('請先核對建立結果，再繼續操作。');}
   }
  }finally{lock.current=false;setBusy(false);}
 }
 async function reconcile(){if(!pending||lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const d=await api<{status:'created'|'not_found';trial?:Receipt}>('trials/status',{requestId:pending.requestId});if(d.trial)await complete(d.trial);else setNotice('尚未找到建立結果。請輸入原先設定的四位密碼，以同一編號重試。');}
  catch(e){setError((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 async function copy(){if(!result)return;try{await navigator.clipboard.writeText(`星潮學院：${location.origin}\n帳號：${result.username}\n密碼：${copyPassword||'請使用建立時設定的四位密碼'}\n年級：小學${result.grade}年級`);setNotice('登入資訊已複製。');}catch{setError('無法複製，請選取下方登入資訊。');}}
 return <section className="admin-trials" aria-label="試用帳號管理"><div className="admin-heading"><div><h1>試用帳號</h1><p>獨立試用進度，建立後可直接分享給同事評估。</p></div></div>
  {result?<section className="admin-trial-result" role="region" aria-label="試用帳號建立完成"><h2>試用帳號已建立</h2><dl><dt>登入網址</dt><dd>{location.origin}</dd><dt>帳號</dt><dd>{result.username}</dd><dt>密碼</dt><dd>{copyPassword||'建立時設定的四位數字（不另行保存）'}</dd><dt>教材</dt><dd>{result.curriculumLabel}</dd></dl><p>星幣 {result.coins.toLocaleString()} · 星願券 {result.tickets} · 星耀特邀券 {result.starTickets}</p><p>{result.ready?'初始夥伴與新怪物挑戰已備妥，登入後選「繼續挑戰」。':'首次登入先抽初始夥伴，再開始冒險。'}</p><button className="admin-primary" onClick={copy}>複製登入資訊</button><button onClick={()=>{setResult(null);setCopyPassword('');setForm({...defaults});setPassword(makePassword());setNotice('');}}>再建立一個</button></section>:
  <form className="admin-trial-form" onSubmit={create}><h2>建立試用帳號</h2>
   <fieldset disabled={busy||!!pending}><legend>試用者與教材</legend><label>試用者稱呼<input value={form.displayName} maxLength={50} required onChange={e=>update('displayName',e.target.value)}/></label><label>登入帳號<input aria-label="登入帳號" aria-describedby="trial-username-help" autoComplete="off" value={form.username} pattern="[a-zA-Z0-9_]{3,32}" minLength={3} maxLength={32} required onChange={e=>update('username',e.target.value)}/><small id="trial-username-help">3–32 個英文字母、數字或底線</small></label><label>年級<select value={form.grade} onChange={e=>update('grade',Number(e.target.value))} disabled={!grades.length}>{[1,2,3,4,5,6].map(g=><option key={g} value={g} disabled={!grades.some(x=>x.grade===g)}>{g} 年級{g===3?'（尚未開放）':''}</option>)}</select></label></fieldset>
   <label>四位數字密碼<input aria-label="四位數字密碼" type="text" inputMode="numeric" autoComplete="off" value={password} pattern="[0-9]{4}" minLength={4} maxLength={4} required disabled={busy} onChange={e=>setPassword(e.target.value)}/></label>
   {!pending&&<button type="button" disabled={busy} onClick={()=>setPassword(makePassword())}>產生另一組密碼</button>}
   <fieldset disabled={busy||!!pending}><legend>試用額度</legend><label>星幣<input type="number" min={0} max={100000} step={1} required value={form.coins} onChange={e=>update('coins',Number(e.target.value))}/></label><label>星願券<input type="number" min={0} max={100} step={1} required value={form.tickets} onChange={e=>update('tickets',Number(e.target.value))}/></label><label>星耀特邀券<input type="number" min={0} max={100} step={1} required value={form.starTickets} onChange={e=>update('starTickets',Number(e.target.value))}/></label><label className="admin-trial-ready"><input type="checkbox" checked={form.ready} onChange={e=>update('ready',e.target.checked)}/>預備初始夥伴與新怪物戰鬥</label><small>勾選後可直接體驗高階怪物；正式學科作答與通關由試用者自己完成。</small></fieldset>
   {pending?<div className="admin-confirm"><p>建立編號：{pending.requestId}</p><button type="button" disabled={busy} onClick={reconcile}>核對建立結果</button><button type="submit" disabled={busy||!/^\d{4}$/.test(password)}>以原編號重試建立</button></div>:<button className="admin-primary" type="submit" disabled={busy||!grades.length}>{busy?'正在建立…':'建立試用帳號'}</button>}
  </form>}
  {notice&&<p className="admin-message" role="status">{notice}</p>}{error&&<p className="admin-message admin-error" role="alert">{error}</p>}
  <section className="admin-trial-list"><h2>已建立的試用帳號</h2><button disabled={busy} onClick={()=>void load().catch(e=>setError(e.message))}>更新清單</button>{trials.length?trials.map(t=><article key={t.memberId}><h3>{t.displayName} <small>小學 {t.grade} 年級</small></h3><p>帳號：{t.username} · {t.curriculumLabel}</p><p>目前星幣 {t.coins?.toLocaleString()??'待確認'} · 星願券 {t.tickets??'待確認'} · 星耀特邀券 {t.starTickets??'待確認'}</p>{t.preparedMonster&&<p>目前挑戰：{t.preparedMonster}</p>}<small>{t.creator} · {new Date(t.createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</small></article>):<p>尚未建立試用帳號。</p>}</section>
 </section>;
}
