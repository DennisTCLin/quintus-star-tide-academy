import { sayThen } from './speech';

/** Advance only when both the spoken sentence and the visible motion have had time to finish. */
export function playLessonBeat(text:string,voice:boolean,done:()=>void,onError:(text:string)=>void) {
  let stopped=false,speechDone=false,motionDone=false;
  const finish=()=>{if(!stopped&&speechDone&&motionDone){stopped=true;done();}};
  const duration=Math.max(900,text.replace(/[\s，。！？、]/g,'').length*(voice?220:260));
  const timer=setTimeout(()=>{motionDone=true;finish();},duration);
  const stop=sayThen(text,()=>{speechDone=true;finish();},voice,onError);
  return ()=>{stopped=true;clearTimeout(timer);stop();};
}
