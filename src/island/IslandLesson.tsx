import { useEffect,useState } from 'react';
import type { Game } from './games';
import { playLessonBeat } from './lesson-playback';
import { Zy } from './zhuyin';
import './lesson.css';

export function IslandLesson({game,demo,voice,reduced,onContinue,onNotice}: {
  game:Game;demo:ReturnType<Game['demo']>;voice:boolean;reduced:boolean;
  onContinue:()=>void;onNotice:(text:string)=>void;
}) {
  const [step,setStep]=useState(0),[playing,setPlaying]=useState(true),[narration,setNarration]=useState(voice);
  const [finished,setFinished]=useState(false),[replay,setReplay]=useState(0);
  const at=demo.steps[step],Scene=game.Scene;
  useEffect(()=>setNarration(voice),[voice]);
  useEffect(()=>{
    if(!playing||finished)return;
    return playLessonBeat(at.say,narration,()=>{
      if(step+1<demo.steps.length)setStep(step+1);
      else {setFinished(true);setPlaying(false);}
    },onNotice);
  },[demo,step,playing,narration,finished,replay,onNotice,at.say]);
  const restart=()=>{setStep(0);setFinished(false);setPlaying(true);setReplay(n=>n+1);};
  const seek=(n:number)=>{setStep(n);setFinished(false);setPlaying(true);};
  return <div className="isl-lesson" data-paused={!playing} data-reduced={reduced}>
    <div className="isl-lesson-status"><b><Zy text="動畫教學"/></b><span><Zy text={`第 ${step+1} 步 / 共 ${demo.steps.length} 步`}/></span></div>
    <progress max={demo.steps.length} value={finished?demo.steps.length:step} aria-label={`教學步驟 ${step+1} / ${demo.steps.length}`}/>
    <div className="isl-lesson-frame" data-step={step}>
      <Scene item={demo.item} view={at.view} mode="learn" demo done={false} act={()=>{}} choose={()=>{}} eliminated={null}/>
    </div>
    <p className="isl-line isl-lesson-caption" aria-live="polite"><Zy text={at.say}/></p>
    <div className="isl-lesson-controls" aria-label="教學播放控制">
      <button disabled={step===0} onClick={()=>seek(step-1)} aria-label="上一步教學"><Zy text="上一步"/></button>
      <button className="isl-lesson-play" onClick={()=>finished?restart():setPlaying(p=>!p)}><Zy text={finished?'重播':playing?'暫停':'繼續看'}/></button>
      <button disabled={step===demo.steps.length-1} onClick={()=>seek(step+1)} aria-label="下一步教學"><Zy text="下一步"/></button>
      <button aria-pressed={narration} onClick={()=>setNarration(v=>!v)}><Zy text={narration?'語音開':'語音關'}/></button>
    </div>
    <div className="isl-actions"><button className="isl-btn ghost" onClick={restart}><Zy text="從頭看"/></button>
      <button className="isl-btn" onClick={onContinue}><Zy text={finished?'換我玩':'跳過示範'}/> ▶</button></div>
  </div>;
}
