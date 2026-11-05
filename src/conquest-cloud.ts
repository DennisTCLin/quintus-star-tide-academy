import { useEffect, useRef, useState } from 'react';
import { request, CloudError } from './cloud';
import { clientId } from './client-id';
import type { PlayerId } from './game-view';
import type { ConquestAction, ConquestState } from './conquest';
export type SharedConquest = {serverNow:number;revision:number;me:string;state:ConquestState;collection:{owned:Record<string,number>;growthXp:Record<string,number>};players:{id:string;name:string;profile:string;avatarKey:string;allianceId:string;heroId:string;count:number;defense:number}[]};
type Reply = SharedConquest & {result?:{state:ConquestState;occurredAt:number};replayed?:boolean};
export function useSharedConquest(account:string,player:PlayerId|null,csrf?:string) {
  const [loadedFor,setLoadedFor]=useState<{account:string;player:PlayerId|null;csrf?:string}|null>(null);
  const [snapshot,setSnapshot]=useState<SharedConquest|null>(null),[error,setError]=useState(''),[connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState<Record<string,unknown>|null>(null);
  const latest=useRef<SharedConquest|null>(null),pending=useRef<Record<string,unknown>|null>(null),gate=useRef(false),epoch=useRef(0),sequence=useRef(0),ready=useRef(false),offset=useRef(0),refreshRef=useRef<()=>Promise<void>>(async()=>{});
  const key=`star-tide.shared-conquest.pending.${encodeURIComponent(account)}.${player}`;
  const receive=(value:SharedConquest)=>{latest.current=value;offset.current=value.serverNow-Date.now();setSnapshot(value);setLoadedFor({account,player,csrf});ready.current=navigator.onLine&&!document.hidden;setConnected(ready.current);};
  const savePending=(body:Record<string,unknown>|null)=>{pending.current=body;setUncertain(body);try {if(body)sessionStorage.setItem(key,JSON.stringify(body));else sessionStorage.removeItem(key);}catch{/* The in-memory identity still prevents duplicate retries in this page. */}};
  useEffect(()=>{
    const life=++epoch.current;latest.current=null;setSnapshot(null);ready.current=false;setConnected(false);setError('');gate.current=false;setBusy(false);pending.current=null;setUncertain(null);
    if(!player||!csrf)return;
    try {const saved=JSON.parse(sessionStorage.getItem(key)??'null');if(saved?.player===player&&typeof saved.commandId==='string'){pending.current=saved;setUncertain(saved);}}catch{/* Ignore corrupt pending envelopes; they never grant state. */}
    let polling=false;
    const refresh=async()=>{
      if(polling||gate.current||document.hidden||!navigator.onLine)return;
      polling=true;const issued=++sequence.current;
      try {const value=await request<SharedConquest>(`conquest?player=${player}`);if(epoch.current===life&&issued===sequence.current){receive(value);if(!pending.current)setError('');}}
      catch(cause){if(epoch.current===life&&issued===sequence.current){ready.current=false;setConnected(false);setError(cause instanceof Error?cause.message:'共享戰場連線失敗');}}
      finally {polling=false;}
    };
    refreshRef.current=refresh;
    const invalidate=()=>{++sequence.current;ready.current=false;setConnected(false);};
    const resume=()=>{invalidate();void refresh();};
    const visibility=()=>document.hidden?invalidate():resume();
    void refresh();const timer=setInterval(refresh,5000);
    window.addEventListener('online',resume);window.addEventListener('offline',invalidate);window.addEventListener('focus',resume);document.addEventListener('visibilitychange',visibility);
    return()=>{++epoch.current;++sequence.current;ready.current=false;clearInterval(timer);refreshRef.current=async()=>{};window.removeEventListener('online',resume);window.removeEventListener('offline',invalidate);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',visibility);};
  },[account,player,csrf,key]);
  const send=async(body:Record<string,unknown>)=>{
    if(gate.current||!csrf)throw Error('請等待目前操作完成。');
    gate.current=true;setBusy(true);setError('');++sequence.current;const life=epoch.current;
    savePending(body);
    try {const value=await request<Reply>('conquest',body,csrf);if(epoch.current!==life)throw Error('玩家已更換，請重新查看戰況。');receive(value);savePending(null);return value.result?.state??value.state;}
    catch(cause){if(epoch.current===life){setError(cause instanceof Error?cause.message:'操作未完成');if(cause instanceof CloudError&&cause.status>0&&cause.status<500){savePending(null);}ready.current=false;setConnected(false);}throw cause;}
    finally {if(epoch.current===life){gate.current=false;setBusy(false);void refreshRef.current();}}
  };
  const act=async(action:ConquestAction|{type:'join';alliance:string;hero:string})=>{
    if(pending.current)throw Error('上次操作尚待確認，請先確認戰果，避免重複出征。');
    const current=latest.current;
    if(!ready.current||!current||!navigator.onLine||document.hidden)throw Error('請先連線並取得最新戰況。');
    return send({...action,player,season:current.state.season,revision:current.revision,commandId:clientId()});
  };
  const markReportsRead=async(reportIds:string[])=>{
    if(gate.current||pending.current||!csrf||!player||!ready.current)throw Error('請先連線並等待目前操作完成。');
    gate.current=true;setBusy(true);const life=epoch.current,issued=++sequence.current;
    try {
      const value=await request<{raidReadIds:string[]}>('conquest/reports/read',{player,reportIds},csrf);
      if(epoch.current!==life)throw Error('玩家已更換，請重新查看戰況。');
      if(issued===sequence.current&&latest.current){
        const next={...latest.current,state:{...latest.current.state,raidReadIds:value.raidReadIds}};
        latest.current=next;setSnapshot(next);
      }
    } finally {
      if(epoch.current===life){gate.current=false;setBusy(false);void refreshRef.current();}
    }
  };
  const scoped=loadedFor?.account===account&&loadedFor.player===player&&loadedFor.csrf===csrf;
  return {snapshot:scoped?snapshot:null,error,connected:scoped&&connected,busy,uncertain,act,markReportsRead,retry:()=>pending.current?send(pending.current):Promise.resolve(null),refresh:()=>refreshRef.current(),now:()=>Date.now()+offset.current};
}
export type SharedConquestController = ReturnType<typeof useSharedConquest>;
