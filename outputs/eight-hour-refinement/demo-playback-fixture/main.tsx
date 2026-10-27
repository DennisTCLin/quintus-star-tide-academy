import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import IslandApp from '../../../src/island/IslandApp';
import {GAMES} from '../../../src/island/games';
import type {IslandRun} from '../../../src/island/schema';
import {petById} from '../../../src/game-view';
const utterances:any[]=[];
function log(text:string){const el=document.getElementById('engine-log')!;el.textContent += text+'\n';}
Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{constructor(public text:string){}}});
Object.defineProperty(window,'speechSynthesis',{value:{
  getVoices:()=>[{lang:'zh-TW'}], cancel:()=>log('cancel'),
  speak:(u:any)=>{utterances.push(u);log(`speech ${utterances.length}: ${u.text}`);}
}});
const item=GAMES.count.make(false); item.k='count';
const run={id:'isolated-demo-only',mode:'learn',unit:'1A-01',day:'2026-10-25',companion:'tide',items:[item],answers:[],completed:false,skillUsed:false,coins:0,points:0,rewarded:0,xp:0,packs:0,found:0,tickets:0,bonus:0,savedStar:false,prevBest:null} as IslandRun;
function Fixture(){
  const [mounted,setMounted]=useState(true),[voice,setVoice]=useState(true);
  const pet=petById('tide');
  return <><aside style={{background:'#fff',color:'#111',padding:16}}><h1>Isolated demonstration lifecycle fixture</h1>
  <p>No cloud requests. Buttons below simulate speech engine callbacks.</p>
  <button onClick={()=>{utterances.at(-1)?.onend?.();}}>Complete current speech</button>
  <button onClick={()=>{utterances[1]?.onend?.();utterances[1]?.onerror?.();}}>Late original demo callbacks</button>
  <button onClick={()=>setVoice(v=>!v)}>Voice {voice?'on':'off'}</button>
  <button onClick={()=>setMounted(v=>!v)}>{mounted?'Unmount island':'Mount island'}</button>
  <pre id="engine-log"/>
  </aside>{mounted&&<IslandApp player={{id:'doudou',name:'QA only',icon:'🧪'}} companion={{name:pet?.name??'測試夥伴',image:pet?.image??'/assets/cloudsail-companion.png',skill:'shield',skillName:'護盾',skillIcon:'🛡️'}} embed={{voice,reduced:true,online:true,day:'2026-10-25',progress:{units:{},pool:[],stats:{},day:'',attempted:[]},onStart:async()=>structuredClone(run),onAnswer:async()=>undefined,onRound:async()=>undefined,onQuit:async()=>true,onHelp:async()=>undefined,onExit:()=>setMounted(false)}}/>}</>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
