import {useEffect,useRef,useState} from 'react';
import type {Monster} from './monsters';
import {useStageVisibility} from './useStageVisibility';
import './monster-motion.css';
import {monsterMotionSource,type MonsterAction} from './monster-motion-policy';
export {hasMonsterMotion} from './monster-motion-policy';
export type {MonsterAction} from './monster-motion-policy';

// RGB and its foreground mask share one H.264 frame (left/right), so iPad
// WebKit needs neither alpha-video support nor synchronization of two players.
export function applyMonsterMatte(color:Uint8ClampedArray,mask:Uint8ClampedArray){
 for(let i=0;i<color.length;i+=4)color[i+3]=Math.round(Math.max(0,Math.min(1,(mask[i]-8)/239))*255);
}
export default function MonsterMotion({monster,action='idle',nonce=0,reduced=false,original=false}: {
 monster:Monster;action?:MonsterAction;nonce?:number;reduced?:boolean;original?:boolean;
}){
 const {stageRef,visible}=useStageVisibility();
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const [playing,setPlaying]=useState<MonsterAction>(action==='idle'?'entrance':action);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[systemReduced,setSystemReduced]=useState(false);
 const [retry,setRetry]=useState(0);const previousNonce=useRef(nonce);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setSystemReduced(media.matches);update();media.addEventListener?.('change',update);return()=>media.removeEventListener?.('change',update);},[]);
 useEffect(()=>{if(action!=='idle'||previousNonce.current!==nonce){setPlaying(action);setRetry(x=>x+1);}previousNonce.current=nonce;},[action,nonce]);
 const active=visible&&!reduced&&!systemReduced;
 const sourceAction=original?playing:monsterMotionSource(monster.id,playing);
 const backup=sourceAction!==playing;
 const src=`/assets/monsters/wave4/${monster.id}-${sourceAction}.mp4?v=alpha1`;
 useEffect(()=>{
  const movie=video.current,surface=canvas.current;if(!movie||!surface||!active)return;
  let disposed=false,raf=0,last=-Infinity,frameTime=-1;setReady(false);setFailed(false);
  const ctx=surface.getContext('2d',{willReadFrequently:true});
  const matte=document.createElement('canvas');matte.width=matte.height=384;
  const maskContext=matte.getContext('2d',{willReadFrequently:true});
  if(!ctx||!maskContext){setFailed(true);return;}
  const paint=(time:number)=>{
   if(disposed)return;
   if(movie.readyState>=2&&time-last>=1000/12&&movie.currentTime!==frameTime){
    last=time;frameTime=movie.currentTime;
    try{if(movie.videoWidth!==movie.videoHeight*2){setFailed(true);return;}const size=movie.videoHeight;ctx.drawImage(movie,0,0,size,size,0,0,384,384);maskContext.drawImage(movie,size,0,size,size,0,0,384,384);const frame=ctx.getImageData(0,0,384,384);applyMonsterMatte(frame.data,maskContext.getImageData(0,0,384,384).data);ctx.putImageData(frame,0,0);setReady(true);}
    catch{setFailed(true);return;}
   }
   raf=requestAnimationFrame(paint);
  };
  movie.muted=true;movie.currentTime=0;
  const play=()=>{void movie.play().catch(()=>{if(!disposed)setFailed(true);});};
  movie.addEventListener('canplay',play);play();raf=requestAnimationFrame(paint);
  return()=>{disposed=true;cancelAnimationFrame(raf);movie.removeEventListener('canplay',play);movie.pause();};
 },[active,src,retry,playing]);
 return <div ref={stageRef} className="monster-art monster-motion" role="img" aria-label={monster.name} data-monster-action={playing} data-source-action={sourceAction} data-motion-backup={backup} data-motion-ready={active&&ready&&!failed}>
  <img src={monster.image} alt="" draggable={false} style={{visibility:active&&ready&&!failed?'hidden':'visible'}}/>
  {active&&<><video ref={video} src={src} muted playsInline autoPlay preload="auto" loop={playing==='idle'} aria-hidden="true" onError={()=>setFailed(true)} onEnded={()=>setPlaying('idle')}/><canvas ref={canvas} width={384} height={384} aria-hidden="true" style={{visibility:ready&&!failed?'visible':'hidden'}}/></>}
  {active&&failed&&<button type="button" className="monster-motion-retry" aria-label={`播放${monster.name}的動畫`} onClick={()=>setRetry(x=>x+1)}>▶</button>}
 </div>;
}
