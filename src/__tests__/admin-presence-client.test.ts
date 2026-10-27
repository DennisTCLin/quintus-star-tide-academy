import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {trackAdminPresence,presenceFor,type AdminPresenceData} from '../admin-presence';
describe('admin presence freshness and lifecycle',()=>{
 let doc:EventTarget&{visibilityState:string},win:EventTarget,net:{onLine:boolean},stop:()=>void;
 const data:AdminPresenceData={serverNow:1000,students:[{memberId:'one',onlineUntil:36000,lastSeenAt:1000,activity:'learning'}]};
 beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(1000);doc=Object.assign(new EventTarget(),{visibilityState:'visible'});win=new EventTarget();net={onLine:true};vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('navigator',net);});
 afterEach(()=>{stop?.();vi.useRealTimers();vi.unstubAllGlobals();});
 it('polls only visible online pages, invalidates background data and refreshes immediately on return',async()=>{
  const request=vi.fn().mockResolvedValue(data),receive=vi.fn();stop=trackAdminPresence(request,receive);await vi.advanceTimersByTimeAsync(0);expect(request).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(5000);expect(request).toHaveBeenCalledTimes(2);
  doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));expect(receive).toHaveBeenLastCalledWith(null);await vi.advanceTimersByTimeAsync(30000);expect(request).toHaveBeenCalledTimes(2);
  doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));await vi.advanceTimersByTimeAsync(0);expect(request).toHaveBeenCalledTimes(3);
  net.onLine=false;win.dispatchEvent(new Event('offline'));await vi.advanceTimersByTimeAsync(10000);expect(request).toHaveBeenCalledTimes(3);
  net.onLine=true;win.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(0);expect(request).toHaveBeenCalledTimes(4);
 });
 it('aborts stuck reads and does not let an old request overwrite a restored connection',async()=>{
  let resolve!:(d:AdminPresenceData)=>void;const first=new Promise<AdminPresenceData>(r=>resolve=r),request=vi.fn().mockReturnValueOnce(first).mockResolvedValue(data),receive=vi.fn();stop=trackAdminPresence(request,receive);
  const signal=request.mock.calls[0][0] as AbortSignal;await vi.advanceTimersByTimeAsync(8000);expect(signal.aborted).toBe(true);expect(receive).toHaveBeenLastCalledWith(null);
  await vi.advanceTimersByTimeAsync(2000);expect(request).toHaveBeenCalledTimes(2);const calls=receive.mock.calls.length;resolve({serverNow:1,students:[]});await vi.advanceTimersByTimeAsync(0);expect(receive).toHaveBeenCalledTimes(calls);
 });
 it('clears failed reads and ignores completions after logout or identity changes',async()=>{
  let resolve!:(d:AdminPresenceData)=>void;const request=vi.fn().mockRejectedValueOnce(Error('offline')).mockImplementationOnce(()=>new Promise<AdminPresenceData>(r=>resolve=r)),receive=vi.fn();stop=trackAdminPresence(request,receive);await vi.advanceTimersByTimeAsync(0);expect(receive).toHaveBeenLastCalledWith(null);
  await vi.advanceTimersByTimeAsync(5000);stop();const count=receive.mock.calls.length;resolve(data);await vi.advanceTimersByTimeAsync(10000);expect(receive).toHaveBeenCalledTimes(count);expect(request).toHaveBeenCalledTimes(2);
 });
 it('uses server lease time and distinguishes unknown from confirmed offline',()=>{
  const snapshot={data,receivedAt:100000};expect(presenceFor(snapshot,'one',100000).state).toBe('online');expect(presenceFor(snapshot,'one',115000).state).toBe('unknown');expect(presenceFor(snapshot,'missing',100000).state).toBe('unknown');
  expect(presenceFor({data:{...data,students:[{...data.students[0],onlineUntil:1001}]},receivedAt:100000},'one',100002).state).toBe('offline');expect(presenceFor(null,'one',100000).state).toBe('unknown');
 });
});
