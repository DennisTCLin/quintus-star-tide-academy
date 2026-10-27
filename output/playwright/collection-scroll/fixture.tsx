import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CollectionViewer} from '../../../src/CollectionBoard';
import {ROSTER} from '../../../src/game-view';
import '../../../src/styles.css';
import '../../../src/family.css';
import '../../../src/friends.css';
const person={key:'synthetic',id:'quintus',name:'測試收藏',avatarKey:'quintus',isSelf:false,available:true,unique:45,total:47,cards:ROSTER.slice(0,45).map(p=>({id:p.id,count:1,level:1}))};
const original=window.fetch.bind(window);
window.fetch=(input,init)=>String(input).includes('/api/collections')?Promise.resolve(new Response(JSON.stringify({day:'2026-10-25',player:person}),{headers:{'Content-Type':'application/json'}})):original(input,init);
function Fixture(){const [open,setOpen]=useState(false);return <main className="family-app"><button onClick={()=>setOpen(true)}>打開測試收藏</button><div style={{height:1800}}>Background</div>{open&&<CollectionViewer player="quintus" target="synthetic" onClose={()=>setOpen(false)}/>}</main>}
createRoot(document.getElementById('root')!).render(<Fixture/>);
