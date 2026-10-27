import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import CourseSelection from '../../../src/CourseSelection';
import {ReadingContext} from '../../../src/readability';
import '../../../src/styles.css';
import '../../../src/family.css';
const q=new URLSearchParams(location.search),grade=Number(q.get('grade')||4) as 1|2|4;
function Fixture(){const [active,setActive]=useState(false),[suspended,setSuspended]=useState(false),[chosen,setChosen]=useState('');return <ReadingContext.Provider value={{grade,voice:true}}><main className={`family-app grade-${grade}`} style={{padding:'16px',maxWidth:1600,margin:'auto'}}><button onClick={()=>setSuspended(v=>!v)}>暫停場景測試</button><output id="motion-state">{String(active)}</output><output id="chosen">{chosen}</output><div style={{height:q.has('offscreen')?1200:0}}/><CourseSelection grade={grade} profile={{owned:{},equipped:'',growth:{xp:{},day:'',credited:[]}}} online={!q.has('offline')} busy={false} motionGranted={active} motionSuspended={suspended} onMotionActivity={setActive} onStart={setChosen} onResume={()=>setChosen('resume')} onSpeak={()=>{}}/><div style={{height:1200}}/></main></ReadingContext.Provider>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
