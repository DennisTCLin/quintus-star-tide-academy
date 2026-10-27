import {afterEach,it,expect,vi} from 'vitest';
import {prepareCompanionAudio} from '../companion-audio';
afterEach(()=>vi.unstubAllGlobals());
for(const initial of ['suspended','interrupted'])it(`waits for asynchronous ${initial} Safari context resume before cached playback`,async()=>{
  const context={state:initial,resume:vi.fn(async()=>{await Promise.resolve();context.state='running';})};
  const playback=prepareCompanionAudio(context as unknown as AudioContext);
  expect(context.resume).toHaveBeenCalledOnce();expect(context.state).toBe(initial);expect(await playback.ready).toBe(true);expect(context.state).toBe('running');
});
it('recreates a closed context and reports denied autoplay without an unhandled rejection',async()=>{
  class Context {state='suspended';resume(){return Promise.reject(new Error('blocked'));}}
  vi.stubGlobal('AudioContext',Context);const old={state:'closed'} as AudioContext;const prepared=prepareCompanionAudio(old);expect(prepared.context).not.toBe(old);expect(await prepared.ready).toBe(false);
});
