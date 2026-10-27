import { useEffect, useState } from 'react';
export type AdminIdentity={id:string;username:string;displayName:string;role:'super_admin'|'staff';enabled:boolean;canGrant:boolean;scope:'all'|'assigned';memberIds:string[];grantLimit:number;mustChangePassword:boolean;version:number};
export type AdminApi=<T>(path:string,body?:unknown)=>Promise<T>;
type Member={memberId:string;username:string;displayName:string;grade:number};
type Policy={enabled:boolean;canGrant:boolean;scope:string;memberIds:string[];grantLimit:number};
type Audit={id:string;actor:string;target:string;action:string;createdAt:string;details:Partial<Policy>&{before?:Policy;after?:Policy;username?:string;displayName?:string;grade?:number;coins?:number;tickets?:number;starTickets?:number}};
const actionNames:Record<string,string>={trial_account_created:'建立試用帳號',created:'建立帳號',permissions_changed:'調整權限或停用狀態',password_reset:'重設初始密碼',password_changed:'更新自己的密碼'};
const blank=()=>({enabled:true,canGrant:false,scope:'assigned' as 'assigned'|'all',memberIds:[] as string[],grantLimit:10});
export default function AdminAccessPanel({api,students,onRefreshStudents}:{api:AdminApi;students:Member[];onRefreshStudents:()=>Promise<void>}){
 const [users,setUsers]=useState<AdminIdentity[]>([]),[events,setEvents]=useState<Audit[]>([]),[target,setTarget]=useState<AdminIdentity|null>(null);
 const [policy,setPolicy]=useState(blank),[username,setUsername]=useState(''),[displayName,setDisplayName]=useState(''),[password,setPassword]=useState(''),[resetPassword,setResetPassword]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 function policyText(p:Partial<Policy>){const names=p.memberIds?.map(id=>students.find(s=>s.memberId===id)?.displayName??'已不在名單的孩子').join('、');return `${p.enabled?'啟用':'停用'}；${p.scope==='all'?'全站孩子（含未來新增）':names||'未指定孩子'}；${p.canGrant?`可發券，每次最多 ${p.grantLimit} 張`:'只可查看'}`;}
 async function refresh(){const [u,a]=await Promise.all([api<{users:AdminIdentity[]}>('users'),api<{events:Audit[]}>('audit')]);setUsers(u.users);setEvents(a.events);}
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[]);
 function edit(u:AdminIdentity|null){if(!u){setUsername('');setDisplayName('');}setTarget(u);setPolicy(u?{enabled:u.enabled,canGrant:u.canGrant,scope:u.scope,memberIds:[...u.memberIds],grantLimit:u.grantLimit}:blank());setPassword('');setResetPassword('');setError('');setMessage('');}
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');
  try{const {user}=await api<{user:AdminIdentity}>(target?'users/update':'users/create',target?{id:target.id,version:target.version,...policy}:{username,displayName,password,...policy});setPassword('');setTarget(user);setMessage(target?'權限已更新，對方須重新登入。':'帳號已建立，首次登入須更換初始密碼。請由你將登入資料交給指定的大人。');await refresh();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function reset(e:React.FormEvent){e.preventDefault();if(!target)return;setBusy(true);setError('');setMessage('');
  try{const {user}=await api<{user:AdminIdentity}>('users/reset-password',{id:target.id,version:target.version,password:resetPassword});setTarget(user);setResetPassword('');setMessage('初始密碼已重設，舊登入已失效，對方下次登入須更換密碼。');await refresh();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="admin-access" aria-label="大人帳號與權限"><header className="admin-heading"><div><h2>大人帳號與權限</h2><p>每位大人使用自己的帳號，由你決定可照看的孩子與發券權限。</p></div><div className="admin-actions"><button disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onRefreshStudents();await refresh();edit(null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>重新整理帳號</button><button disabled={busy} onClick={()=>edit(null)}>新增大人</button></div></header>
  <div className="admin-access-grid"><aside className="admin-access-list" aria-label="管理員名單">{users.map(u=><button key={u.id} disabled={busy||u.role==='super_admin'} aria-pressed={target?.id===u.id} onClick={()=>edit(u)}><strong>{u.displayName}</strong><small>{u.username} · {u.role==='super_admin'?'超級管理員':!u.enabled?'已停用':u.canGrant?'可查看與發券':'只可查看'}</small><small>{u.scope==='all'?'全站所有孩子（含未來新增）':`指定 ${u.memberIds.length} 位孩子`}</small></button>)}</aside>
  <div><form className="admin-access-form" onSubmit={save}><h3>{target?`編輯 ${target.displayName}`:'建立大人帳號'}</h3><fieldset disabled={busy}>
   {!target&&<div className="admin-form-pair"><label>新管理員帳號<input value={username} onChange={e=>setUsername(e.target.value)} pattern="[A-Za-z0-9_]{3,32}" required autoCapitalize="none" autoComplete="off"/></label><label>大人的稱呼<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={50} required/></label><label>初始密碼<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={10} maxLength={128} autoComplete="new-password" required/></label></div>}
   <label className="admin-check"><input type="checkbox" checked={policy.enabled} onChange={e=>setPolicy({...policy,enabled:e.target.checked})}/>啟用這個帳號</label>
   <label>可以查看的孩子<select value={policy.scope} onChange={e=>setPolicy({...policy,scope:e.target.value as 'assigned'|'all'})}><option value="assigned">只限指定的孩子</option><option value="all">全站所有孩子，含未來新增</option></select></label>
   {policy.scope==='assigned'&&<fieldset className="admin-member-options"><legend>選擇孩子</legend>{policy.memberIds.some(id=>!students.some(s=>s.memberId===id))&&<p role="status">有已指定的孩子尚未載入，請先重新整理帳號。既有指定仍會保留。</p>}{students.length?students.map(s=><label className="admin-check" key={s.memberId}><input type="checkbox" checked={policy.memberIds.includes(s.memberId)} onChange={e=>setPolicy({...policy,memberIds:e.target.checked?[...policy.memberIds,s.memberId]:policy.memberIds.filter(id=>id!==s.memberId)})}/><span>{s.displayName}<small>{s.username} · {s.grade} 年級</small></span></label>):<p>尚無孩子帳號。</p>}<p className="admin-help">未勾選孩子時，這個帳號無法查看任何學習資料。</p></fieldset>}
   <label className="admin-check"><input type="checkbox" checked={policy.canGrant} onChange={e=>setPolicy({...policy,canGrant:e.target.checked})}/>允許發放星耀特邀券</label>
   {policy.canGrant&&<label>每次發券上限<input type="number" min={1} max={100} step={1} value={policy.grantLimit} onChange={e=>setPolicy({...policy,grantLimit:Number(e.target.value)})} required/><small>只能發給有權查看的孩子，每次最多 100 張。</small></label>}
   <p className="admin-help">新帳號及重設密碼後，首次登入須自行更換密碼。儲存權限或停用帳號會結束對方所有登入。</p>
   <button className="admin-primary">{busy?'儲存中…':target?'儲存權限':'建立帳號'}</button>
  </fieldset></form>
  {target&&<details className="admin-reset"><summary>重設這位大人的密碼</summary><form onSubmit={reset}><label>新的初始密碼<input type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} minLength={10} maxLength={128} autoComplete="new-password" required/></label><button disabled={busy}>重設密碼並結束舊登入</button></form></details>}
  </div></div>
  {message&&<p className="admin-message" role="status">{message}</p>}{error&&<p className="admin-message admin-error" role="alert">{error}</p>}
  <details className="admin-audit"><summary>權限與帳號變更紀錄</summary>{events.length?events.map(e=><article key={e.id}><strong>{e.actor} · {actionNames[e.action]??e.action}</strong><p>對象：{e.action==='trial_account_created'?e.details.displayName:e.target}</p>{e.action==='trial_account_created'&&<p>{e.details.username} · {e.details.grade} 年級 · 星幣 {e.details.coins} · 星願券 {e.details.tickets} · 星耀特邀券 {e.details.starTickets}</p>}{e.action==='created'&&<p>{policyText(e.details)}</p>}{e.details.before&&e.details.after&&<><p>原本：{policyText(e.details.before)}</p><p>更新：{policyText(e.details.after)}</p></>}<small>{new Date(e.createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</small></article>):<p>尚無變更紀錄。</p>}</details>
 </section>;
}
export function AdminPasswordForm({api,onChanged,required=false}:{api:AdminApi;onChanged:()=>void;required?:boolean}){
 const [current,setCurrent]=useState(''),[next,setNext]=useState(''),[confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form className="admin-password-form" onSubmit={async e=>{e.preventDefault();setError('');if(next!==confirmation){setError('兩次新密碼不一致');return;}setBusy(true);try{await api('password',{currentPassword:current,newPassword:next});setCurrent('');setNext('');setConfirmation('');onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><h2>{required?'先更換初始密碼':'更換我的密碼'}</h2><p>更新後須重新登入，其他裝置的登入也會結束。</p><label>目前密碼<input type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} required maxLength={128}/></label><label>新密碼<input type="password" autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)} required minLength={10} maxLength={128}/></label><label>再輸入一次新密碼<input type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} required minLength={10} maxLength={128}/></label><button className="admin-primary" disabled={busy}>{busy?'更新中…':'更新密碼並重新登入'}</button>{error&&<p role="alert">{error}</p>}</form>;
}
