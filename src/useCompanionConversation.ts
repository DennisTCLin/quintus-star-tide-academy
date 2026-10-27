import { clientId as createClientId } from "./client-id";
import { useEffect, useRef, useState } from 'react';
import { beginVoiceSession, stopVoice } from './voice';
import { CompanionRecorder, encodeRecording } from './companion-recorder';
import { prepareCompanionAudio } from './companion-audio';
export type VoiceTurn = {id:string;user:string;reply:string;source:'ai'|'guided';at:number};
type Conversation = {revision:number;history:VoiceTurn[];available:boolean};
type Status = 'idle'|'permission'|'recording'|'thinking'|'loading-audio'|'speaking';
type Props = {player:string;csrf:string;online:boolean;enabled:boolean};
class ConversationError extends Error {constructor(message:string,public status:number){super(message);}}
export function useCompanionConversation(props:Props) {
  const [state,setState]=useState<Conversation>({revision:0,history:[],available:false});
  const [playbackFailed,setPlaybackFailed]=useState(false);
  const [loaded,setLoaded]=useState(false),[status,setStatus]=useState<Status>('idle'),[error,setError]=useState(''),[seconds,setSeconds]=useState(0);
  const alive=useRef(false),epoch=useRef(0),statusRef=useRef<Status>('idle'),saved=useRef(state);
  const recorder=useRef<CompanionRecorder>(),request=useRef<AbortController>(),audio=useRef<AudioContext>(),source=useRef<AudioBufferSourceNode>();
  const lease=useRef<ReturnType<typeof beginVoiceSession>>(),clock=useRef<ReturnType<typeof setInterval>>();
  const cached=useRef<{id:string;buffer:AudioBuffer}>(),pending=useRef<Record<string,unknown>>();
  function phase(next:Status){statusRef.current=next;if(alive.current)setStatus(next);}
  function stop(){if(alive.current)setPlaybackFailed(false);epoch.current++;request.current?.abort();request.current=undefined;recorder.current?.cancel();recorder.current=undefined;clearInterval(clock.current);source.current?.stop();source.current=undefined;lease.current?.finish();lease.current=undefined;phase('idle');}
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;stop();void audio.current?.close();};},[]);
  useEffect(()=>{
    stop();cached.current=undefined;pending.current=undefined;setState({revision:0,history:[],available:false});setLoaded(false);setError('');
    if(props.enabled)void read();
    return stop;
  },[props.player,props.csrf,props.enabled]);
  useEffect(()=>{const hide=()=>{if(document.hidden){stop();setError('剛剛先休息了。回來後可以再按說話。');}};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
  async function call(path:string,body?:unknown){
    const controller=new AbortController();request.current=controller;const timer=setTimeout(()=>controller.abort(),80000);
    try{
      const response=await fetch('/api/companion-talk'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json','X-CSRF-Token':props.csrf}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal});
      const data=await response.json();if(!response.ok)throw new ConversationError(data.error||'連線暫時中斷，請再試一次。',response.status);return data;
    } finally {clearTimeout(timer);if(request.current===controller)request.current=undefined;}
  }
  function accept(next:Conversation){saved.current=next;setState(next);setLoaded(true);}
  async function read(){const seq=epoch.current;try{const next=await call('?player='+encodeURIComponent(props.player));if(alive.current&&seq===epoch.current){accept(next);pending.current=undefined;setError('');}}catch{if(alive.current&&seq===epoch.current)setError('還沒連上學伴，請按重新連線。');}}
  function unlock(){
    try{const prepared=prepareCompanionAudio(audio.current);audio.current=prepared.context;return prepared.ready;}catch{return Promise.resolve(false);}
  }
  async function play(turn:VoiceTurn){
    stop();stopVoice();const playbackReady=unlock();const seq=epoch.current;setError('');phase('loading-audio');
    try{
      if(!audio.current)throw new Error('playback');
      let buffer=cached.current?.id===turn.id?cached.current.buffer:undefined;
      if(!buffer){const result=await call('/speech',{id:turn.id,player:props.player,revision:saved.current.revision});if(seq!==epoch.current||!alive.current)return;
        const bytes=Uint8Array.from(atob(result.audio),(c)=>c.charCodeAt(0));buffer=await audio.current.decodeAudioData(bytes.buffer);cached.current={id:turn.id,buffer};}
      if(seq!==epoch.current||!alive.current)return;
      // Resume is requested from the original tap. If iOS interrupted it, ask for another tap.
      if(!await playbackReady || audio.current.state!=='running')throw new Error('gesture');
      if(seq!==epoch.current||!alive.current)return;
      const node=audio.current.createBufferSource();node.buffer=buffer;node.connect(audio.current.destination);source.current=node;
      lease.current=beginVoiceSession(()=>{node.onended=null;node.stop();source.current=undefined;phase('idle');});
      node.onended=()=>{if(seq===epoch.current&&alive.current){lease.current?.finish();lease.current=undefined;source.current=undefined;phase('idle');}};
      node.start();phase('speaking');
    }catch(e){if(seq===epoch.current&&alive.current){phase('idle');setPlaybackFailed(!(e instanceof ConversationError) || e.status >= 500 || e.status === 429);setError(e instanceof ConversationError?e.message:'按一下「再聽一次」，就能聽到我的聲音。');}}
  }
  async function send(body:Record<string,unknown>){
    const seq=epoch.current;phase('thinking');setError('');pending.current=body;
    try{const next:Conversation=await call('',body);if(!alive.current||seq!==epoch.current)return;pending.current=undefined;accept(next);phase('idle');const last=next.history[next.history.length - 1];if(last)void play(last);}
    catch(e){if(!alive.current||seq!==epoch.current)return;phase('idle');if(e instanceof ConversationError&&e.status===409){pending.current=undefined;await read();setError('對話已更新，已接上最新內容。');}else setError(e instanceof ConversationError?e.message:'這句還沒確認送到。可以重試，或重新連線讀取對話。');}
  }
  function start(){
    if(!loaded||!state.available||!props.online||!['idle','speaking'].includes(statusRef.current))return;
    stop();stopVoice();unlock();pending.current=undefined;setError('');setSeconds(0);phase('permission');const seq=epoch.current;
    const capture=new CompanionRecorder(()=>{if(seq!==epoch.current)return;phase('recording');clock.current=setInterval(()=>setSeconds(s=>s+1),1000);},blob=>{
      clearInterval(clock.current);lease.current?.finish();lease.current=undefined;recorder.current=undefined;
      if(seq!==epoch.current||!alive.current)return;phase('thinking');
      void encodeRecording(blob).then(encoded=>{if(seq===epoch.current&&alive.current)void send({id:createClientId(),player:props.player,revision:saved.current.revision,audio:encoded,mime:blob.type});}).catch(()=>{if(seq===epoch.current&&alive.current){phase('idle');setError('這次錄音沒有完成，請再試一次。');}});
    },message=>{clearInterval(clock.current);lease.current?.finish();lease.current=undefined;if(seq===epoch.current&&alive.current){phase('idle');setError(message);}});
    recorder.current=capture;
    lease.current=beginVoiceSession(()=>{capture.cancel();clearInterval(clock.current);phase('idle');});
    void capture.start();
  }
  function finish(){unlock();recorder.current?.stop();clearInterval(clock.current);}
  function type(text:string){if(!text.trim()||!loaded||!state.available||!props.online||statusRef.current!=='idle')return;stop();stopVoice();unlock();void send({id:createClientId(),player:props.player,revision:saved.current.revision,text:text.trim()});}
  async function reset(){stop();cached.current=undefined;pending.current=undefined;const seq=epoch.current;phase('thinking');setError('');try{const next=await call('/reset',{id:createClientId(),player:props.player,revision:saved.current.revision});if(alive.current&&seq===epoch.current)accept(next);}catch{if(alive.current&&seq===epoch.current){await read();setError('請確認最新對話；需要時可以再按重新聊。');}}finally{if(alive.current&&seq===epoch.current)phase('idle');}}
  function retry(){if(pending.current){unlock();void send(pending.current);}else void read();}
  return {state,loaded,status,error,playbackFailed,seconds,start,finish,stop,play,type,reset,retry,read,hasPending:Boolean(pending.current)};
}
