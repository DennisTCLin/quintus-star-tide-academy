import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import IslandApp from '../../../src/island/IslandApp';
import {GAMES} from '../../../src/island/games';
import type {IslandRun} from '../../../src/island/schema';
import {ROSTER} from '../../../src/game-view';
import {speak} from '../../../src/voice';
const utterances:any[]=[]; let voices=[{lang:'zh-CN'},{lang:'cmn-Hant-TW'}]; const events=new EventTarget();
function log(text:string){const el=document.getElementById('engine-log')!;el.textContent += text+'\n';}
Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(public text:string){}}});
Object.defineProperty(window,'speechSynthesis',{value:{
  getVoices:()=>voices, cancel:()=>log('cancel'), addEventListener:events.addEventListener.bind(events), removeEventListener:events.removeEventListener.bind(events),
  speak:(u:any)=>{utterances.push(u);log(`speech ${utterances.length} [${u.voice?.lang??'DEFAULT'}]: ${u.text}`);}
}});
const item=GAMES.count.make(false); item.k='count';
const run={id:'isolated-demo-only',mode:'learn',unit:'1A-01',day:'2026-10-25',companion:'tide',items:[item],answers:[],completed:false,skillUsed:false,coins:0,points:0,rewarded:0,xp:0,packs:0,found:0,tickets:0,bonus:0,savedStar:false,prevBest:null} as IslandRun;
function Fixture(){
  const [mounted,setMounted]=useState(true),[voice,setVoice]=useState(true);
  const pet=ROSTER[0];
  return <><aside style={{background:'#fff',color:'#111',padding:16}}><h1>Isolated demonstration lifecycle fixture</h1>
  <p>No cloud requests. Buttons below simulate speech engine callbacks.</p>
  <button onClick={()=>{utterances.at(-1)?.onend?.();}}>Complete current speech</button>
  <button onClick={()=>{utterances[1]?.onend?.();utterances[1]?.onerror?.();}}>Late original demo callbacks</button>
  <button onClick={()=>setVoice(v=>!v)}>Voice {voice?'on':'off'}</button>
  <button onClick={()=>setMounted(v=>!v)}>{mounted?'Unmount island':'Mount island'}</button>
  <button onClick={()=>{voices=[];log('voices delayed');}}>Delay voices</button>
  <button onClick={()=>{voices=[{lang:'zh-CN'},{lang:'zh_TW'}];events.dispatchEvent(new Event('voiceschanged'));log('Taiwan voices arrived');}}>Load Taiwan voices</button>
  <button onClick={()=>{voices=[{lang:'zh-HK'},{lang:'zh-CN'}];log('only non-Taiwan voices');}}>Only non-Taiwan voices</button>
  <button onClick={()=>speak('頁面說明')}>Speak outside island</button>
  <pre id="engine-log"/>
  </aside>{mounted&&<IslandApp player={{id:'doudou',name:'QA only',icon:'🧪'}} companion={{name:pet?.name??'測試夥伴',image:pet?.image??'/assets/cloudsail-companion.png',skill:'shield',skillName:'護盾',skillIcon:'🛡️'}} embed={{voice,reduced:true,online:true,day:'2026-10-25',progress:{units:{},pool:[],stats:{},day:'',attempted:[]},onStart:async()=>structuredClone(run),onAnswer:async()=>undefined,onRound:async()=>undefined,onQuit:async()=>true,onHelp:async()=>undefined,onExit:()=>setMounted(false)}}/>}</>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
