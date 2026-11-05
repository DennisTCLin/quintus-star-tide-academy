import { afterEach, describe, expect, it, vi } from 'vitest';
import { startNpcRaidWorker } from '../../server/conquest-npc-worker.mjs';
afterEach(()=>vi.useRealTimers());
describe('NPC background worker lifecycle',()=>{
 it('starts without requests, never overlaps and awaits an in-flight transaction on shutdown',async()=>{
  vi.useFakeTimers();let finish;const tick=vi.fn(()=>new Promise(r=>{finish=r;}));
  const worker=startNpcRaidWorker({tick,intervalMs:30});
  await vi.advanceTimersByTimeAsync(0);expect(tick).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1000);expect(tick).toHaveBeenCalledTimes(1);
  let stopped=false;const stopping=worker.stop().then(()=>{stopped=true;});await Promise.resolve();expect(stopped).toBe(false);
  finish();await stopping;await vi.advanceTimersByTimeAsync(1000);expect(tick).toHaveBeenCalledTimes(1);
 });
 it('retries failures and cancels future ticks on shutdown',async()=>{
  vi.useFakeTimers();const error=vi.fn(),tick=vi.fn().mockRejectedValueOnce(Error('database unavailable')).mockResolvedValue({raids:0});
  const worker=startNpcRaidWorker({tick,intervalMs:30,onError:error});
  await vi.advanceTimersByTimeAsync(0);expect(error).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(30);expect(tick).toHaveBeenCalledTimes(2);
  await worker.stop();await vi.advanceTimersByTimeAsync(1000);expect(tick).toHaveBeenCalledTimes(2);
 });
});
