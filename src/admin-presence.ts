import {useEffect,useRef,useState} from 'react';
import type {Activity} from './social-activity';
export type AdminPresenceData={serverNow:number;students:{memberId:string;onlineUntil:number|null;lastSeenAt:number|null;activity:Activity|null}[]};
export type AdminPresenceSnapshot={data:AdminPresenceData;receivedAt:number}|null;
export const ADMIN_PRESENCE_REFRESH=5000,ADMIN_PRESENCE_FRESH=15000;
export function trackAdminPresence(request:(signal:AbortSignal)=>Promise<AdminPresenceData>,receive:(value:AdminPresenceSnapshot)=>void){
 let stopped=false,generation=0,current:AbortController|null=null,timeout:ReturnType<typeof setTimeout>|undefined;
 const visible=()=>document.visibilityState==='visible'&&navigator.onLine;
 const invalidate=()=>{generation++;current?.abort();current=null;clearTimeout(timeout);receive(null);};
 const refresh=()=>{
  if(stopped||!visible()||current)return;
  const mine=++generation,controller=new AbortController();current=controller;
  timeout=setTimeout(()=>{if(mine===generation)invalidate();},8000);
  void request(controller.signal).then(data=>{if(!stopped&&mine===generation&&visible())receive({data,receivedAt:Date.now()});})
   .catch(()=>{if(!stopped&&mine===generation)receive(null);})
   .finally(()=>{if(mine===generation){clearTimeout(timeout);current=null;}});
 };
 const changed=()=>{if(visible())refresh();else invalidate();};
 document.addEventListener('visibilitychange',changed);window.addEventListener('online',changed);window.addEventListener('offline',changed);window.addEventListener('pageshow',changed);window.addEventListener('pagehide',invalidate);
 const timer=setInterval(refresh,ADMIN_PRESENCE_REFRESH);refresh();
 return()=>{stopped=true;generation++;current?.abort();clearTimeout(timeout);clearInterval(timer);document.removeEventListener('visibilitychange',changed);window.removeEventListener('online',changed);window.removeEventListener('offline',changed);window.removeEventListener('pageshow',changed);window.removeEventListener('pagehide',invalidate);};
}
export function presenceFor(snapshot:AdminPresenceSnapshot,memberId:string,now:number){
 const row=snapshot?.data.students.find(x=>x.memberId===memberId);
 if(!snapshot||!row||now-snapshot.receivedAt>=ADMIN_PRESENCE_FRESH)return {state:'unknown' as const,activity:null,lastSeenAt:null};
 const serverNow=snapshot.data.serverNow+Math.max(0,now-snapshot.receivedAt);
 return {state:row.onlineUntil!==null&&row.onlineUntil>serverNow?'online' as const:'offline' as const,activity:row.activity,lastSeenAt:row.lastSeenAt};
}
export function useAdminPresence(identity:string|null,request:(signal:AbortSignal)=>Promise<AdminPresenceData>){
 const read=useRef(request);read.current=request;
 const [value,setValue]=useState<{identity:string;snapshot:AdminPresenceSnapshot}|null>(null),[now,setNow]=useState(Date.now());
 useEffect(()=>{if(!identity)return;return trackAdminPresence(signal=>read.current(signal),snapshot=>setValue({identity,snapshot}));},[identity]);
 useEffect(()=>{if(!identity)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[identity]);
 return {snapshot:value?.identity===identity?value.snapshot:null,now};
}
