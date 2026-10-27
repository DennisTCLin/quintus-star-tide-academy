import { clientId as createClientId } from "./client-id";
import { useEffect, useRef, useState } from "react";
import { request, CloudError } from "./cloud";
import type { Battle, PlayerId } from "./game-view";
export type OnlineRoom = { id:string; status:"pending"|"active"|"finished"|"expired"|"declined"|"cancelled"; revision:number; side:0|1; names:[string,string]; battle:Battle|null; hostPet:string; deadline:number; reason:string|null };
export type OnlineState = { serverNow:number; available:boolean; room:OnlineRoom|null };
export function useOnlineBattle(player:PlayerId|null,csrf:string|undefined) {
  const [state,setState]=useState<OnlineState|null>(null),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [uncertain,setUncertain]=useState<Record<string,unknown>|null>(null);
  const gate=useRef(false),epoch=useRef(0),sequence=useRef(0),clockOffset=useRef(0);
  const ready=useRef(false),uncertainRef=useRef<Record<string,unknown>|null>(null);
  const updateUncertain=(body:Record<string,unknown>|null)=>{uncertainRef.current=body;setUncertain(body);};
  const foreground=useRef(document.visibilityState==="visible"),syncEpoch=useRef(0),refresh=useRef<()=>void>(()=>{});
  const receive=(next:OnlineState)=>{clockOffset.current=next.serverNow-Date.now();setState(next);ready.current=navigator.onLine&&foreground.current;setConnected(ready.current);};
  useEffect(()=>{
    const life=++epoch.current;ready.current=false;setState(null);setConnected(false);setError("");updateUncertain(null);gate.current=false;setBusy(false);
    if(!player||!csrf)return;
    let polling:number|null=null;
    foreground.current=document.visibilityState==="visible";
    const poll=async()=>{
      if(!navigator.onLine||!foreground.current||document.visibilityState!=="visible"||gate.current||polling!==null)return;
      const issued=++sequence.current;polling=issued;
      try {const next=await request<OnlineState>(`online-battle?player=${player}`);if(epoch.current===life&&issued===sequence.current)receive(next);}
      catch {if(epoch.current===life&&issued===sequence.current){ready.current=false;setConnected(false);}}
      finally {if(polling===issued)polling=null;}
    };
    // A response started before suspension cannot certify current battle state.
    // Release its poll slot so returning can read fresh state immediately.
    const invalidate=()=>{++sequence.current;++syncEpoch.current;polling=null;ready.current=false;setConnected(false);};
    const suspend=()=>{foreground.current=false;invalidate();};
    const resume=()=>{foreground.current=document.visibilityState==="visible";invalidate();void poll();};
    const visibility=()=>document.visibilityState==="visible"?resume():suspend();
    refresh.current=()=>{void poll();};
    void poll();const timer=setInterval(poll,3000);
    document.addEventListener("visibilitychange",visibility);window.addEventListener("online",resume);
    window.addEventListener("offline",invalidate);window.addEventListener("pagehide",suspend);window.addEventListener("pageshow",resume);
    return()=>{++epoch.current;ready.current=false;refresh.current=()=>{};clearInterval(timer);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("online",resume);window.removeEventListener("offline",invalidate);window.removeEventListener("pagehide",suspend);window.removeEventListener("pageshow",resume);};
  },[player,csrf]);
  const send=async(body:Record<string,unknown>)=>{
    if(gate.current||!player||!csrf)return false;
    if(!navigator.onLine||!foreground.current){ready.current=false;setConnected(false);return false;}
    gate.current=true;setBusy(true);setError("");++sequence.current;const life=epoch.current,sync=syncEpoch.current;
    try {const next=await request<OnlineState>("online-battle",body,csrf);if(epoch.current!==life)return false;if(sync===syncEpoch.current&&foreground.current&&navigator.onLine)receive(next);updateUncertain(null);return true;}
    catch(e) {if(epoch.current===life){setError(e instanceof Error?e.message:"連線失敗");if(e instanceof CloudError&&(e.status===0||e.status>=500)){updateUncertain(body);ready.current=false;setConnected(false);}else updateUncertain(null);}return false;}
    finally {if(epoch.current===life){gate.current=false;setBusy(false);if(sync!==syncEpoch.current)refresh.current();}}
  };
  // React may not have committed the disconnected render when a resume event fires.
  // Gate new commands synchronously; retry still reuses its known command identity.
  const act=(action:string,extra:Record<string,unknown>={})=>{
    if(uncertainRef.current||!ready.current||!foreground.current||!navigator.onLine)return Promise.resolve(false);
    const room=state?.room;
    return send({player,action,commandId:createClientId(),...(action==="invite"?{}:{room:room?.id,revision:room?.revision}),...extra});
  };
  return {state,connected,busy,error,uncertain,act,retry:()=>uncertainRef.current?send(uncertainRef.current):Promise.resolve(false),clockOffset};
}
export type OnlineController = ReturnType<typeof useOnlineBattle>;
