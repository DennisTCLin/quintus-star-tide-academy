import {useEffect,useState}from'react';
import {Game}from'../App';
import {request,useCloud,type CloudState}from'../cloud';
import {AccountAvatarProvider}from'../PlayerAvatar';
import type {AdultCloud}from'./cloud';
import {AdultGameContext}from'./game-context';
export default function SharedGame({learning}:{learning:AdultCloud}){
 const [initial,setInitial]=useState<CloudState|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const username=learning.snapshot!.username,csrf=learning.snapshot!.csrf;
 useEffect(()=>{let active=true;setInitial(null);setError('');void request<CloudState>('enter',{},csrf).then(s=>{if(active)setInitial(s);}).catch(e=>{if(active)setError((e as Error).message);});return()=>{active=false;};},[username,csrf,retry]);
 if(!initial)return <main className="family-app welcome"><section className="account-panel f-panel"><h1>正在打開你的星潮航海誌</h1><p role="status">{error||'讀取原有英文成果，接續你的冒險。'}</p>{error&&<><button className="f-primary" onClick={()=>setRetry(n=>n+1)}>重新連線</button><button onClick={()=>void learning.logout()}>登出</button></>}</section></main>;
 return <Play key={`${initial.username}:${initial.csrf}`} initial={initial} learning={learning}/>;
}
function Play({initial,learning}:{initial:CloudState;learning:AdultCloud}){
 const cloud=useCloud(initial);
 const mismatch=!!cloud.state&&cloud.state.username!==learning.snapshot?.username;
 useEffect(()=>{if((!cloud.loading&&!cloud.state)||mismatch)void learning.sync();},[cloud.loading,cloud.state?.username,mismatch,learning.sync]);
 if(!cloud.state||mismatch)return <main className="family-app welcome"><p role="status">正在確認成人帳號，原有進度已保留。</p><button onClick={()=>void learning.sync()}>重新同步</button></main>;
 const shared={...cloud,logout:async()=>{await cloud.logout();await learning.sync();}};
 return <AdultGameContext.Provider value={{learning}}><AccountAvatarProvider value={{username:cloud.state.username,playerId:cloud.state.playerId,kind:'adult'}}><Game cloud={shared}/></AccountAvatarProvider></AdultGameContext.Provider>;
}
