import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import IslandApp from '../../../src/island/IslandApp';
import {emptyPlayer} from '../../../src/island/engine';
import '../../../src/family.css';
function Fixture(){
 const [online,setOnline]=useState(true),[reduced,setReduced]=useState(false),[progress]=useState(emptyPlayer);
 return <div className="family-app" style={{background:'#09283b',minHeight:'100vh',padding:14}}>
 <label><input type="checkbox" checked={online} onChange={e=>setOnline(e.target.checked)}/>Online</label>
 <label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/>Reduced motion</label>
 <IslandApp player={{id:'qa',name:'測試',icon:'🌟'}} companion={{name:'潮光獸',image:'/assets/pets/tideglow.webp',skill:'shield',skillName:'護盾',skillIcon:'🛡️'}} embed={{online,reduced,voice:false,day:'2026-10-25',progress,onStart:async()=>undefined,onAnswer:async()=>undefined,onHelp:async()=>undefined,onRound:async()=>undefined,onQuit:async()=>undefined,onExit:()=>{}}}/>
 </div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
