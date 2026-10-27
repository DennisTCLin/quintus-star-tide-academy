import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

// Minimal hook scheduler: exercise actual request/event ordering without a DOM.
const hooks=vi.hoisted(()=>({slots:[] as any[],index:0,effects:[] as (()=>void)[],cleanups:[] as (()=>void)[]}));
vi.mock('react',()=>({
 useState:(initial:unknown)=>{const i=hooks.index++;if(!(i in hooks.slots))hooks.slots[i]=initial;return [hooks.slots[i],(value:any)=>{hooks.slots[i]=typeof value==='function'?value(hooks.slots[i]):value;}];},
 useRef:(initial:unknown)=>{const i=hooks.index++;if(!(i in hooks.slots))hooks.slots[i]={current:initial};return hooks.slots[i];},
 useEffect:(effect:()=>void|(()=>void),deps:unknown[])=>{const i=hooks.index++;if(!hooks.slots[i]||deps.some((d,n)=>d!==hooks.slots[i][n])){hooks.slots[i]=deps;hooks.effects.push(()=>{const clean=effect();if(clean)hooks.cleanups.push(clean);});}}
}));
vi.mock('../cloud',()=>({request:vi.fn(),CloudError:class extends Error {constructor(message:string,public status:number){super(message);}}}));
import {request,CloudError} from '../cloud';
import {useOnlineBattle,type OnlineState} from '../online-battle';
const state=(revision:number):OnlineState=>({serverNow:Date.now(),available:true,room:{id:'room-a',status:'active',revision,side:0,names:['A','B'],battle:null,hostPet:'tideglow',deadline:Date.now()+120000,reason:null}});
const deferred=()=>{let resolve!:(value:OnlineState)=>void,reject!:(reason:unknown)=>void;const promise=new Promise<OnlineState>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const render=()=>{hooks.index=0;const value=useOnlineBattle('quintus','csrf');hooks.effects.splice(0).forEach(f=>f());return value;};
const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
let doc:EventTarget&{visibilityState:string},win:EventTarget,net:{onLine:boolean};
const visibility=(value:string)=>{doc.visibilityState=value;doc.dispatchEvent(new Event('visibilitychange'));};
beforeEach(()=>{hooks.slots=[];hooks.index=0;hooks.effects=[];hooks.cleanups=[];vi.useFakeTimers();vi.setSystemTime(10000);doc=Object.assign(new EventTarget(),{visibilityState:'visible'});win=new EventTarget();net={onLine:true};vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('navigator',net);vi.mocked(request).mockReset();});
afterEach(()=>{hooks.cleanups.forEach(f=>f());vi.useRealTimers();vi.unstubAllGlobals();});

describe('battle foreground synchronization barrier',()=>{
 it.each([true,false])('replaces a pre-background poll (old response arrives first: %s)',async(oldFirst)=>{
  vi.mocked(request).mockResolvedValueOnce(state(1));render();await flush();expect(render().connected).toBe(true);
  const stale=deferred(),fresh=deferred();vi.mocked(request).mockImplementationOnce(()=>stale.promise).mockImplementationOnce(()=>fresh.promise);
  await vi.advanceTimersByTimeAsync(3000);visibility('hidden');expect(render().connected).toBe(false);
  visibility('visible');expect(request).toHaveBeenCalledTimes(3);expect(render().connected).toBe(false);
  if(oldFirst){stale.resolve(state(1));await flush();expect(render().connected).toBe(false);await vi.advanceTimersByTimeAsync(3000);expect(request).toHaveBeenCalledTimes(3);}
  fresh.resolve(state(3));await flush();expect(render().state?.room?.revision).toBe(3);expect(render().connected).toBe(true);
  if(!oldFirst){stale.resolve(state(1));await flush();}expect(render().state?.room?.revision).toBe(3);
 });
 it('does not unlock on a delayed move response after returning; reads authoritative state first',async()=>{
  vi.mocked(request).mockResolvedValueOnce(state(1));render();await flush();
  const move=deferred(),fresh=deferred();vi.mocked(request).mockImplementationOnce(()=>move.promise).mockImplementationOnce(()=>fresh.promise);
  const sent=render().act('move',{move:'attack'});visibility('hidden');visibility('visible');
  move.resolve(state(2));await sent;await flush();expect(render().connected).toBe(false);expect(request).toHaveBeenCalledTimes(3);
  fresh.resolve(state(3));await flush();expect(render().state?.room?.revision).toBe(3);expect(render().connected).toBe(true);
 });
 it('preserves the exact move command after response loss across background and offline',async()=>{
  vi.mocked(request).mockResolvedValueOnce(state(1));render();await flush();
  const lost=deferred();vi.mocked(request).mockImplementationOnce(()=>lost.promise);
  const sent=render().act('move',{move:'attack'});const body=vi.mocked(request).mock.calls[1][1];
  visibility('hidden');net.onLine=false;win.dispatchEvent(new Event('offline'));lost.reject(new CloudError('lost',0));await sent;
  expect(render().uncertain).toEqual(body);expect(render().connected).toBe(false);
  vi.mocked(request).mockResolvedValue(state(2));net.onLine=true;win.dispatchEvent(new Event('online'));visibility('visible');await flush();
  expect(render().uncertain).toEqual(body);await render().retry();await flush();
  const posts=vi.mocked(request).mock.calls.filter(c=>c[1]);expect(posts).toHaveLength(2);expect(posts[0][1]).toEqual(posts[1][1]);expect(render().uncertain).toBe(null);
 });
 it('invalidates page-cache requests, synchronizes on pageshow, and restores an expired result',async()=>{
  const stale=deferred();vi.mocked(request).mockImplementationOnce(()=>stale.promise);render();
  win.dispatchEvent(new Event('pagehide'));expect(render().connected).toBe(false);
  const ended={...state(4),room:{...state(4).room!,status:'finished' as const,reason:'timeout'}};vi.mocked(request).mockResolvedValueOnce(ended);
  win.dispatchEvent(new Event('pageshow'));await flush();expect(render().state?.room?.status).toBe('finished');expect(render().connected).toBe(true);
  stale.resolve(state(1));await flush();expect(render().state?.room?.revision).toBe(4);
 });
 it('blocks the previous render action synchronously while foreground refresh is pending',async()=>{
  vi.mocked(request).mockResolvedValueOnce(state(1));render();await flush();const ready=render();
  const fresh=deferred();vi.mocked(request).mockImplementationOnce(()=>fresh.promise);
  visibility('hidden');visibility('visible');
  expect(await ready.act('move',{move:'attack'})).toBe(false);
  expect(vi.mocked(request).mock.calls.filter(c=>c[1])).toHaveLength(0);
  fresh.resolve(state(2));await flush();expect(render().connected).toBe(true);
 });
 it.each([0,502])('blocks an old action before React commits an uncertain error %s',async(status)=>{
  vi.mocked(request).mockResolvedValueOnce(state(1));render();await flush();const ready=render();
  vi.mocked(request).mockRejectedValueOnce(new CloudError('lost reply',status));
  await ready.act('move',{move:'attack'});
  expect(await ready.act('move',{move:'attack'})).toBe(false);
  expect(vi.mocked(request).mock.calls.filter(c=>c[1])).toHaveLength(1);
  expect(render().uncertain).toEqual(vi.mocked(request).mock.calls[1][1]);
 });
 it('retains uncertain identity even if a fresh poll arrives before the next render',async()=>{
  vi.mocked(request).mockResolvedValueOnce(state(1));render();await flush();const ready=render();
  vi.mocked(request).mockRejectedValueOnce(new CloudError('lost reply',0));await ready.act('move',{move:'attack'});
  vi.mocked(request).mockResolvedValue(state(2));await vi.advanceTimersByTimeAsync(3000);
  expect(await ready.act('move',{move:'attack'})).toBe(false);
  expect(vi.mocked(request).mock.calls.filter(c=>c[1])).toHaveLength(1);
  await render().retry();expect(vi.mocked(request).mock.calls.filter(c=>c[1]).map(c=>c[1])).toEqual([vi.mocked(request).mock.calls[1][1],vi.mocked(request).mock.calls[1][1]]);
 });
 it('never sends a hidden-tab action and removes lifecycle listeners on unmount',async()=>{
  vi.mocked(request).mockResolvedValue(state(1));render();await flush();const ready=render();
  visibility('hidden');expect(await ready.act('move',{move:'attack'})).toBe(false);expect(request).toHaveBeenCalledTimes(1);
  hooks.cleanups.splice(0).forEach(f=>f());visibility('visible');win.dispatchEvent(new Event('online'));win.dispatchEvent(new Event('pageshow'));
  await vi.advanceTimersByTimeAsync(15000);expect(request).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
 });
});
