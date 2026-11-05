import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import MonsterBestiary from '/src/MonsterBestiary';
import {CreatureSheet} from '/src/CreatureInfo';
import {newFamily} from '/src/adventure';
import {BASE_ROSTER as WAVE4_COMPANIONS} from '/src/game-view';
import {NATIVE_LEVELS} from '/src/creature-rules';
import {ReadingContext} from '/src/readability';
import '/src/styles.css';
import '/src/family.css';
const p=newFamily().profiles.quintus;
function Harness(){const heading=useRef<HTMLHeadingElement>(null),[mode,setMode]=useState('monsters'),[pick,setPick]=useState(0);const pet=WAVE4_COMPANIONS[pick];return <ReadingContext.Provider value={{grade:4,voice:false}}><main className="family-app"><nav><button onClick={()=>setMode('monsters')}>新怪物驗證</button><button onClick={()=>setMode('companions')}>新夥伴驗證</button></nav>{mode==='monsters'?<MonsterBestiary heading={heading} profile={p} onBack={()=>{}}/>:<section><h1>遠境守望者</h1><label>選擇夥伴<select value={pick} onChange={e=>setPick(Number(e.target.value))}>{WAVE4_COMPANIONS.map((c,i)=><option key={c.id} value={i}>{c.name}</option>)}</select></label><h2>{pet.name}</h2><img className="qa-art" src={pet.image} width="320" height="320" alt={pet.name}/><CreatureSheet pet={pet} level={NATIVE_LEVELS[pet.rarity]}/><p>{pet.story}</p></section>}</main></ReadingContext.Provider>}
createRoot(document.getElementById('root')!).render(<Harness/>);
