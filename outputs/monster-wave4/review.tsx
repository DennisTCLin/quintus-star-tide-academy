import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import MonsterMotion,{type MonsterAction} from '/src/MonsterMotion';
import {MONSTER_CATALOG} from '/src/monsters';
const actions:MonsterAction[]=['entrance','idle','attack','hit','capture'];
type Manifest={productionRelease?:{releasedCreatures:number};completedVideoFiles:number;authorizedVideos:number;activeAnimatedCreatures:number;items:Array<{id:string;videos?:Array<{action:string}>}>};
function Review(){
 const [action,setAction]=useState<MonsterAction>(()=>{const a=new URLSearchParams(location.search).get('action');return actions.includes(a as MonsterAction)?a as MonsterAction:'entrance'}),[nonce,setNonce]=useState(0),[manifest,setManifest]=useState<Manifest|null>(null);
 const forceMotion=new URLSearchParams(location.search).get('qa')==='1';
 const ids=new URLSearchParams(location.search).get('ids')?.split(',').map(Number)??[81];
 const monsters=MONSTER_CATALOG.filter(m=>ids.includes(m.number));
 useEffect(()=>{let alive=true;const refresh=()=>{fetch('/docs/monster-wave4-media.json',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(alive)setManifest(d)}).catch(()=>{});};refresh();const timer=setInterval(refresh,30000);return()=>{alive=false;clearInterval(timer);};},[]);
 const available=(id:string)=>manifest?.items.find(m=>m.id===id)?.videos??[];
 return <><style>{`body{background:#092334;color:#e5faff;font-family:system-ui;margin:24px}nav{position:sticky;top:0;z-index:20;background:#092334;padding-bottom:10px}button,select{padding:13px;margin:5px;font-size:18px;border-radius:12px}button[aria-pressed=true]{background:#8be7de;color:#092334}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}article{max-width:540px;border:1px solid #5b8695;padding:16px;border-radius:18px}section{aspect-ratio:1;background:linear-gradient(135deg,#143c4c,#092334)}section>img{width:100%;height:100%;object-fit:contain}h2{font-size:24px}.status{color:#b3ced8}select{max-width:100%}@media(max-width:500px){body{margin:12px}button{padding:10px;font-size:16px}}`}</style>
 <h1>巨型魔王與機械怪獸 · 50 種</h1><p className="status">本機製作預覽 · 已處理 {manifest?.completedVideoFiles??'…'}／{manifest?.authorizedVideos??150} 段動畫 · {manifest?.productionRelease?`正式已開放 ${manifest.productionRelease.releasedCreatures} 隻（待修動作用安全備援）`:'尚未發布'}</p>
 <nav><label>選擇角色 <select aria-label="選擇角色" value={ids.length===1?ids[0]:''} onChange={e=>{location.search=`?ids=${e.target.value}`}}><option value="" disabled>同時檢查多個角色</option>{MONSTER_CATALOG.filter(m=>m.id.startsWith('wave4-')).map(m=><option key={m.id} value={m.number}>{m.name} · {available(m.id).length}/5</option>)}</select></label><div>{actions.map((a,i)=><button key={a} aria-pressed={action===a} onClick={()=>{setAction(a);setNonce(n=>n+1)}}>{['登場','待機','攻擊','受擊','降服'][i]}</button>)}</div></nav>
 <main>{monsters.map(m=><article key={m.id}><h2>{m.name}</h2><section>{forceMotion||!manifest||available(m.id).some(v=>v.action===action)?<MonsterMotion monster={m} action={action} nonce={nonce} original={forceMotion||new URLSearchParams(location.search).get('original')==='1'}/>:<img src={m.image} alt={m.name}/>}</section><p>{m.feature}</p>{manifest&&!available(m.id).some(v=>v.action===action)&&<p className="status">{m.number>80+(manifest?.activeAnimatedCreatures??30)?'這隻的動畫暫緩，先顯示角色原圖。':'這個動作仍在製作，先顯示角色原圖。'}</p>}</article>)}</main></>;
}
createRoot(document.getElementById('root')!).render(<Review/>);
