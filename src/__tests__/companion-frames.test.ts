import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { companionFrames, prefersCompanionFrames, startCompanionFrames, type FrameClip } from '../companion-frames';
import { existsSync, readFileSync } from 'node:fs';
const clip: FrameClip = { fps: 2, size: 256, columns: 2, perSheet: 2, frames: 4, duration: 2, sheets: ['a.jpg','b.jpg'] };
let images: FakeImage[], frames: Map<number, FrameRequestCallback>, seq: number;
class FakeImage { onload: (()=>void)|null=null; onerror: (()=>void)|null=null; src=''; constructor(){images.push(this);} removeAttribute(){this.src='';} }
function rig(loop=false, source=clip) {
 const draw=vi.fn(), events={ready:vi.fn(),failed:vi.fn(),ended:vi.fn()}, canvas={getContext:()=>({drawImage:draw}),dataset:{}};
 const stop=startCompanionFrames(canvas as unknown as HTMLCanvasElement,source,loop,events);
 return {draw,events,canvas,stop};
}
function tick(t:number) { const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(t)); }
beforeEach(()=>{vi.useFakeTimers();images=[];frames=new Map();seq=0;vi.stubGlobal('Image',FakeImage);vi.stubGlobal('requestAnimationFrame',(f:FrameRequestCallback)=>{frames.set(++seq,f);return seq;});vi.stubGlobal('cancelAnimationFrame',(n:number)=>frames.delete(n));});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('compatible footage playback',()=>{
 it('waits for every sheet then draws distinct frames through full duration and completes once',()=>{
  const r=rig();images[0].onload?.();tick(0);expect(r.draw).not.toHaveBeenCalled();vi.advanceTimersByTime(3000);images[1].onload?.();tick(4000);expect(r.events.ready).toHaveBeenCalledTimes(1);tick(4600);expect(r.draw.mock.calls.at(-1)?.slice(1,3)).toEqual([256,0]);tick(5100);expect(r.draw.mock.calls.at(-1)?.[0]).toBe(images[1]);expect(r.events.ended).not.toHaveBeenCalled();tick(6000);tick(7000);expect(r.events.ended).toHaveBeenCalledTimes(1);r.stop();
 });
 it('draws rectangular outcome footage without changing square companion geometry',()=>{
  const r=rig(false,{...clip,size:480,cellHeight:270,columns:1});images.forEach(i=>i.onload?.());tick(0);tick(600);
  expect(r.canvas).toMatchObject({width:480,height:270});
  expect(r.draw.mock.calls.at(-1)?.slice(1)).toEqual([0,270,480,270,0,0,480,270]);r.stop();
 });
 it('loops past full duration and cleanup ignores stale load callbacks',()=>{
  const r=rig(true);images.forEach(i=>i.onload?.());tick(0);tick(2500);expect(r.canvas.dataset).toEqual({frame:'1'});expect(r.events.ended).not.toHaveBeenCalled();const late=images[0].onload;r.stop();late?.();tick(3000);expect(frames.size).toBe(0);expect(images.every(i=>!i.src)).toBe(true);
 });
 it('bounds failed or hung sheet loads and suppresses late completion',()=>{
  const r=rig();const late=images[0].onload;vi.advanceTimersByTime(8000);late?.();images[1].onload?.();tick(9000);expect(r.events.failed).toHaveBeenCalledTimes(1);expect(r.draw).not.toHaveBeenCalled();r.stop();
 });
 it('handles decode or canvas errors and a fresh action starts at frame zero',()=>{
  const first=rig();images[0].onerror?.();expect(first.events.failed).toHaveBeenCalledTimes(1);first.stop();images=[];const second=rig();images.forEach(i=>i.onload?.());tick(9999);expect(second.canvas.dataset).toEqual({frame:'0'});second.draw.mockImplementation(()=>{throw Error('draw');});tick(10500);expect(second.events.failed).toHaveBeenCalledTimes(1);second.stop();
 });
 it('uses legacy playback for iOS15 mobile and desktop iPad, not desktop Mac or newer iOS',()=>{
  expect(prefersCompanionFrames('Mozilla/5.0 (iPad; CPU OS 15_4_1 like Mac OS X) Version/15.4 Mobile Safari',5)).toBe(true);
  expect(prefersCompanionFrames('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/15.4 Safari',5)).toBe(true);
  expect(prefersCompanionFrames('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Version/15.4 Safari',0)).toBe(false);
  expect(prefersCompanionFrames('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Version/17.0 Mobile Safari',5)).toBe(false);
 });
 it('ships distinct, bounded JPEG footage for all six actions for both mascots',()=>{
  const paths=new Set<string>();
  for(const mascot of ['dog','tideglow'] as const)for(const motion of ['pet','feed','play','highfive','bubbles','rest'] as const){
   const c=companionFrames(mascot,motion)!;expect(c.frames).toBeGreaterThan(40);expect(c.duration).toBe(c.frames/c.fps);expect(c.sheets.length).toBe(Math.ceil(c.frames/c.perSheet));expect(c.sheets.length).toBeLessThanOrEqual(2);expect(c.size*c.columns).toBeLessThanOrEqual(2048);
   for(const p of c.sheets){expect(paths.has(p)).toBe(false);paths.add(p);expect(existsSync('public'+p)).toBe(true);expect(readFileSync('public'+p).subarray(0,2).toString('hex')).toBe('ffd8');}
  }
  expect(companionFrames('dog','idle')).toBeUndefined();
 });
});
