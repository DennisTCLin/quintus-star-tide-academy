import AdminTrialPanel from './AdminTrialPanel';
import { clientId as createClientId } from "./client-id";
import AbilityRadar from './AbilityRadar';
import {schoolDisplayName as school} from './school-curriculum';
import AdminParentView, {type ParentReport} from './AdminParentView';
import {useAdminPresence,presenceFor,ADMIN_PRESENCE_FRESH,type AdminPresenceData} from './admin-presence';
import {ACTIVITIES} from './social-activity';
import {SUBJECTS,type Subject} from './subject-catalog';
import type {AbilitySnapshot} from './growth';
import AdminAccessPanel, { AdminPasswordForm, type AdminIdentity } from './AdminAccessPanel';
import { useEffect, useRef, useState } from 'react';
import BrandLogo from './BrandLogo';
import PlayerAvatar from './PlayerAvatar';
import type { PlayerId } from './game-view';
import { SKILL_NAMES } from './learning-catalog';
import './admin-console.css';

type Session = AdminIdentity & {csrf:string};
type Student = {memberId:string;username:string;displayName:string;playerId:PlayerId;avatarKey:string;grade:number;school:string|null;schoolName?:string|null;lastSeen:string|null;available:boolean;ability:AbilitySnapshot|null;
  starTickets:number|null;tickets:number|null;coins:number|null;mastery:number|null;voyages:number|null;allocated:number|null;answered:number|null;correct:number|null;
  skills:{key:string;level:number;answered:number;correct:number;recent:string}[];
  run:{course:string;status:string;answered:number;total:number}|null;
  island:{answered:number;wrong:number;review:number;completedUnits:number}|null};
type TicketType = 'standard'|'star';
const ticketName=(kind?:TicketType)=>kind==='standard'?'一般扭蛋券':'星耀券';
type Grant = {ticketType?:TicketType;grantId:string;username:string;amount:number;reason:string};
type Receipt = Grant & {displayName:string;before:number;after:number;operator:string;replayed?:boolean;createdAt?:string};
type Pending = {owner:string;input:Grant;preview:Receipt|null;attempted:boolean};
const pendingKey=(owner:string)=>'star-tide-admin-pending-grant-v2:'+owner;
const date = (value:string|null) => value ? new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '尚無上線紀錄';
const runStatus:Record<string,string>={active:'進行中',won:'已完成',failed:'已結束',abandoned:'已離開'};

export default function AdminConsole() {
  const authEpoch=useRef(0),refreshSequence=useRef(0);
  const [radarSubject,setRadarSubject]=useState<Subject>('math'),[reportsStale,setReportsStale]=useState(false);
  const [view,setView]=useState<'learning'|'parent'|'access'|'trials'|'password'>('learning');
  const [session,setSession]=useState<Session|null>(null),[checking,setChecking]=useState(true);
  const [username,setUsername]=useState(''),[password,setPassword]=useState('');
  const [students,setStudents]=useState<Student[]>([]),[selected,setSelected]=useState(''),[search,setSearch]=useState('');
  const [receipts,setReceipts]=useState<Receipt[]>([]),[updated,setUpdated]=useState<string|null>(null);
  const [ticketType,setTicketType]=useState<TicketType>('standard');
  const [amount,setAmount]=useState('1'),[reason,setReason]=useState(''),[pending,setPending]=useState<Pending|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const student=students.find(s=>s.username===selected);
  const activeType:TicketType=pending ? pending.input.ticketType ?? 'star' : session?.role==='super_admin' ? ticketType : 'star';
  async function api<T>(path:string,body?:unknown,auth:Session|null=session,signal?:AbortSignal):Promise<T> {
    const epoch=authEpoch.current;
    const response=await fetch('/api/admin/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal,
      headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(auth?{'X-CSRF-Token':auth.csrf}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const result=await response.json();
    if(epoch!==authEpoch.current)throw Error('登入已切換，請重新操作');
    if(!response.ok) {if(response.status===401 && path!=='login'){authEpoch.current++;setSession(null);setStudents([]);setReceipts([]);setPending(null);}throw Object.assign(new Error(result.error || '暫時無法完成，請重試'),{status:response.status});}
    return result;
  }
  async function refresh(auth:Session,signal?:AbortSignal) {
    if(auth.mustChangePassword)return;
    const epoch=authEpoch.current,sequence=++refreshSequence.current;
    const [data,history]=await Promise.all([api<{students:Student[];updatedAt:string}>('students',undefined,auth,signal),api<{receipts:Receipt[]}>('grants',undefined,auth,signal)]);
    if(epoch!==authEpoch.current||sequence!==refreshSequence.current)return;
    setReportsStale(false);setStudents(data.students);setUpdated(data.updatedAt);setReceipts(history.receipts);
    setSelected(old=>data.students.some(s=>s.username===old)?old:data.students[0]?.username??'');
  }
  const live=useAdminPresence(session&&!session.mustChangePassword?`${session.id}:${session.csrf}:${session.version}`:null,signal=>api<AdminPresenceData>('presence',undefined,session,signal));
  const liveKnown=live.snapshot!==null&&live.now-live.snapshot.receivedAt<ADMIN_PRESENCE_FRESH;
  const presence=(memberId:string)=>presenceFor(live.snapshot,memberId,live.now);
  const liveLabel=(memberId:string)=>{const p=presence(memberId);return p.state==='unknown'?'狀態待確認':p.state==='offline'?'離線':p.activity?`在線 · ${ACTIVITIES[p.activity]}`:'在線';};
  const refreshLatest=useRef(refresh);refreshLatest.current=refresh;
  useEffect(()=>{if(!session||session.mustChangePassword)return;let active=true,pending=false,controller:AbortController|undefined;
    const update=()=>{if(!active||pending||document.visibilityState!=='visible'||!navigator.onLine)return;pending=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),10000);void refreshLatest.current(session,controller.signal).catch(()=>{if(active)setReportsStale(true);}).finally(()=>{clearTimeout(timeout);pending=false;});};
    const changed=()=>{if(navigator.onLine)update();else setReportsStale(true);};
    const timer=setInterval(update,30000);document.addEventListener('visibilitychange',changed);window.addEventListener('online',changed);window.addEventListener('offline',changed);
    return()=>{active=false;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',changed);window.removeEventListener('online',changed);window.removeEventListener('offline',changed);};
  },[session?.id,session?.csrf,session?.version,session?.mustChangePassword]);
  function restore(auth:Session) {
    setPending(null);
    if(auth.mustChangePassword)return;
    try {let saved=JSON.parse(sessionStorage.getItem(pendingKey(auth.id)) || 'null') as Pending|null;
      // Only legacy superadmins existed in v1; their display name was their login.
      if(!saved && auth.role==='super_admin' && auth.displayName.toLowerCase()===auth.username.toLowerCase()){
        const legacyKey='star-tide-admin-pending-grant-v1:'+auth.username.toLowerCase();
        const legacy=JSON.parse(sessionStorage.getItem(legacyKey)||'null') as Pending|null;
        if(legacy?.owner.toLowerCase()===auth.username.toLowerCase() && legacy.attempted){saved={...legacy,owner:auth.id};sessionStorage.setItem(pendingKey(auth.id),JSON.stringify(saved));sessionStorage.removeItem(legacyKey);}
      }
      if(saved?.owner===auth.id && saved.attempted && saved.input?.grantId){setPending(saved);setSelected(saved.input.username);}
    } catch {setNotice('無法讀取上次操作，請先查看發放紀錄。');}
  }
  useEffect(()=>{let active=true;
    fetch('/api/admin/session',{credentials:'same-origin',cache:'no-store'}).then(async r=>{
      if(!active)return;if(r.status===401)return;if(!r.ok)throw Error('管理服務暫時無法連線，請重新整理');
      const auth=await r.json() as Session;if(!active)return;setSession(auth);restore(auth);await refresh(auth);
    }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setChecking(false);});
    return()=>{active=false;};
  },[]);
  async function login(e:React.FormEvent) {e.preventDefault();authEpoch.current++;setBusy(true);setError('');setNotice('');
    try {const auth=await api<Session>('login',{username,password},null);setPassword('');setView('learning');setSession(auth);restore(auth);await refresh(auth);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function preview(e:React.FormEvent) {e.preventDefault();if(!session||!student)return;setBusy(true);setError('');setNotice('');
    try {const input={grantId:createClientId(),username:student.username,ticketType:activeType,amount:Number(amount),reason:reason.trim()};
      const data=await api<{receipt:Receipt}>('tickets/preview',input);setPending({owner:session.id,input,preview:data.receipt,attempted:false});
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function grant() {if(!pending||!session||pending.owner!==session.id)return;setBusy(true);setError('');
    const saved={...pending,attempted:true};
    try {
      // Persist the exact request before sending; reconnect/reload must replay its ID.
      sessionStorage.setItem(pendingKey(saved.owner),JSON.stringify(saved));setPending(saved);
      const {receipt}=await api<{receipt:Receipt}>('tickets/grant',saved.input);
      sessionStorage.removeItem(pendingKey(saved.owner));setPending(null);setReason('');
      setNotice(`${receipt.displayName}（${receipt.username}）已收到 ${receipt.amount} 張${ticketName(receipt.ticketType)}。${receipt.replayed?'已核對原收據，沒有重複發放。':''}`);
      setReceipts(old=>[receipt,...old.filter(r=>r.grantId!==receipt.grantId)]);
      try {await refresh(session);}catch {setError('發券已完成；列表更新失敗，請按「重新整理」。');}
    }catch(e){
      if((e as Error & {status?:number}).status===400){
        sessionStorage.removeItem(pendingKey(saved.owner));setPending(null);
        setError(`本次未發券：${(e as Error).message}。請修改後重新預覽。`);
        try {await refresh(session);}catch { /* The confirmed rejection remains editable even if refresh fails. */ }
      }else setError(`尚未確認發放結果：${(e as Error).message}。請重新登入或用下方按鈕核對原發放，不要另開一筆。`);
    }
    finally{setBusy(false);}
  }
  async function logout() {if(!session)return;setBusy(true);setError('');
    try {await api('logout',{});authEpoch.current++;setSession(null);setStudents([]);setReceipts([]);setPending(null);setNotice('已登出管理後台。');}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function passwordChanged(){authEpoch.current++;setSession(null);setStudents([]);setReceipts([]);setPending(null);setView('learning');setNotice('密碼已更新，請使用新密碼登入。');}
  const inaccessiblePending=pending && (!session?.canGrant || (pending.input.ticketType==='standard' && session.role!=='super_admin') || pending.input.amount > session.grantLimit || !students.some(s=>s.username===pending.input.username));
  async function reconcilePending(){if(!pending)return;setBusy(true);setError('');try{const r=await api<{grantId:string;status:string}>('tickets/status',{grantId:pending.input.grantId});sessionStorage.removeItem(pendingKey(pending.owner));setPending(null);setNotice(`${r.status==='applied'?'原發放已完成':'原發放沒有入帳，已停止此操作'}。核對編號：${r.grantId}`);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const visible=students.filter(s=>`${s.displayName} ${s.username} ${school(s.school,s.schoolName)}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="admin-console" data-learning-content>
    <header className="admin-masthead"><a href="/" aria-label="回星潮學院"><BrandLogo variant="header"/></a>
      <div><span className="admin-role">{session?.role==='staff'?session.canGrant?'學習與發券管理員':'學習觀察員':'超級管理員'}</span>{session&&<><b>{session.displayName}</b><button type="button" onClick={logout} disabled={busy}>登出</button></>}</div></header>
    {checking?<p role="status" className="admin-loading">正在確認登入…</p>:!session?
      <section className="admin-login"><span className="admin-compass" aria-hidden="true">✦</span><h1>星潮管理艙</h1><p>查看孩子的學習進展，送出一份鼓勵。</p>
        <form onSubmit={login}><label>管理員帳號<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required maxLength={32} autoCapitalize="none" spellCheck={false}/></label>
          <label>密碼<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required maxLength={128}/></label>
          <button className="admin-primary" disabled={busy}>{busy?'登入中…':'登入管理艙'}</button></form>
        <a href="/">回到孩子的學院</a></section>:session.mustChangePassword?<section className="admin-login"><AdminPasswordForm api={api} onChanged={passwordChanged} required/></section>:
      <><nav className="admin-tabs" aria-label="管理功能"><button aria-pressed={view==='learning'} onClick={()=>setView('learning')}>學習與鼓勵</button>{session.role==='super_admin'&&<button aria-pressed={view==='parent'} onClick={()=>setView('parent')}>家長艙</button>}{session.role==='super_admin'&&<button aria-pressed={view==='access'} onClick={()=>setView('access')}>大人帳號與權限</button>}{session.role==='super_admin'&&<button aria-pressed={view==='trials'} onClick={()=>setView('trials')}>試用帳號</button>}<button aria-pressed={view==='password'} onClick={()=>setView('password')}>我的密碼</button></nav>
        {view==='trials'&&session.role==='super_admin'&&<AdminTrialPanel key={`${session.id}:${session.version}`} api={api} owner={session.id} onRefreshStudents={()=>refresh(session)}/>}
        {view==='access'&&session.role==='super_admin'&&<AdminAccessPanel api={api} students={students} onRefreshStudents={()=>refresh(session)}/>}
        {view==='password'&&<AdminPasswordForm api={api} onChanged={passwordChanged}/>}
        {(view==='learning'||view==='parent')&&<>{inaccessiblePending&&<section className="admin-confirm admin-unresolved"><h2>核對先前發放</h2><p>你的權限已變更，先確認這筆操作是否入帳，再繼續查看。</p><p className="admin-receipt-id">{pending?.input.grantId}</p><button disabled={busy} onClick={reconcilePending}>核對原發放並繼續</button></section>}<div className="admin-heading"><div><h1>{view==='parent'?'家長艙':'學習與鼓勵'}</h1><p>{students.length} 位航海員 · {updated?`更新於 ${date(updated)}`:'正在讀取學習狀態'}</p><p className="admin-live-summary">{liveKnown?`目前 ${students.filter(x=>presence(x.memberId).state==='online').length} 位在線`:'正在確認在線狀態…'} · 約每 5 秒更新</p><p className="admin-help">突然斷線時，最多約 35 秒確認離線。學習資料每 30 秒更新。</p>{reportsStale&&<p role="status">學習資料暫時無法更新，顯示上次紀錄。</p>}</div>
        <button onClick={async()=>{setBusy(true);setError('');try{await refresh(session);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}} disabled={busy}>重新整理</button></div>
        <div className="admin-workspace"><aside className="admin-roster" aria-label="航海員名單"><label>尋找航海員<input type="search" placeholder="姓名、帳號或學校" value={search} onChange={e=>setSearch(e.target.value)}/></label>
          {visible.length?visible.map(s=><button key={s.username} className="admin-student" aria-pressed={selected===s.username} disabled={busy||!!pending} onClick={()=>{setSelected(s.username);setNotice('');setError('');}}>
            <PlayerAvatar id={s.playerId} avatarKey={s.avatarKey}/><span><strong>{s.displayName}</strong><small>{s.username} · {s.grade} 年級</small><small className={'admin-online '+presence(s.memberId).state}><i aria-hidden="true"/>{liveLabel(s.memberId)}</small></span><span className="admin-ticket-count">{(activeType==='standard'?s.tickets:s.starTickets)??'—'}<small>{ticketName(activeType)}</small></span></button>):<p>沒有符合的航海員。</p>}
        </aside><div className="admin-detail">{student&&<>
          <section className="admin-overview"><div className="admin-person"><PlayerAvatar id={student.playerId} avatarKey={student.avatarKey}/><div><h2>{student.displayName}<small>{student.username}</small></h2><p>{student.grade} 年級 · {school(student.school,student.schoolName)}</p></div></div>
            <p className={'admin-online '+presence(student.memberId).state}><i aria-hidden="true"/>{liveLabel(student.memberId)}</p><p className="admin-last-seen">最近上線：{date(presence(student.memberId).lastSeenAt?new Date(presence(student.memberId).lastSeenAt!).toISOString():student.lastSeen)}</p>{session.role==='super_admin'&&view!=='parent'&&<button className="admin-parent-link" onClick={()=>setView('parent')}>查看這位孩子的家長艙</button>}
            <dl className="admin-stats"><div><dt>精熟點數</dt><dd>{student.mastery??'—'}</dd></div><div><dt>完成航程</dt><dd>{student.voyages??'—'}</dd></div><div><dt>星幣</dt><dd>{student.coins??'—'}</dd></div><div><dt>一般扭蛋券</dt><dd>{student.tickets??'—'}</dd></div></dl>
            {student.run&&<p className="admin-run">最近挑戰：{SKILL_NAMES[student.run.course]??student.run.course} · {runStatus[student.run.status]??student.run.status} · 已作答 {student.run.answered}/{student.run.total} 題</p>}
          </section>
          <section className="admin-radar"><h2>能力雷達圖</h2><p className="admin-help">與孩子港口使用相同計算。10 是起始值，「待探索」代表尚未累積這一科的獨立答對紀錄；數值不是考試成績。</p>{student.ability?<><AbilityRadar snapshot={student.ability} selected={radarSubject} onSelect={setRadarSubject} compact/><p className="admin-radar-detail">{SUBJECTS.find(x=>x.id===radarSubject)?.name}：{student.ability[radarSubject].stage.description} · 已累積 {student.ability[radarSubject].masteryPoints} 精熟點 · {student.ability[radarSubject].creditedAnswers} 次獨立答對</p></>:<p>能力資料暫時無法讀取。</p>}</section>
          <section className="admin-learning"><h2>學習狀態</h2>{!student.available?<p role="alert">學習資料暫時無法讀取，原始資料已保留。請聯絡維護人員檢查。</p>:<><p>已安排 {student.allocated} 道新題；納入能力調整 {student.answered} 次，其中獨立答對 {student.correct} 次。</p>
            {student.skills.length?<div className="admin-skills">{student.skills.map(s=><div key={s.key}><strong>{SKILL_NAMES[s.key]??s.key}</strong><span>第 {s.level} 階</span><span>獨立答對 {s.correct} / {s.answered}</span></div>)}</div>:<p className="admin-empty">尚無能力調整紀錄。完成練習後會顯示在這裡。</p>}
            <p className="admin-help">這是系統納入調整的紀錄，不代表所有作答的總正確率；訂正、單題補練及數學島另行記錄。</p>
            {student.island&&<div className="admin-island"><h3>數學島</h3><p>作答 {student.island.answered} 次 · 答錯 {student.island.wrong} 次 · 待複習 {student.island.review} 項 · 已挑戰關卡 {student.island.completedUnits} 個</p></div>}</>}
          </section>
          {view==='parent'&&session.role==='super_admin'?<AdminParentView key={`${session.id}:${student.memberId}`} memberId={student.memberId} refreshToken={updated} load={(id,signal)=>api<ParentReport>('parent/'+id,undefined,session,signal)}/>:<>
          {session.canGrant&&!inaccessiblePending&&<section className="admin-grant"><div className="admin-grant-title"><div><h2>發放扭蛋券</h2><p>{activeType==='standard'?'一般扭蛋券就是遊戲中的星願券，可轉一次一般扭蛋。':'星耀券是高級券，每張獲得一位 S 或 A 級夥伴。'}</p></div><b>{(activeType==='standard'?student.tickets:student.starTickets)??'—'}<small>目前持有{ticketName(activeType)}</small></b></div>
            {session.role==='super_admin'&&<div className="admin-ticket-types" role="group" aria-label="發放券別"><button type="button" aria-pressed={activeType==='standard'} disabled={busy||!!pending} onClick={()=>setTicketType('standard')}>一般扭蛋券</button><button type="button" aria-pressed={activeType==='star'} disabled={busy||!!pending} onClick={()=>setTicketType('star')}>星耀券（高級）</button></div>}
            {pending?<div className="admin-confirm" role="region" aria-label="確認發放"><h3>{pending.attempted?'核對尚未確認的發放':'確認這份鼓勵'}</h3>
              <p><strong>{pending.preview?.displayName??pending.input.username}（{pending.input.username}）</strong> · {pending.input.amount} 張{ticketName(pending.input.ticketType)}</p><p>原因：{pending.input.reason}</p>
              {!pending.attempted&&pending.preview&&<p>預覽餘額：{pending.preview.before} → {pending.preview.after} 張</p>}
              {pending.attempted&&<p>重新整理或斷線後會核對同一筆收據，避免重複發券。</p>}
              <div className="admin-actions"><button className="admin-primary" disabled={busy} onClick={grant}>{busy?'處理中…':pending.attempted?'核對並完成原發放':'確認發放'}</button>
                {!pending.attempted&&<button disabled={busy} onClick={()=>setPending(null)}>返回修改</button>}</div></div>:
              <form onSubmit={preview}><div className="admin-grant-fields"><label>發放張數<input type="number" min={1} max={session.grantLimit} step={1} required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
                <label>鼓勵原因<input maxLength={200} required value={reason} onChange={e=>setReason(e.target.value)} placeholder="例如：完成這週的學習目標"/></label></div>
                <button className="admin-primary" disabled={busy||!reason.trim()||!student.available}>預覽發放</button><p className="admin-help">每次 1–{session.grantLimit} 張。{activeType==='standard'?'依一般扭蛋機率抽取夥伴。':'星耀券：S 級 30%、A 級 70%。'}</p></form>}
          </section>}
          <section className="admin-history"><h2>最近發放紀錄</h2><p className="admin-help">可查看範圍內最近 50 筆中的此帳號紀錄；發放編號用於核對。</p>
            {receipts.filter(r=>r.username===student.username).length?receipts.filter(r=>r.username===student.username).map(r=><article key={r.grantId}><div><b>+{r.amount} 張{ticketName(r.ticketType)}</b><span>{r.createdAt?date(r.createdAt):'剛剛'}</span></div><p>{r.reason}</p><small>發放後餘額 {r.after} · {r.operator}</small><small className="admin-receipt-id">{r.grantId}</small></article>):<p className="admin-empty">目前沒有發放紀錄。</p>}
          </section></>}</>}{!student&&<p className="admin-empty">目前沒有可查看的孩子。請超級管理員在「大人帳號與權限」指定範圍。</p>}</div></div></>}</>}
    {error&&<div className="admin-message admin-error" role="alert">{error}</div>}
    {notice&&<div className="admin-message" role="status">{notice}</div>}
  </main>;
}
