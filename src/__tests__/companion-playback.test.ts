import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {startCompanionPlayback,COMPANION_FRAME_TIMEOUT} from '../companion-playback';
class Video extends EventTarget {
  muted=false;defaultMuted=false;playsInline=false;readyState=0;videoWidth=0;currentTime=0;duration=4;
  setAttribute=vi.fn();pause=vi.fn();play=vi.fn(()=>Promise.resolve());
  frames=new Map<number,()=>void>();next=0;
  requestVideoFrameCallback: ((callback:()=>void)=>number)|undefined=callback=>{this.frames.set(++this.next,callback);return this.next;};
  cancelVideoFrameCallback=vi.fn((id:number)=>{this.frames.delete(id);});
  present(){this.readyState=2;this.videoWidth=640;this.currentTime+=.1;const pending=[...this.frames.values()];this.frames.clear();pending.forEach(f=>f());}
  fire(name:string){this.dispatchEvent(new Event(name));}
}
const setup=(v=new Video())=>{const events={frame:vi.fn(),failed:vi.fn(),playing:vi.fn(),ended:vi.fn()};const stop=startCompanionPlayback(v as unknown as HTMLVideoElement,events);return {v,events,stop};};
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
describe('companion visible frame and stalled media recovery',()=>{
 it('keeps the independent poster until a decoded frame, not just a resolved play promise',async()=>{
  const {v,events,stop}=setup();await Promise.resolve();v.fire('playing');expect(events.frame).toHaveBeenLastCalledWith(false);expect(events.playing).toHaveBeenCalledWith(4);
  expect(v.muted&&v.defaultMuted&&v.playsInline).toBe(true);expect(v.setAttribute).toHaveBeenCalledWith('muted','');v.present();expect(events.frame).toHaveBeenLastCalledWith(true);for(let i=0;i<10;i++){vi.advanceTimersByTime(1000);v.currentTime+=1;v.fire('timeupdate');}expect(events.failed).not.toHaveBeenCalled();stop();
 });
 it('bounds a permanently pending play with no error, and completes failure only once',()=>{
  const v=new Video();v.play.mockImplementation(()=>new Promise(()=>{}));const {events,stop}=setup(v);
  vi.advanceTimersByTime(COMPANION_FRAME_TIMEOUT-1);expect(events.failed).not.toHaveBeenCalled();vi.advanceTimersByTime(1);expect(events.failed).toHaveBeenCalledTimes(1);expect(events.frame).toHaveBeenLastCalledWith(false);v.fire('error');v.fire('ended');expect(events.failed).toHaveBeenCalledTimes(1);expect(events.ended).not.toHaveBeenCalled();stop();
 });
 it('restores the poster on a stall, recovers on a fresh frame, and bounds repeated stall events',()=>{
  const {v,events,stop}=setup();v.present();v.fire('waiting');expect(events.frame).toHaveBeenLastCalledWith(false);vi.advanceTimersByTime(3000);v.fire('playing');v.present();expect(events.frame).toHaveBeenLastCalledWith(true);for(let i=0;i<9;i++){vi.advanceTimersByTime(1000);v.currentTime+=1;v.fire('timeupdate');}expect(events.failed).not.toHaveBeenCalled();
  v.fire('waiting');for(let i=0;i<8;i++){vi.advanceTimersByTime(1000);v.fire('stalled');}expect(events.failed).toHaveBeenCalledTimes(1);stop();
 });
 it('bounds a silent freeze after a frame, and ignores a cancelled pre-stall frame callback',()=>{
  const {v,events,stop}=setup();const stale=[...v.frames.values()][0];v.fire('waiting');v.readyState=2;v.videoWidth=640;stale();expect(events.frame).toHaveBeenLastCalledWith(false);v.present();expect(events.frame).toHaveBeenLastCalledWith(true);vi.advanceTimersByTime(COMPANION_FRAME_TIMEOUT);expect(events.failed).toHaveBeenCalledTimes(1);expect(events.frame).toHaveBeenLastCalledWith(false);stop();
 });
 it('handles rejection and synchronous playback errors',async()=>{
  for(const synchronous of [false,true]){const v=new Video();v.play.mockImplementation(()=>{if(synchronous)throw new Error('blocked');return Promise.reject(new Error('blocked'));});const {events,stop}=setup(v);await Promise.resolve();expect(events.failed).toHaveBeenCalledTimes(1);expect(events.frame).toHaveBeenLastCalledWith(false);stop();}
 });
 it('ignores late rejected promises, frame callbacks and events after motion switch or background cleanup',async()=>{
  const v=new Video();let reject!:(e:Error)=>void;v.play.mockImplementation(()=>new Promise((_,r)=>{reject=r;}));const {events,stop}=setup(v);const oldFrame=[...v.frames.values()][0];stop();events.frame.mockClear();reject(new Error('old motion'));await Promise.resolve();oldFrame();v.fire('error');v.fire('playing');v.fire('ended');vi.advanceTimersByTime(9000);expect(events.frame).not.toHaveBeenCalled();expect(events.failed).not.toHaveBeenCalled();expect(events.playing).not.toHaveBeenCalled();expect(events.ended).not.toHaveBeenCalled();
 });
 it('requires advancing decoded media when frame callback is unavailable',()=>{
  const v=new Video();v.requestVideoFrameCallback=undefined;const {events,stop}=setup(v);v.fire('playing');v.fire('timeupdate');expect(events.frame).toHaveBeenLastCalledWith(false);v.readyState=2;v.videoWidth=640;v.currentTime=1;v.fire('timeupdate');expect(events.frame).toHaveBeenLastCalledWith(true);v.fire('waiting');v.fire('timeupdate');expect(events.frame).toHaveBeenLastCalledWith(false);v.currentTime=1.1;v.fire('timeupdate');expect(events.frame).toHaveBeenLastCalledWith(true);stop();
 });
 it('completes normally without the old load watchdog causing a later failure',()=>{
  const {v,events,stop}=setup();v.present();v.fire('ended');expect(events.ended).toHaveBeenCalledTimes(1);vi.advanceTimersByTime(9000);expect(events.failed).not.toHaveBeenCalled();stop();
 });
});
