import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {CompanionRecorder,recordingMime,MAX_RECORDING_MS,microphoneMessage,encodeRecording} from '../companion-recorder';
let instances: FakeRecorder[], track:{stop:ReturnType<typeof vi.fn>;addEventListener:ReturnType<typeof vi.fn>};
class FakeRecorder {
  static isTypeSupported=(mime:string)=>mime==='audio/mp4';
  state='inactive';mimeType='audio/mp4';ondataavailable?: (e:{data:Blob})=>void;onstop?:()=>void;onerror?:()=>void;
  constructor(public stream:unknown,public options:unknown){instances.push(this);}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array(150)],{type:this.mimeType})});this.onstop?.();}
}
const stream=()=>({getTracks:()=>[track],getAudioTracks:()=>[track]});
beforeEach(()=>{instances=[];track={stop:vi.fn(),addEventListener:vi.fn()};vi.stubGlobal('isSecureContext',true);vi.stubGlobal('MediaRecorder',FakeRecorder);vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:vi.fn(async()=>stream())}});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('bounded Safari-compatible microphone ownership',()=>{
  it('selects AAC/MP4 on Safari and Opus/WebM elsewhere',()=>{
    expect(recordingMime(FakeRecorder as unknown as typeof MediaRecorder)).toBe('audio/mp4');
    expect(recordingMime({isTypeSupported:m=>m==='audio/webm;codecs=opus'})).toBe('audio/webm;codecs=opus');
    expect(recordingMime({isTypeSupported:()=>false})).toBeUndefined();
  });
  it('records audio only, sends once and stops the track',async()=>{
    const ready=vi.fn(),audio=vi.fn(),error=vi.fn(),r=new CompanionRecorder(ready,audio,error);
    await r.start();expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(expect.objectContaining({video:false}));expect(ready).toHaveBeenCalledOnce();
    r.stop();expect(audio).toHaveBeenCalledOnce();expect(audio.mock.calls[0][0].type).toBe('audio/mp4');expect(track.stop).toHaveBeenCalledOnce();expect(error).not.toHaveBeenCalled();r.cancel();expect(audio).toHaveBeenCalledOnce();
  });
  it('cancels a still-pending permission without ever starting capture',async()=>{
    let release!:(s:MediaStream)=>void;vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(new Promise(resolve=>{release=resolve;}));
    const ready=vi.fn(),audio=vi.fn(),r=new CompanionRecorder(ready,audio,vi.fn());const work=r.start();r.cancel();release(stream() as unknown as MediaStream);await work;
    expect(track.stop).toHaveBeenCalledOnce();expect(ready).not.toHaveBeenCalled();expect(audio).not.toHaveBeenCalled();expect(instances).toHaveLength(0);
  });
  it('discards canceled audio and stops on maximum length',async()=>{
    vi.useFakeTimers();const audio=vi.fn(),r=new CompanionRecorder(vi.fn(),audio,vi.fn());await r.start();r.cancel();vi.advanceTimersByTime(MAX_RECORDING_MS);expect(audio).not.toHaveBeenCalled();
    const second=new CompanionRecorder(vi.fn(),audio,vi.fn());await second.start();vi.advanceTimersByTime(MAX_RECORDING_MS);expect(audio).toHaveBeenCalledOnce();expect(track.stop).toHaveBeenCalledTimes(2);
  });
  it('reports denied permission and oversized recordings without uploading',async()=>{
    const error=vi.fn(),audio=vi.fn();vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException('denied','NotAllowedError'));
    await new CompanionRecorder(vi.fn(),audio,error).start();expect(error).toHaveBeenCalledWith(expect.stringContaining('允許麥克風'));
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(stream() as unknown as MediaStream);const r=new CompanionRecorder(vi.fn(),audio,error);await r.start();instances[0].ondataavailable?.({data:new Blob([new Uint8Array(650001)])});expect(audio).not.toHaveBeenCalled();expect(track.stop).toHaveBeenCalledOnce();
  });
  it('encodes bytes without data URL prefix; gives device-specific recovery',async()=>{
    expect(await encodeRecording(new Blob(['test']))).toBe('dGVzdA==');
    expect(microphoneMessage(new DOMException('','NotFoundError'))).toContain('找不到麥克風');
  });
});
it('retries only unsupported processing constraints with plain audio for Safari',async()=>{
  const error=Object.assign(new Error('invalid constraint'),{name:'OverconstrainedError'});
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error).mockResolvedValueOnce(stream() as unknown as MediaStream);
  const ready=vi.fn(),r=new CompanionRecorder(ready,vi.fn(),vi.fn());await r.start();expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({audio:true,video:false});expect(ready).toHaveBeenCalledOnce();r.cancel();
});
