import ReadAloud from './ReadAloud';
import {readyReading} from './ReadyReading';
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ReadingContext, annotateTree } from './readability';
import { TIER_NAMES, TIMING_GRACE_MS, type TieredChallenge, type TimingMode } from './tiered-challenge';
import {useQuestionAssets, type QuestionAssets} from './useQuestionAssets';
import './tiered-challenge.css';
export function ChallengePreparation({challenge,index,busy,online,onReady,onMode,onSpeak,onBack,onQuit,correct,answered,assets,runId,blocked=false}:{challenge:TieredChallenge;index:number;busy:boolean;online:boolean;onReady:()=>unknown;onMode:(mode:TimingMode)=>unknown;onSpeak:(text:string)=>void;onBack:()=>void;onQuit:()=>void;correct:number;answered:number;assets?:QuestionAssets;runId:string;blocked?:boolean}) {
 const {grade}=useContext(ReadingContext);
 const media=useQuestionAssets(assets,runId,index);
 const sending=useRef(false), mounted=useRef(true), callback=useRef(onReady);callback.current=onReady;
 const [failures,setFailures]=useState(0);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const [visible,setVisible]=useState(!document.hidden);
 useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 useEffect(()=>{
  if(index===0||media.status!=='ready'||!online||!visible||busy||blocked||sending.current||failures>=2)return;
  // Returning to the tab also refreshes cloud state; let it finish, then retry once if needed.
  const timer=setTimeout(async()=>{sending.current=true;let accepted=false;
   try{accepted=await callback.current()===true;}catch{/* Manual start stays available. */}
   finally{sending.current=false;if(mounted.current&&!accepted)setFailures(n=>n+1);}
  },failures?1500:500);
  return()=>clearTimeout(timer);
 },[index,media.status,online,visible,busy,blocked,failures]);
 const sentence=`這場有六題，要答對${challenge.requiredCorrect}題。答錯或超時三次就結束。${challenge.mode==='relaxed'?'慢慢想，不計時。':`每題先有讀題時間，再有${challenge.seconds}秒作答。`}`;
 return readyReading(<section className="f-panel challenge-preparation" aria-label="挑戰準備">
  <header className="ready-heading"><button onClick={onBack} aria-label="回到港口">⛵</button><h1>{index===0?'一起出發！':'下一題準備中'}</h1><span>{TIER_NAMES[challenge.tier]}</span></header>
  {index===0 ? <>
   <strong className="challenge-goal">共 6 題，答對 {challenge.requiredCorrect} 題獲勝</strong>
   <p className="ready-hearts"><span aria-hidden="true">❤️ ❤️ ❤️</span> 三次失誤結束</p>
   <fieldset className="challenge-modes" disabled={busy||!online}>
    <legend>選擇節奏</legend>
    <label className={challenge.mode==='relaxed'?'is-selected':''}><input type="radio" name="challenge-timing" checked={challenge.mode==='relaxed'} onChange={()=>onMode('relaxed')} /><span><b><span className="ready-mode-icon" aria-hidden="true">🌱</span>{"慢慢想"}</b><small>不計時</small></span></label>
    <label className={challenge.mode==='standard'?'is-selected':''}><input type="radio" name="challenge-timing" checked={challenge.mode==='standard'} onChange={()=>onMode('standard')} /><span><b><span className="ready-mode-icon" aria-hidden="true">⏳</span>{"限時"}</b><small>每題 {challenge.seconds} 秒</small></span></label>
   </fieldset>
  </> : <p>第 {index+1}／6 題 · 已答對 {correct} 題</p>}
  <div className="ready-help"><ReadAloud grade={grade}><button data-read-aloud className="voice-button" onClick={()=>onSpeak(sentence)}>🔊 聽玩法</button></ReadAloud>
   <details><summary>看玩法</summary><p>{sentence}</p><p>{challenge.mode==='standard'?'開始後離開畫面或重新整理，本題仍會計時。':'答對要求和獎勵都相同。'}答對的星幣會保留。</p><button disabled={busy||!online} onClick={onQuit}>結束這場</button></details>
  </div>
  {correct+6-answered<challenge.requiredCorrect&&<p role="status">這場已經無法達到目標，還可以完成剩下題目，拿答題星幣。</p>}
  <div className="ready-start-dock">
   {(!online||media.status!=='ready')&&<p role="status">{!online?'連線恢復後就能出發':media.status==='error'?'題圖未載入，請重試。還沒開始計時。':'正在準備題圖，還沒開始計時。'}</p>}
   {media.status==='error'?<button className="f-primary" disabled={!online||busy} onClick={media.retry}>↻ 重新載入題圖</button>:<button className="f-primary ready-start" disabled={busy||!online||media.status!=='ready'} onClick={()=>onReady()}>▶ {index===0?'出發！':'下一題'}</button>}
  </div>
 </section>,grade);
}
export function ChallengeTimer({challenge,serverNow,settled,busy,online,onTimeout,children,correct=0}:{challenge?:TieredChallenge;serverNow:number;settled:boolean;busy:boolean;online:boolean;onTimeout:()=>Promise<unknown>;children:ReactNode;correct?:number}) {
 const {grade}=useContext(ReadingContext);
 const anchor=useRef({server:serverNow,local:performance.now()});
 const [now,setNow]=useState(serverNow);
 const attempted=useRef(false);
 const key=challenge?.clock?.openedAt;
 useEffect(()=>{anchor.current={server:serverNow,local:performance.now()};setNow(serverNow);},[serverNow]);
 useEffect(()=>{attempted.current=false;},[key]);
 useEffect(()=>{
  if(!challenge?.clock||challenge.mode==='relaxed'||settled)return;
  const timer=setInterval(()=>setNow(anchor.current.server+performance.now()-anchor.current.local),250);
  return()=>clearInterval(timer);
 },[key,challenge?.mode,settled]);
 const clock=challenge?.clock, timed=!!clock&&challenge?.mode==='standard';
 const reading=timed&&now<clock!.answerAt;
 const left=timed?Math.max(0,Math.ceil(((reading?clock!.answerAt:clock!.deadlineAt)-now)/1000)):0;
 const expired=timed&&now>clock!.deadlineAt+TIMING_GRACE_MS&&!settled;
 useEffect(()=>{
  if(!expired||busy||!online||attempted.current)return;
  attempted.current=true;void onTimeout();
 },[expired,busy,online,onTimeout]);
 return <>
  {challenge && annotateTree(<div className={`challenge-timer ${expired?'is-expired':''}`}>
   <strong>🎯 已答對 {correct} 題 · 目標 {challenge.requiredCorrect} 題</strong>
   {settled?<span>{challenge.timeouts.includes(clock?.index??-1)?'這題超時，記一次錯誤':'這題已保存'}</span>:timed?<span role="timer" aria-live="off">{reading?'👂 讀題／聽題':'⏳ 作答'} {left} 秒{reading?' · 可以提前回答':''}</span>:<span>🌱 慢慢想 · 不計時</span>}
   {expired && <div role="status"><p>時間到了，這題記一次錯誤。{online?'正在保存結果。':'連線恢復後確認結果；已得星幣保留。'}</p><button disabled={busy||!online} onClick={()=>void onTimeout()}>確認這題結果</button></div>}
  </div>,grade)}
  <fieldset className="challenge-question-body" disabled={expired}>{children}</fieldset>
 </>;
}
