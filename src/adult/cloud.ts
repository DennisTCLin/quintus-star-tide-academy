import { useCallback, useEffect, useRef, useState } from 'react';
import { parseState, type AdultState } from './engine';
export type AdultCommand = {type:'profile';name:string;track:string;dailyGoal:number}|{type:'lesson-start';lessonId:string}|{type:'review-start';mode:string}|{type:'answer';sessionId:string;index:number;answer:string}|{type:'hint'|'next';sessionId:string;index:number}|{type:'end';sessionId:string};
type Snapshot = {state:AdultState;username:string;csrf:string;day:string};
type Pending = {username:string;id:string;revision:number;command:AdultCommand};
class RequestError extends Error { constructor(message:string,public status:number){super(message);} }
const pendingKey = (username:string) => 'star-tide.adult-pending.v1:'+username;
const unconfirmed = '上次有操作尚未確認，請按「重試原操作」查回結果。';
export async function requestAdult(path:string,body?:unknown,csrf?:string):Promise<Snapshot&{recoveryCode?:string}> {
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch('/api/adult/'+path,{
      method:body===undefined?'GET':'POST',credentials:'same-origin',
      headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},
      body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,
    });
    const data=await response.json().catch(()=>({error:'伺服器回應未完成，請稍後重試。'}));
    if(!response.ok)throw new RequestError(data.error??'連線暫時中斷',response.status);
    if(['register','recover','recovery-code'].includes(path)&&(typeof data.recoveryCode!=='string'||!/^[a-f0-9]{64}$/.test(data.recoveryCode)))throw Error('Missing recovery code');
    if(path==='logout'){if(data.ok!==true)throw Error('Invalid logout response');return data;}
    if(typeof data.username!=='string'||!/^[a-z0-9_]{3,32}$/.test(data.username)||typeof data.csrf!=='string'||!/^[a-f0-9]{64}$/.test(data.csrf)||typeof data.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(data.day)||!data.state)throw Error('Incomplete adult snapshot');
    data.state=parseState(JSON.stringify(data.state));
    return data;
  } catch(e) {
    if(e instanceof RequestError)throw e;
    throw new RequestError('尚未確認雲端回應，請重試原操作。已保存的進度仍在帳號中。',0);
  } finally {clearTimeout(timeout);}
}
export function useAdultCloud(){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[recoveryCode,setRecoveryCode]=useState(''),[needsRetry,setNeedsRetry]=useState(false);
  const latest=useRef<Snapshot|null>(null),working=useRef(false),pending=useRef<Pending|null>(null),epoch=useRef(0),syncSequence=useRef(0);
  const accept=useCallback((data:Snapshot)=>{
    // A slow GET from before a mutation must never roll the current account backward.
    if(latest.current?.username===data.username&&latest.current.state.revision>data.state.revision)return;
    if(latest.current&&latest.current.username!==data.username)setRecoveryCode('');
    latest.current=data;setSnapshot(data);
  },[]);
  const restorePending=useCallback((username:string)=>{
    if(pending.current?.username!==username)pending.current=null;
    if(!pending.current){
      const raw=sessionStorage.getItem(pendingKey(username));
      if(raw){
        const saved=JSON.parse(raw);
        if(saved.username!==username||typeof saved.id!=='string'||!Number.isSafeInteger(saved.revision)||!saved.command)throw Error('無法讀取待確認操作，請下載備份並聯絡管理員。');
        pending.current=saved;
      }
    }
    setNeedsRetry(!!pending.current);
    setError(pending.current?unconfirmed:'');
  },[]);
  const sync=useCallback(async()=>{
    if(working.current)return;
    const started=epoch.current,sequence=++syncSequence.current;
    try {
      const data=await requestAdult('state');
      if(started!==epoch.current||sequence!==syncSequence.current)return;
      accept(data);restorePending(data.username);
    } catch(e) {
      if(started!==epoch.current||sequence!==syncSequence.current)return;
      const x=e as RequestError;
      if(x.status===401){latest.current=null;setSnapshot(null);}else setError(x.message);
    } finally {if(sequence===syncSequence.current)setLoading(false);}
  },[accept,restorePending]);
  useEffect(()=>{
    void sync();const focus=()=>{void sync();};window.addEventListener('focus',focus);
    const timer=setInterval(()=>{if(!document.hidden)void sync();},30000);
    return()=>{epoch.current++;window.removeEventListener('focus',focus);clearInterval(timer);};
  },[sync]);
  async function auth(mode:'login'|'register'|'recover',username:string,password:string,code?:string){
    if(working.current)return false;
    working.current=true;epoch.current++;setBusy(true);setError('');
    try {
      const data=await requestAdult(mode,{username,password,...(mode==='recover'?{recoveryCode:code}:{})});
      latest.current=null;accept(data);setRecoveryCode(data.recoveryCode??'');pending.current=null;
      try{restorePending(data.username);}catch(e){setError((e as Error).message);}
      return true;
    } catch(e){setError((e as Error).message);return false;}
    finally{working.current=false;setBusy(false);}
  }
  async function send(command?:AdultCommand){
    if(working.current||!latest.current)return false;
    const current=latest.current;
    if(pending.current&&command){setError('先重試原操作，確認是否已保存，再做下一步。');return false;}
    working.current=true;epoch.current++;setBusy(true);setError('');let operation=pending.current;
    try {
      if(!operation){
        if(!command)return false;
        operation={username:current.username,id:crypto.randomUUID(),revision:current.state.revision,command};
        // Persist the id before sending, so a lost response/reload can replay exactly once.
        sessionStorage.setItem(pendingKey(current.username),JSON.stringify(operation));pending.current=operation;
      }
      setNeedsRetry(true);
      const data=await requestAdult('command',operation,current.csrf);accept(data);
      sessionStorage.removeItem(pendingKey(current.username));pending.current=null;setNeedsRetry(false);return true;
    } catch(e) {
      const x=e as RequestError;setError(x.message);
      if([400,401,403,409].includes(x.status)){
        try{sessionStorage.removeItem(pendingKey(current.username));}catch{/* Server remains authoritative. */}
        pending.current=null;setNeedsRetry(false);
        if(x.status===409){try{accept(await requestAdult('state'));}catch{/* Keep actionable error. */}}
        if(x.status===401){latest.current=null;setSnapshot(null);}
      }
      return false;
    } finally {working.current=false;setBusy(false);}
  }
  async function rotateRecovery(password:string){
    if(working.current||!latest.current||pending.current)return false;
    working.current=true;epoch.current++;setBusy(true);setError('');
    try{const data=await requestAdult('recovery-code',{password},latest.current.csrf);accept(data);setRecoveryCode(data.recoveryCode??'');return true;}
    catch(e){setError((e as Error).message);return false;}finally{working.current=false;setBusy(false);}
  }
  async function logout(){
    if(working.current||!latest.current)return;
    if(pending.current){setError('請先重試原操作確認結果，再登出。');return;}
    working.current=true;epoch.current++;setBusy(true);
    try{await requestAdult('logout',{},latest.current.csrf);latest.current=null;setSnapshot(null);setError('');setRecoveryCode('');}
    catch(e){setError((e as Error).message);}finally{working.current=false;setBusy(false);}
  }
  return {snapshot,loading,busy,error,recoveryCode,needsRetry,auth,send,sync,logout,rotateRecovery,acknowledgeRecovery:()=>setRecoveryCode('')};
}
export type AdultCloud=ReturnType<typeof useAdultCloud>;
