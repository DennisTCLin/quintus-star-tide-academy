import {MonsterArt} from "./MonsterBestiary";
import { useEffect, useRef, useState } from 'react';
import type { CaptureOutcome } from './creature-rules';
import type { PublicQuestion } from './cloud';
import { monsterById } from './monsters';
import ChoiceView from './ChoiceView';
import {stopVoice} from './voice';
import {annotateTree} from './readability';
import {allowsReadAloud} from './ReadAloud';
import './capture-challenge.css';
export default function CaptureChallenge({capture,question,busy,online,reduced=false,onAnswer,onSkip,onClose,onListen}: {
 capture:CaptureOutcome;question?:PublicQuestion;busy:boolean;online:boolean;reduced?:boolean;
 onAnswer:(index:number,choice:number)=>Promise<unknown>;onSkip:()=>Promise<unknown>;onClose:()=>void;
 onListen:(q:PublicQuestion,done:()=>void)=>void;
}) {
 const monster=monsterById(capture.monster),trial=capture.trial!;
 const active=capture.outcome==='pending',index=trial.answers.length;
 const [heard,setHeard]=useState(''),[confirmSkip,setConfirmSkip]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 const lock=useRef(false),title=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const opener=document.activeElement as HTMLElement|null;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;opener?.isConnected&&opener.focus();};},[]);
 useEffect(()=>{stopVoice();title.current?.focus();return()=>stopVoice();},[index,active]);
 if(!monster)return null;
 const joined=capture.outcome==='joined'||capture.outcome==='duplicate';
 return annotateTree(<div ref={root} className="capture-overlay" onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();onClose();}if(event.key==="Tab"){const targets=[...root.current!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];const first=targets[0],last=targets.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===title.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}} role="dialog" aria-modal="true" aria-labelledby="capture-title">
  <section className="capture-challenge">
   <header><span>戰鬥獎勵已保留</span><button onClick={onClose}>{active?'稍後繼續':'完成'}</button></header>
   <div className="capture-portrait"><MonsterArt monster={monster} eager action={joined?"capture":"idle"} reduced={reduced}/></div>
   <h2 id="capture-title" ref={title} tabIndex={-1}>{active?`降服挑戰 ${index+1}／3`:joined?`${monster.name}加入了！`:'本次降服結束'}</h2>
   <p className="capture-progress" aria-label={`已連續答對 ${trial.answers.filter(a=>a.correct).length} 題`}>{[0,1,2].map(i=><span key={i} className={trial.answers[i]?.correct?'filled':''}>{trial.answers[i]?.correct?'★':'☆'}</span>)}</p>
   {active?<>
    <p>再連續答對三題，就能邀請{monster.name}成為夥伴。答錯一題，這次降服就會結束。</p>
    <small>{trial.grade} 年級 · 本階段不另發星幣或完成獎勵</small>
    {question?<>
     <div className="capture-prompt"><h3>{question.prompt}</h3>{(allowsReadAloud(trial.grade)||!!question.audio)&&<button aria-label={question.audio?'播放題目音檔':'聽題目'} disabled={busy||!online} onClick={()=>onListen(question,()=>setHeard(question.id))}>{question.audio?'播放題目音檔':'🔊 聽題目'}</button>}</div>
     {question.image&&<img className="capture-question-image" src={question.image} alt="題目圖片"/>}
     <div className="capture-answers">{question.options.map((o,i)=><button key={i} disabled={busy||!online||!!question.audio&&heard!==question.id} onClick={async()=>{if(lock.current)return;lock.current=true;try{await onAnswer(index,i);}finally{lock.current=false;}}}>
      <ChoiceView choice={o} grade={trial.grade} hideReadingHints={question.hideReadingHints} pictureOnly={trial.grade===1&&question.course==='words'}/>

     </button>)}</div>
     {!!question.audio&&heard!==question.id&&<p>先聽題目，再選答案。</p>}
    </>:<p role="status">正在同步降服題目…</p>}
    {!online&&<p role="alert">目前未連線，進度已保留。連線後再繼續。</p>}
    {confirmSkip?<div className="capture-exit"><p>放棄後，這趟無法再次降服；戰鬥獎勵仍保留。</p><button disabled={busy||!online} onClick={()=>void onSkip()}>確定放棄這次降服</button><button onClick={()=>setConfirmSkip(false)}>繼續挑戰</button></div>:<button className="capture-skip" disabled={busy} onClick={()=>setConfirmSkip(true)}>放棄這次降服</button>}
   </>:<><p>{joined?'三題全對，降服成功！夥伴卡已存到雲端。':capture.outcome==='unavailable'?'夥伴卡已達持有上限，三題全對與戰鬥獎勵都已保留。':trial.skipped?'你已放棄這次降服，戰鬥獎勵仍保留。':'這題沒有答對，這次未能降服。戰鬥獎勵仍保留，下次再挑戰。'}</p>{!joined&&!trial.skipped&&question?.explanation&&<p>{question.explanation}</p>}<button className="f-primary" onClick={onClose}>繼續冒險</button></>}
  </section>
 </div>,trial.grade);
}
