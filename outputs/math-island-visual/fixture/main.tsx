import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import {GAMES,makeItem} from "../../../src/island/games";
import {Zy} from "../../../src/island/zhuyin";
import "../../../src/family.css";
import "../../../src/island/island.css";
function Fixture(){
 const [items]=useState(()=>Object.fromEntries(Object.keys(GAMES).map(k=>[k,makeItem(k)])));
 const [key,setKey]=useState("count"),[exam,setExam]=useState(false),[done,setDone]=useState(false),[view,setView]=useState<any>(null);
 const g=GAMES[key],item=items[key],mode=exam?"boss":"learn",sceneView=view??g.init(item,mode),S=exam&&g.Exam?g.Exam:g.Scene;
 return <div className="family-app" style={{background:"#09283b",minHeight:"100vh"}}><div style={{padding:8,display:"flex",gap:8,flexWrap:"wrap"}}><label>Game <select aria-label="Game" value={key} onChange={e=>{setKey(e.target.value);setView(null);setDone(false)}}>{Object.keys(GAMES).map(k=><option key={k}>{k}</option>)}</select></label><label><input type="checkbox" checked={exam} onChange={e=>{setExam(e.target.checked);setView(null);setDone(false)}}/>Exam</label><button onClick={()=>setDone(d=>!d)}>Toggle answered</button><output>Answer {item.answer}</output></div>
 <div style={{padding:"0 14px"}}><div id="math-island" className="isl embedded"><div className="isl-stage"><div className="isl-row"><div className="isl-main"><div className="isl-ask"><button className="isl-ear" aria-label="Read question">🔊</button><p className="isl-q"><Zy text={item.text}/></p></div><S item={item} view={sceneView} mode={mode} demo={false} done={done} act={a=>g.act&&setView(g.act(item,sceneView,a))} choose={()=>setDone(true)} eliminated={null} pending={null}/><div className="isl-actions"><button className="isl-btn" onClick={()=>setDone(true)}>Show answer</button></div></div></div></div></div></div></div>;
}createRoot(document.getElementById("root")!).render(<Fixture/>);
