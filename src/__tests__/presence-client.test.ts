import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../cloud', () => ({ request: vi.fn() }));
import { request } from '../cloud';
import { lastSeenLabel, trackPresence } from '../presence';

describe('presence lifecycle and relative times', () => {
  let doc: EventTarget & {visibilityState: string};
  let win: EventTarget;
  let net: {onLine:boolean};
  let stops: (()=>void)[];
  const state={serverNow:1000,friends:[]};
  beforeEach(()=>{
    vi.useFakeTimers(); vi.setSystemTime(1000); vi.mocked(request).mockReset().mockResolvedValue(state);
    doc=Object.assign(new EventTarget(),{visibilityState:'visible'});win=new EventTarget();net={onLine:true};stops=[];
    vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('navigator',net);
  });
  afterEach(()=>{stops.forEach(stop=>stop());vi.useRealTimers();vi.unstubAllGlobals();});
  const flush=async()=>{await Promise.resolve();await Promise.resolve();};
  const start=(receive=vi.fn())=>{stops.push(trackPresence('feifei','test-csrf',receive));return receive;};
  it('reports foreground activity every ten seconds, leaves on background and resumes immediately',async()=>{
    start();await flush();expect(request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10000);expect(request).toHaveBeenCalledTimes(2);
    doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));await flush();
    expect(vi.mocked(request).mock.lastCall?.[1]).toMatchObject({active:false,sequence:3});
    expect(vi.mocked(request).mock.lastCall?.[3]).toBe(true);
    await vi.advanceTimersByTimeAsync(30000);expect(request).toHaveBeenCalledTimes(3);
    doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));await flush();
    expect(vi.mocked(request).mock.lastCall?.[1]).toMatchObject({active:true,sequence:4});
  });
  it('invalidates cached online state on disconnect and rejects late replies',async()=>{
    let resolve!: (value: typeof state)=>void;
    vi.mocked(request).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
    const receive=start();
    net.onLine=false;win.dispatchEvent(new Event('offline'));await flush();
    expect(receive).toHaveBeenLastCalledWith(null);
    resolve(state);await flush();expect(receive).toHaveBeenCalledTimes(1);
    net.onLine=true;win.dispatchEvent(new Event('online'));await flush();
    expect(receive).toHaveBeenLastCalledWith({data:state,receivedAt:1000});
  });
  it('uses separate lease IDs for tabs, cleans listeners and timers, and sends leave when unmounted',async()=>{
    start();start();await flush();
    const calls=vi.mocked(request).mock.calls;
    expect((calls[0][1] as {clientId:string}).clientId).not.toBe((calls[1][1] as {clientId:string}).clientId);
    stops.forEach(s=>s());stops=[];await flush();
    const count=vi.mocked(request).mock.calls.length;
    expect(vi.mocked(request).mock.lastCall?.[1]).toMatchObject({active:false});
    win.dispatchEvent(new Event('online'));doc.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(30000);expect(request).toHaveBeenCalledTimes(count);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('marks failures unknown and retries without changing cloud game state',async()=>{
    vi.mocked(request).mockRejectedValueOnce(new Error('offline'));
    const receive=start();await flush();expect(receive).toHaveBeenLastCalledWith(null);
    await vi.advanceTimersByTimeAsync(10000);expect(receive).toHaveBeenLastCalledWith({data:state,receivedAt:11000});
  });
  it('starts no active lease in background and restores after page cache navigation',async()=>{
    doc.visibilityState='hidden';start();await flush();expect(request).not.toHaveBeenCalled();
    doc.visibilityState='visible';win.dispatchEvent(new Event('pageshow'));await flush();
    expect(vi.mocked(request).mock.lastCall?.[1]).toMatchObject({active:true});
    win.dispatchEvent(new Event('pagehide'));await flush();
    expect(vi.mocked(request).mock.lastCall?.[1]).toMatchObject({active:false});
  });
  it('reads current activity without replacing the tab lease',async()=>{
    let activity:'home'|'battle'='home';
    stops.push(trackPresence('feifei','test-csrf',vi.fn(),()=>activity));await flush();
    const first=vi.mocked(request).mock.calls[0][1] as {clientId:string};
    activity='battle';await vi.advanceTimersByTimeAsync(10000);
    expect(vi.mocked(request).mock.lastCall?.[1]).toMatchObject({clientId:first.clientId,activity:'battle',sequence:2});
  });
  it('formats seconds, minutes, hours, days and unknown history without future negatives',()=>{
    expect(lastSeenLabel(null,1000)).toBe('上線時間未記錄');
    expect(lastSeenLabel(null,1000,true)).toBe('已有冒險紀錄・時間未記錄');
    expect(lastSeenLabel(2000,1000)).toBe('剛剛上線過');
    expect(lastSeenLabel(0,59999)).toBe('剛剛上線過');
    expect(lastSeenLabel(0,60000)).toBe('1 分鐘前上線');
    expect(lastSeenLabel(0,3600000)).toBe('1 小時前上線');
    expect(lastSeenLabel(0,86400000)).toBe('1 天前上線');
  });
});
