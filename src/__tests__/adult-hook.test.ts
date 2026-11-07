import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
import {randomUUID} from 'node:crypto';
import * as engine from '../adult/engine';
import * as ids from '../client-id';
// Execute the real hook without adding a DOM-test dependency. Renders are explicit
// checkpoints; this harness does not certify React Strict Mode or browser layout.
const compiled=transformSync(readFileSync(new URL('../adult/cloud.ts',import.meta.url),'utf8'),{loader:'ts',format:'cjs'}).code;
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
const key=(username:string)=>`star-tide.adult-pending.v1:${username}`;
const snapshot=(username:string,revision=0)=>({username,csrf:'a'.repeat(64),day:'2026-11-06',state:{...engine.freshState(),revision}});
function harness(initial:Record<string,string>={}){
 const slots:any[]=[],effects:(()=>void)[]=[],calls:any[]=[],storage=new Map(Object.entries(initial));let cursor=0;
 const same=(a:any[],b:any[])=>a?.length===b?.length&&a.every((v,i)=>v===b[i]);
 const react={
  useState(initial:any){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return[slots[i].value,(value:any)=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;}];},
  useRef(initial:any){const i=cursor++;return slots[i]??(slots[i]={current:initial});},
  useCallback(fn:any,deps:any[]){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={deps,fn};return slots[i].fn;},
  useEffect(fn:any,deps:any[]){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps)){slots[i]?.cleanup?.();slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn();});}},
 };
 const module={exports:{} as any};
 vm.runInNewContext(compiled,{module,exports:module.exports,require:(name:string)=>{if(name==='react')return react;if(name==='./engine')return engine;if(name==='../client-id')return ids;throw Error('Unexpected module '+name);},AbortController,setTimeout,clearTimeout,setInterval:()=>1,clearInterval:()=>{},crypto:{randomUUID},window:{addEventListener(){},removeEventListener(){}},document:{hidden:false},sessionStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)},fetch:(path:string,options:any)=>new Promise(resolve=>calls.push({path,body:options.body&&JSON.parse(options.body),resolve}))});
 return {calls,storage,render(){cursor=0;const result=module.exports.useAdultCloud();while(effects.length)effects.shift()!();return result;},respond(index:number,data:any,status=200){calls[index].resolve({ok:status>=200&&status<300,status,json:async()=>typeof data==='string'?JSON.parse(data):data});}};
}
const operation=()=>({username:'adult_a',id:randomUUID(),revision:0,command:{type:'profile',name:'A',track:'everyday',dailyGoal:6}});
describe('adult hook recovery and request ordering',()=>{
 it('restores pending and keeps the exact operation after truncated200 until acknowledged',async()=>{
  const pending=operation(),h=harness({[key('adult_a')]:JSON.stringify(pending)});h.render();h.respond(0,snapshot('adult_a'));await flush();let cloud=h.render();expect(cloud.needsRetry).toBe(true);
  const first=cloud.send();h.respond(1,'{');expect(await first).toBe(false);cloud=h.render();expect(cloud.snapshot.state).toBeTruthy();expect(cloud.needsRetry).toBe(true);expect(h.storage.has(key('adult_a'))).toBe(true);
  const retry=cloud.send();h.respond(2,snapshot('adult_a',1));expect(await retry).toBe(true);cloud=h.render();expect(h.calls[1].body.id).toBe(pending.id);expect(h.calls[2].body).toEqual(h.calls[1].body);expect(cloud.snapshot.state.revision).toBe(1);expect(cloud.needsRetry).toBe(false);expect(h.storage.has(key('adult_a'))).toBe(false);
 });
 it('detaches A pending on account switch, preserving its storage without sending it as B',async()=>{
  const h=harness({[key('adult_a')]:JSON.stringify(operation())});h.render();h.respond(0,snapshot('adult_a'));await flush();let cloud=h.render();expect(cloud.needsRetry).toBe(true);
  const syncing=cloud.sync();h.respond(1,snapshot('adult_b'));await syncing;cloud=h.render();expect(cloud.snapshot.username).toBe('adult_b');expect(cloud.needsRetry).toBe(false);expect(h.storage.has(key('adult_a'))).toBe(true);
  expect(await cloud.send()).toBe(false);expect(h.calls).toHaveLength(2);
 });
 for(const status of [200,401])it(`ignores older GET${status} after a newer identity snapshot`,async()=>{
  const h=harness(),initial=h.render(),newer=initial.sync();h.respond(1,snapshot('adult_b'));await newer;h.respond(0,status===200?snapshot('adult_a'):{error:'expired'},status);await flush();const cloud=h.render();expect(cloud.snapshot.username).toBe('adult_b');expect(cloud.loading).toBe(false);
 });
});
