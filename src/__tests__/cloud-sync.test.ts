import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

// Minimal hook scheduler: exercise actual request/event ordering without a DOM.
const hooks=vi.hoisted(()=>({slots:[] as any[],index:0,effects:[] as (()=>void)[],cleanups:[] as (()=>void)[]}));
vi.mock('react',()=>({
 useState:(initial:unknown)=>{const i=hooks.index++;if(!(i in hooks.slots))hooks.slots[i]=initial;return [hooks.slots[i],(value:any)=>{hooks.slots[i]=typeof value==='function'?value(hooks.slots[i]):value;}];},
 useRef:(initial:unknown)=>{const i=hooks.index++;if(!(i in hooks.slots))hooks.slots[i]={current:initial};return hooks.slots[i];},
 useEffect:(effect:()=>void|(()=>void),deps:unknown[])=>{const i=hooks.index++;if(!hooks.slots[i]||deps.some((d,n)=>d!==hooks.slots[i][n])){hooks.slots[i]=deps;hooks.effects.push(()=>{const clean=effect();if(clean)hooks.cleanups.push(clean);});}}
}));
import {useCloud,type CloudState} from '../cloud';
const state=(revision:number,username='trial',csrf='csrf-a'):CloudState=>({family:{revision},username,csrf,questions:{},day:'2026-10-27',verified:{},legacy:false,canMigrate:false} as CloudState);
const response=(value:unknown,status=200)=>({ok:status===200,status,json:async()=>value});
const deferred=()=>{let resolve!:(v:any)=>void,reject!:(e:unknown)=>void;const promise=new Promise<any>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const render=()=>{hooks.index=0;const value=useCloud();hooks.effects.splice(0).forEach(f=>f());return value;};
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
let fetcher:ReturnType<typeof vi.fn>,win:EventTarget;
beforeEach(()=>{hooks.slots=[];hooks.index=0;hooks.effects=[];hooks.cleanups=[];vi.useFakeTimers();vi.stubGlobal('document',Object.assign(new EventTarget(),{visibilityState:'visible'}));win=new EventTarget();vi.stubGlobal('window',win);fetcher=vi.fn().mockResolvedValue(response(state(1)));vi.stubGlobal('fetch',fetcher);});
afterEach(()=>{hooks.cleanups.forEach(f=>f());vi.useRealTimers();vi.unstubAllGlobals();});
const init=async()=>{render();await flush();return render();};
const posts=()=>fetcher.mock.calls.filter(c=>c[1].method==='POST');
describe('game action during passive synchronization',()=>{
 it('waits for the read and sends exactly one answer using the refreshed revision',async()=>{
  const app=await init(),read=deferred(),write=deferred();fetcher.mockReturnValueOnce(read.promise).mockReturnValueOnce(write.promise);
  const refreshing=app.refresh(),sent=app.mutate({type:'answer',index:0});expect(posts()).toHaveLength(0);
  read.resolve(response(state(9)));await refreshing;await flush();expect(posts()).toHaveLength(1);expect(JSON.parse(posts()[0][1].body)).toMatchObject({revision:9,command:{type:'answer',index:0}});
  write.resolve(response({...state(10),result:true}));await expect(sent).resolves.toBe(true);
 });
 it('allows only one of two waiting writes, and does not queue another active write',async()=>{
  const app=await init(),read=deferred(),write=deferred();fetcher.mockReturnValueOnce(read.promise).mockReturnValueOnce(write.promise);
  const refreshing=app.refresh(),first=app.mutate({type:'answer'}),second=app.mutate({type:'answer'}).catch(e=>e);
  read.resolve(response(state(2)));await refreshing;await flush();expect(await second).toBeInstanceOf(Error);expect(posts()).toHaveLength(1);
  await expect(app.mutate({type:'answer'})).rejects.toThrow('正在同步');expect(posts()).toHaveLength(1);
  write.resolve(response({...state(3),result:true}));await first;
 });
 it.each([401,503,0])('never posts after a failed refresh (%s), even from the old render',async status=>{
  const app=await init(),read=deferred();fetcher.mockReturnValueOnce(read.promise);const refreshing=app.refresh(),sent=app.mutate({type:'answer'}).catch(e=>e);
  if(status)read.resolve(response({error:'unavailable'},status));else read.reject(new Error('network lost'));
  await refreshing;expect(await sent).toBeInstanceOf(Error);expect(posts()).toHaveLength(0);await expect(app.mutate({type:'answer'})).rejects.toThrow();expect(posts()).toHaveLength(0);
 });
 it('blocks the old callback synchronously on offline, then allows it after a successful read',async()=>{
  const app=await init();win.dispatchEvent(new Event('offline'));await expect(app.mutate({type:'answer'})).rejects.toThrow();expect(posts()).toHaveLength(0);
  fetcher.mockResolvedValueOnce(response(state(2))).mockResolvedValueOnce(response({...state(3),result:true}));await app.refresh();await expect(app.mutate({type:'answer'})).resolves.toBe(true);
 });
 it('rejects an answer if the read changes account or session',async()=>{
  const app=await init(),read=deferred();fetcher.mockReturnValueOnce(read.promise);const refreshing=app.refresh(),sent=app.mutate({type:'answer'}).catch(e=>e);
  read.resolve(response(state(2,'other','csrf-b')));await refreshing;expect(await sent).toBeInstanceOf(Error);expect(posts()).toHaveLength(0);
 });
 it('never queues new input behind uncertain command recovery and reuses its exact request',async()=>{
  const app=await init();fetcher.mockRejectedValueOnce(new Error('lost')).mockRejectedValueOnce(new Error('lost'));
  await expect(app.mutate({type:'answer'})).rejects.toThrow();expect(posts()).toHaveLength(2);const original=posts()[0][1];expect(posts()[1][1].body).toBe(original.body);
  const recovery=deferred();fetcher.mockReturnValueOnce(recovery.promise);const refreshing=app.refresh();await expect(app.mutate({type:'answer'})).rejects.toThrow('請先確認同步');expect(posts()).toHaveLength(3);expect(posts()[2][1].body).toBe(original.body);expect(posts()[2][1].headers).toEqual(original.headers);
  recovery.resolve(response(state(2)));await refreshing;
 });
 it('releases the read barrier after invalid JSON and permits a later healthy refresh',async()=>{
  const app=await init(),read=deferred();fetcher.mockReturnValueOnce(read.promise);const refreshing=app.refresh(),sent=app.mutate({type:'answer'}).catch(e=>e);
  read.resolve({ok:true,status:200,json:async()=>{throw Error('invalid json')}});await refreshing;expect(await sent).toBeInstanceOf(Error);expect(posts()).toHaveLength(0);
  fetcher.mockResolvedValueOnce(response(state(2))).mockResolvedValueOnce(response({...state(3),result:true}));await app.refresh();await expect(app.mutate({type:'answer'})).resolves.toBe(true);
 });
});
