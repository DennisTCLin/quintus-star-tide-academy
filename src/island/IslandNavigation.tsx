import { useEffect, useRef } from 'react';
import { UNIT_BY_ID } from './catalog';
import type { UnitProgress, PlayerIsland } from './engine';
import { PASS_MARK } from './engine';
import type { Mode } from './games';
import type { IslandRun } from './schema';
import { islandStageName, semesterName, type IslandDestination } from './navigation';
import { Zy } from './zhuyin';
import { IslandAbility } from './IslandAbility';
import { unitGrade } from './catalog';
import { gradeName } from './curriculum';

export function IslandIcon({name}: {name:'map'|'book'|'play'|'flag'|'back'|'sound'|'check'}) {
  const paths = {
    map:<><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z"/><path d="M9 3v16M15 5v16"/></>,
    book:<><path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Z"/><path d="M12 5v15"/></>,
    play:<><rect x="2" y="5" width="20" height="14" rx="5"/><path d="M6 12h6M9 9v6M16 10h.1M19 14h.1"/></>,
    flag:<><path d="M5 21V3M5 3h14l-3 5 3 5H5"/></>,
    back:<><path d="m10 5-7 7 7 7M3 12h18"/></>,
    sound:<><path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/></>,
    check:<path d="m4 12 5 5L20 6"/>,
  };
  return <svg className="isl-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function IslandSteps({mode,progress}: {mode:Mode;progress:UnitProgress}) {
  if(mode==='mock') return <p className="isl-stage-current"><IslandIcon name="flag"/><Zy text="島主大挑戰"/></p>;
  return <ol className="isl-journey-steps" aria-label="三關學習路線">
    {(['learn','play','boss'] as const).map((stage,i)=>{
      const done=stage==='boss'?(progress.boss??0)>=PASS_MARK:!!progress[stage];
      return <li key={stage} aria-current={stage===mode?'step':undefined} className={`${stage===mode?'current':''} ${done?'complete':''}`}>
        <span className="isl-step-number">{done&&stage!==mode?<IslandIcon name="check"/>:i+1}</span>
        <Zy text={stage==='boss'?'挑戰':islandStageName(stage)}/>{stage==='boss'&&<span className="isl-sr-only">神獸</span>}
        {done&&<span className="isl-sr-only">，已完成</span>}
      </li>;
    })}
  </ol>;
}

export function IslandJourney({unit,grade=unitGrade(unit),mode,progress,abilityProgress,position,coins,busy,onMap}: {
  unit?:string;grade?:number;mode:Mode;progress:UnitProgress;abilityProgress?:PlayerIsland;
  position:{number:number;completed:number;total:number;label:string};coins:number;busy:boolean;onMap:()=>void;
}) {
  const u=unit?UNIT_BY_ID[unit]:undefined;
  const header=useRef<HTMLElement>(null);
  useEffect(()=>{
    const el=header.current,root=el?.closest<HTMLElement>('#math-island');
    if(!el||!root) return;
    const update=()=>root.style.setProperty('--isl-sticky-offset',`${el.getBoundingClientRect().height+24}px`);
    update();const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(update);observer?.observe(el);
    return ()=>{observer?.disconnect();root.style.removeProperty('--isl-sticky-offset');};
  },[]);
  return <header ref={header} className="isl-journey" aria-label="我在哪裡與這一關的進度">
    <div className="isl-journey-location">
      <div><p className="isl-journey-chapter">{u?<><Zy text={gradeName(unitGrade(unit))}/><Zy text={semesterName(unit)}/><Zy text={`第 ${u.n} 單元`}/></>:<><Zy text={gradeName(grade as 1|2|3|4|5|6)}/><Zy text="全學年複習"/></>}</p>
        <h2><Zy text={u?.title??'島主大挑戰'}/></h2>
        {u&&<p className="isl-journey-place"><Zy text={u.place}/></p>}
      </div>
      <button className="isl-change-island" disabled={busy} onClick={onMap}><IslandIcon name="map"/><Zy text="換小島"/></button>
    </div>
    <IslandSteps mode={mode} progress={progress}/>
    <div className="isl-question-status" role="status">
      <b><Zy text={position.label}/></b><span className="isl-earned"><span aria-hidden="true">●</span> {coins} <Zy text="星幣"/></span>
    </div>
    <progress className="isl-question-progress" max={position.total} value={position.completed} aria-label={`本關已完成 ${position.completed} / ${position.total} 題`}/>
    {unit&&abilityProgress&&<IslandAbility progress={abilityProgress} unit={unit} compact/>}
  </header>;
}

export function IslandSwitchDialog({current,target,busy,onCancel,onConfirm,onSpeak}: {
  current:IslandRun;target:IslandDestination;busy:boolean;onCancel:()=>void;onConfirm:()=>void;onSpeak:(text:string)=>void;
}) {
  const ref=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
  const sameUnit=current.unit===target.unit;
  const from=current.unit?UNIT_BY_ID[current.unit]:undefined,to=target.unit?UNIT_BY_ID[target.unit]:undefined;
  const explanation='換島後，這一關要重玩。星幣和過關紀錄會留下。';
  useEffect(()=>{
    const el=ref.current,previous=document.activeElement;
    if(!el) return;
    el.showModal();cancel.current?.focus();
    return ()=>{el.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};
  },[]);
  return <dialog ref={ref} className="isl-switch-dialog" aria-labelledby="isl-switch-title" aria-describedby="isl-switch-note" aria-busy={busy}
    onCancel={e=>{e.preventDefault();if(!busy)onCancel();}}
    onKeyDown={e=>{
      if(e.key!=='Tab') return;
      const buttons=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
      const first=buttons[0],last=buttons.at(-1);
      if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    }}>
    <div className="isl-switch-heading"><IslandIcon name="map"/><h2 id="isl-switch-title"><Zy text={sameUnit?'換這關嗎？':'換小島嗎？'}/></h2></div>
    <div className="isl-switch-route">
      <div><small className="isl-switch-caption"><Zy text={from?`現在・${semesterName(from.id)}`:'現在・全學年'}/>{from&&<Zy text={`第 ${from.n} 單元`}/>}</small><b><Zy text={from?.title??'島主大挑戰'}/></b><span><Zy text={`${islandStageName(current.mode)}・已完成 ${current.answers.length} / ${current.items.length} 題`}/></span></div>
      <span className="isl-switch-arrow" aria-hidden="true">↓</span>
      <div className="destination"><small className="isl-switch-caption"><Zy text={to?`下一站・${semesterName(to.id)}`:'下一站・全學年'}/>{to&&<Zy text={`第 ${to.n} 單元`}/>}</small><b><Zy text={to?.title??'島主大挑戰'}/></b><span><Zy text={islandStageName(target.mode)}/></span></div>
    </div>
    <p id="isl-switch-note"><Zy text={explanation}/></p>
    <button className="isl-dialog-listen" onClick={()=>onSpeak(explanation)}><IslandIcon name="sound"/><Zy text="聽說明"/></button>
    <div className="isl-switch-actions">
      <button ref={cancel} className="isl-btn ghost" disabled={busy} onClick={onCancel}><Zy text="先不要"/></button>
      <button className="isl-btn" disabled={busy} onClick={onConfirm}><Zy text={busy?'等一下…':sameUnit?'換這關':'換小島'}/></button>
    </div>
  </dialog>;
}
