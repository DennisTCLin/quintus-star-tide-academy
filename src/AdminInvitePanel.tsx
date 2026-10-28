import {useEffect,useState} from 'react';
import type {AdminApi} from './AdminAccessPanel';

type InviteCode={id:string;code:string;grade:number;label:string;maxUses:number;usedCount:number;expired:boolean;expiresAt:string;createdAt:string;creator:string;redemptions:{username:string;displayName:string;redeemedAt:string}[]};
type FormState={grade:number;label:string;maxUses:number;expiresInDays:number};
const defaults:FormState={grade:1,label:'',maxUses:10,expiresInDays:7};
const date=(v:string)=>new Date(v).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});

export default function AdminInvitePanel({api,onRefreshStudents}:{api:AdminApi;onRefreshStudents:()=>Promise<void>}){
 const [form,setForm]=useState<FormState>({...defaults});
 const [codes,setCodes]=useState<InviteCode[]>([]);
 const [created,setCreated]=useState<{code:string;grade:number;label:string}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');

 async function load(){const d=await api<{codes:InviteCode[]}>('invites');setCodes(d.codes);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[]);

 function update<K extends keyof FormState>(k:K,v:FormState[K]){setForm(f=>({...f,[k]:v}));}

 async function create(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const d=await api<{code:InviteCode}>('invites/create',form);
   setCreated({code:d.code.code,grade:d.code.grade,label:d.code.label});
   setForm({...defaults});await load();await onRefreshStudents();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }

 async function revoke(codeId:string){
  setBusy(true);setError('');
  try{await api('invites/revoke',{codeId});setNotice('邀請碼已撤銷。');await load();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }

 async function copy(code:string){
  try{await navigator.clipboard.writeText(`星潮學院邀請碼：${code}\n網址：${location.origin}\n\n用邀請碼註冊，設定自己的帳號和密碼即可開始冒險。`);setNotice('邀請碼已複製。');}
  catch{setError('無法複製，請手動選取邀請碼。');}
 }

 const active=codes.filter(c=>!c.expired&&c.usedCount<c.maxUses);
 const inactive=codes.filter(c=>c.expired||c.usedCount>=c.maxUses);

 return <section className="admin-trials" aria-label="邀請碼管理">
  <div className="admin-heading"><div><h1>邀請碼</h1><p>產生邀請碼讓新玩家自助註冊，每個帳號完全獨立。</p></div></div>

  {created?<section className="admin-trial-result" role="region" aria-label="邀請碼已建立">
   <h2>邀請碼已建立</h2>
   <code className="recovery-code" style={{fontSize:'2rem',letterSpacing:'0.3em'}}>{created.code}</code>
   <p>{created.label} · {created.grade} 年級</p>
   <p>把邀請碼傳給對方，他們在登入頁選「我有邀請碼」就能自己註冊。</p>
   <button className="admin-primary" onClick={()=>copy(created.code)}>複製邀請碼</button>
   <button onClick={()=>setCreated(null)}>再建立一個</button>
  </section>:

  <form className="admin-trial-form" onSubmit={create}>
   <h2>建立邀請碼</h2>
   <fieldset disabled={busy}><legend>邀請設定</legend>
    <label>邀請說明<input value={form.label} maxLength={100} required placeholder="例如：給同事體驗用" onChange={e=>update('label',e.target.value)}/></label>
    <label>年級<select value={form.grade} onChange={e=>update('grade',Number(e.target.value))}>
     {[1,2,4,5,6].map(g=><option key={g} value={g}>{g} 年級</option>)}
    </select></label>
    <label>可使用次數<input type="number" min={1} max={200} step={1} required value={form.maxUses} onChange={e=>update('maxUses',Number(e.target.value))}/><small>每次使用會建立一個獨立帳號</small></label>
    <label>有效天數<input type="number" min={1} max={90} step={1} required value={form.expiresInDays} onChange={e=>update('expiresInDays',Number(e.target.value))}/><small>過期後無法再使用</small></label>
   </fieldset>
   <button className="admin-primary" type="submit" disabled={busy}>{busy?'正在建立…':'建立邀請碼'}</button>
  </form>}

  {notice&&<p className="admin-message" role="status">{notice}</p>}
  {error&&<p className="admin-message admin-error" role="alert">{error}</p>}

  <section className="admin-trial-list">
   <h2>有效的邀請碼 ({active.length})</h2>
   <button disabled={busy} onClick={()=>void load().catch(e=>setError(e.message))}>更新清單</button>
   {active.length?active.map(c=><article key={c.id}>
    <h3><code>{c.code}</code> <small>{c.grade} 年級</small></h3>
    <p>{c.label}</p>
    <p>已使用 {c.usedCount} / {c.maxUses} 次 · 有效至 {date(c.expiresAt)}</p>
    {c.redemptions?.length>0&&<details><summary>已註冊的帳號</summary>
     <ul>{c.redemptions.map((r,i)=><li key={i}>{r.displayName}（{r.username}）· {date(r.redeemedAt)}</li>)}</ul>
    </details>}
    <small>{c.creator} · {date(c.createdAt)}</small>
    <div style={{marginTop:'0.5rem'}}><button onClick={()=>copy(c.code)}>複製</button><button onClick={()=>revoke(c.id)} disabled={busy}>撤銷</button></div>
   </article>):<p>目前沒有有效的邀請碼。</p>}
  </section>

  {inactive.length>0&&<section className="admin-trial-list">
   <h2>已過期或用完 ({inactive.length})</h2>
   {inactive.map(c=><article key={c.id} style={{opacity:0.6}}>
    <h3><code>{c.code}</code> <small>{c.grade} 年級</small></h3>
    <p>{c.label} · 已使用 {c.usedCount} / {c.maxUses} 次</p>
    {c.redemptions?.length>0&&<details><summary>已註冊的帳號</summary>
     <ul>{c.redemptions.map((r,i)=><li key={i}>{r.displayName}（{r.username}）· {date(r.redeemedAt)}</li>)}</ul>
    </details>}
    <small>{c.creator} · {date(c.createdAt)}</small>
   </article>)}
  </section>}
 </section>;
}
