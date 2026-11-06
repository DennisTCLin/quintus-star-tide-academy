import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import CharacterPortrait from '../../src/CharacterPortrait';
import BattlePetPicker from '../../src/BattlePetPicker';
import ConquestEnrollment from '../../src/ConquestEnrollment';
import ConquestLogistics from '../../src/ConquestLogistics';
import {ROSTER} from '../../src/game-view';
import {CONQUEST_HEROES,companionById} from '../../src/conquest-characters';
import {createConquest,act} from '../../src/conquest';
import ConquestGame from '../../src/ConquestGame';
import type {PortraitPose} from '../../src/character-motion';
import '../../src/styles.css';
import '../../src/conquest.css';
import {newFamily,startRun,answerRun,nextQuestion} from '../../src/adventure';
import {questionById} from '../../src/learning';
import {answerCapture} from '../../src/capture-trial';
import QuizEncounter from '../../src/QuizEncounter';
import TrainingPanel from '../../src/TrainingPanel';
import GachaMachine from '../../src/GachaMachine';
import RoomEditor from '../../src/RoomEditor';
import {freshHomeDecor} from '../../src/home-decoration';
import IslandApp from '../../src/island/IslandApp';
import {emptyPlayer} from '../../src/island/engine';
import MonsterMotion from '../../src/MonsterMotion';
import {MonsterArt} from '../../src/MonsterBestiary';
import {MONSTER_CATALOG} from '../../src/monsters';
import '../../src/home-decoration.css';
const seeded=newFamily().profiles.quintus;
seeded.owned=Object.fromEntries(ROSTER.slice(0,8).map(p=>[p.id,1]));seeded.equipped=ROSTER[0].id;seeded.tickets=10;
seeded.homeDecor=freshHomeDecor();
seeded.lastDraw={id:'local-motion-result',pet:ROSTER[2].id,duplicate:false,copies:1};
const captureFamily=newFamily(),captureDay='2026-11-05';
startRun(captureFamily,'doudou','math','local-capture-motion',2,false,captureDay);
const captureProfile=captureFamily.profiles.doudou,captureRun=captureProfile.run!;
for(let i=0;i<6;i++){answerRun(captureFamily,'doudou',captureRun.id,i,questionById(captureRun.questions[i])!.answer,captureDay,0);if(i<5)nextQuestion(captureFamily,'doudou',captureRun.id,i);}
for(let i=0;i<3;i++){const trial=captureRun.capture!.trial!;answerCapture(captureFamily,'doudou','voyage',captureRun.id,i,questionById(trial.questions[i])!.answer,captureDay);}
const poses:PortraitPose[]=['idle','selected','greet','reveal','victory','rest','defeated','locked','attack','hit'];
const roster=['sailskipper','seasprout','kelpcub'].map(id=>companionById(id)!);
const state=createConquest();state.units=Object.fromEntries(roster.map((c,i)=>[c.id,{id:c.id,element:c.element,level:c.level,maxHp:100,hp:[0,15,65][i]}]));
const expedition=createConquest();expedition.enrollment={allianceId:'light',heroId:'hero-elf',joinedAt:Date.now()};
function MotionTrace(){const[trace,setTrace]=useState<string[]>([]);useEffect(()=>{const observer=new MutationObserver(()=>{const seen=[...document.querySelectorAll<HTMLImageElement>('.cq-battle-unit img')].map(e=>`${e.dataset.characterId}:${e.dataset.characterPose}`);setTrace(old=>{const next=[...new Set([...old,...seen])];return next.length===old.length?old:next;});});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-character-pose']});return()=>observer.disconnect();},[]);return <details><summary>戰鬥動畫觀測</summary><output id="motion-trace">{trace.join(' / ')}</output></details>}
function MotionPerformance(){const[nonce,start]=useState(0),[result,setResult]=useState<object|null>(null);useEffect(()=>{if(!nonce)return;let raf=0,last=0;const deltas:number[]=[];const frame=(now:number)=>{if(last)deltas.push(now-last);last=now;if(deltas.length<180){raf=requestAnimationFrame(frame);return;}const ordered=[...deltas].sort((a,b)=>a-b);const images=[...document.querySelectorAll<HTMLImageElement>('.character-portrait')];setResult({viewport:[innerWidth,innerHeight],sampleFrames:deltas.length,meanFrameMs:deltas.reduce((a,b)=>a+b,0)/deltas.length,p95FrameMs:ordered[Math.floor(ordered.length*.95)],maxFrameMs:ordered[ordered.length-1],framesOver50ms:deltas.filter(d=>d>50).length,portraitCount:images.length,visibleActive:images.filter(e=>e.dataset.characterActive==='true').length,animationEnabled:images.filter(e=>getComputedStyle(e).animationName!=='none'&&getComputedStyle(e).animationPlayState==='running').length,horizontalOverflow:document.documentElement.scrollWidth>innerWidth});};setResult(null);raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);},[nonce]);return <details><summary>本機效能觀測</summary><button onClick={()=>start(n=>n+1)}>量測 180 幀</button><output id="motion-performance">{result?JSON.stringify(result):'尚未量測或量測中'}</output></details>}
function Preview(){const[screen,setScreen]=useState('選角'),[selected,pick]=useState<string[]>([]),[reduced,reduce]=useState(false),[paused,pause]=useState(false),[nonce,replay]=useState(0),[profile,setProfile]=useState(seeded),[cq,setCq]=useState(expedition);
return <main className={`family-app ${reduced?'reduce-motion':''}`} style={{maxWidth:1100,margin:'auto',padding:12}}><h1>角色介面動畫驗收</h1><p>本機展示資料 · 不連線玩家帳號</p><nav style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:18}}>{['選角','英雄','休養','狀態','全名單','載入測試','陪練','抽獎','房間','數學島','圖鑑','群島','影片備援','招募結果'].map(s=><button key={s} onClick={()=>setScreen(s)} aria-pressed={screen===s}>{s}</button>)}<button aria-pressed={reduced} onClick={()=>reduce(!reduced)}>減少動態</button><button aria-pressed={paused} onClick={()=>pause(!paused)}>暫停展示</button><button onClick={()=>replay(nonce+1)}>重播反應</button></nav><MotionTrace/><MotionPerformance/>
{screen==='選角'&&<BattlePetPicker pets={ROSTER.slice(0,24)} selected={selected} onSelect={id=>pick(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id])}/>}
{screen==='英雄'&&<ConquestEnrollment error="" veteran={false} onBackup={()=>{}} onJoin={async()=>{}}/>}
{screen==='休養'&&<ConquestLogistics reduced={reduced} state={state} roster={roster} player="local-motion-fixture" busy={false} dispatch={()=>{}}/>}
{screen==='招募結果'&&<QuizEncounter summaryOnly run={captureRun} xp={captureProfile.growth.xp[captureRun.companion]??0} reduced={reduced} profile={captureProfile} day={captureDay} busy={false} online onRecruit={async()=>{}}/>}
{screen==='影片備援'&&<div style={{width:280,height:280}}><MonsterMotion monster={{...MONSTER_CATALOG[0],id:'fixture-video-unavailable'}} action="entrance" nonce={nonce} reduced={reduced}/></div>}
{screen==='群島'&&<ConquestGame player="local-motion" players={[{id:'local-motion',name:'本機測試'}]} sessions={{'local-motion':cq}} owned={profile.owned} growthXp={profile.growth.xp} equipped={profile.equipped} onLearn={()=>{}} reduced={reduced} onAct={async(action,party)=>{const next=act(cq,'local-motion',action,party,Date.now());setCq(next);return next;}}/>}
{screen==='陪練'&&<TrainingPanel profile={profile} day="2026-11-05" online busy={false} onSelect={async id=>{setProfile({...profile,equipped:id});return true;}} onTrain={()=>{}}/>}
{screen==='抽獎'&&<GachaMachine profile={profile} day="2026-11-05" online busy={false} reduced={reduced} onDraw={async()=>undefined} onEquip={async()=>{}} onLearn={()=>{}} onCollection={()=>{}} onTrade={()=>{}} onSpeak={()=>{}} musicControl={null}/>}
{screen==='房間'&&<RoomEditor profile={profile} online busy={false} reduced={reduced} onAction={async()=>undefined} onBack={()=>{}} onTrain={()=>{}} onDirtyChange={()=>{}}/>}
{screen==='數學島'&&<IslandApp player={{id:'local-motion',name:'本機測試'}} companion={{name:ROSTER[0].name,image:ROSTER[0].image,skill:'focus',skillName:'專心',skillIcon:'✦'}} embed={{voice:false,reduced,online:true,day:'2026-11-05',progress:emptyPlayer(),onStart:async()=>undefined,onAnswer:async()=>undefined,onHelp:async()=>undefined,onRound:async()=>undefined,onQuit:async()=>true,onExit:()=>{}}}/>}
{screen==='圖鑑'&&<div className="fixture-grid">{MONSTER_CATALOG.slice(0,8).map(monster=><figure key={monster.id}><MonsterArt monster={monster} reduced={reduced} action="entrance" nonce={nonce}/><figcaption>{monster.name}</figcaption></figure>)}</div>}
{screen==='載入測試'&&<div className="fixture-grid"><figure><CharacterPortrait key={nonce} characterId="hero-elf" src={`/fixture-delayed.webp?n=${Date.now()}`} pose="reveal" alt="延遲載入角色"/><figcaption>載入完成才播放登場</figcaption></figure></div>}
{screen==='狀態'&&<div className="fixture-grid">{poses.map(p=><figure key={p+nonce}><CharacterPortrait characterId="hero-necromancer" src={CONQUEST_HEROES[0].image} pose={p} paused={paused} alt={p}/><figcaption>{p}</figcaption></figure>)}</div>}
{screen==='全名單'&&<div className="fixture-grid">{[...CONQUEST_HEROES,...ROSTER].map(p=><figure key={p.id}><CharacterPortrait characterId={p.id} src={p.image} alt={p.name} paused={paused} loading="lazy"/><figcaption>{p.name}</figcaption></figure>)}</div>}
<style>{`#motion-performance{display:block;overflow-wrap:anywhere;font-size:12px;line-height:1.5}.fixture-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px}.fixture-grid figure{margin:0;padding:10px;background:#153346;border-radius:18px}.fixture-grid img{width:100%;height:140px;object-fit:contain}.fixture-grid figcaption{text-align:center}body{margin:0;background:#081e2a;color:#e5faf8}nav button{padding:10px}main>h1{color:#e5faf8}main>nav button{background:#16384b;color:#e5faf8;border:1px solid #52808d;border-radius:10px}main>nav button[aria-pressed=true]{border-color:#98f0d5}`}</style></main>}
const root=createRoot(document.getElementById('root')!);root.render(<React.StrictMode><Preview/></React.StrictMode>);if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
