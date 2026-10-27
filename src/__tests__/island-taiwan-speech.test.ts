import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelSpeech, sayThen, speakOnDemand } from '../island/speech';
import { speak, stopVoice, subscribeVoiceActivity } from '../voice';

let voices: {lang:string}[], events: EventTarget;
beforeEach(() => {
  vi.useFakeTimers(); voices=[]; events=new EventTarget();
  vi.stubGlobal('window',{speechSynthesis:{cancel:vi.fn(),speak:vi.fn(),getVoices:()=>voices,
    addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)}});
  vi.stubGlobal('SpeechSynthesisUtterance',class {constructor(public text:string){}});
});
afterEach(()=>{cancelSpeech();stopVoice();vi.unstubAllGlobals();vi.useRealTimers();});
const calls=()=>vi.mocked(window.speechSynthesis.speak).mock.calls;

describe('Math Island Taiwan voice contract',()=>{
  it.each(['zh-TW','zh_TW','cmn-Hant-TW','zh-Hant-TW'])('prefers the supported Taiwan alias %s over other Chinese voices',alias=>{
    voices=[{lang:'zh-HK'},{lang:'zh-CN'},{lang:alias}];
    speakOnDemand('我們來數魚。');
    expect(calls()).toHaveLength(1);
    expect(calls()[0][0].voice).toBe(voices[2]);
  });
  it('waits for Taiwan voices to load and does not request the device default',()=>{
    const done=vi.fn(), error=vi.fn();sayThen('一',done,true,error);
    expect(calls()).toHaveLength(0);
    voices=[{lang:'zh-CN'}];events.dispatchEvent(new Event('voiceschanged'));
    expect(calls()).toHaveLength(0);
    voices.push({lang:'zh_TW'});events.dispatchEvent(new Event('voiceschanged'));
    expect(calls()).toHaveLength(1);expect(calls()[0][0].voice).toBe(voices[1]);
    calls()[0][0].onend!({} as SpeechSynthesisEvent);vi.runAllTimers();
    expect(done).toHaveBeenCalledOnce();expect(error).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reports missing Taiwan speech without substituting Cantonese and still completes visual teaching',()=>{
    voices=[{lang:'zh-HK'},{lang:'zh-CN'}];
    const done=vi.fn(),error=vi.fn();sayThen('我們來數魚。',done,true,error);
    vi.advanceTimersByTime(1200);
    expect(calls()).toHaveLength(0);expect(error).toHaveBeenCalledWith(expect.stringContaining('臺灣中文語音'));
    vi.runAllTimers();expect(done).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps a deliberate ear replay enabled when automatic speech is off',()=>{
    voices=[{lang:'zh_TW'}];sayThen('自動朗讀',undefined,false);speakOnDemand('四');
    expect(calls()).toHaveLength(1);expect(calls()[0][0].text).toBe('四');
  });
  it('cancels delayed voice discovery when the demonstration is left',()=>{
    const done=vi.fn(),error=vi.fn();const stop=sayThen('一',done,true,error);stop();
    voices=[{lang:'zh-TW'}];events.dispatchEvent(new Event('voiceschanged'));vi.runAllTimers();
    expect(calls()).toHaveLength(0);expect(done).not.toHaveBeenCalled();expect(error).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
  });
  it('does not let island cleanup or its watchdog stop newer shared narration',()=>{
    voices=[{lang:'zh-TW'}];const done=vi.fn();const stop=sayThen('一',done);
    speak('新的頁面');const cancels=vi.mocked(window.speechSynthesis.cancel).mock.calls.length;
    stop();vi.runAllTimers();
    expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(cancels);
    expect(done).not.toHaveBeenCalled();
  });
  it('tracks island narration activity until completion and ignores duplicated engine endings',()=>{
    voices=[{lang:'zh-TW'}];const activity=vi.fn(),done=vi.fn();const off=subscribeVoiceActivity(activity);
    sayThen('一',done);const u=calls()[0][0];u.onend!({} as SpeechSynthesisEvent);u.onend!({} as SpeechSynthesisEvent);
    vi.runAllTimers();expect(activity.mock.calls.map(x=>x[0])).toEqual([false,true,false]);expect(done).toHaveBeenCalledOnce();off();
  });
  it('never advances a replaced demo through its watchdog even without island cleanup',()=>{
    voices=[{lang:'zh-TW'}];const done=vi.fn(()=>sayThen('二'));
    sayThen('一',done);vi.advanceTimersByTime(100);speak('新的頁面說明');
    const cancels=vi.mocked(window.speechSynthesis.cancel).mock.calls.length;
    vi.runAllTimers();
    expect(done).not.toHaveBeenCalled();expect(calls()).toHaveLength(2);
    expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(cancels);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('shows usable guidance for devices without a speech engine, without promising a recording button',()=>{
    vi.stubGlobal('window',{});const done=vi.fn(),error=vi.fn();sayThen('一',done,true,error);vi.runAllTimers();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('看圖'));expect(error.mock.calls[0][0]).not.toContain('錄音');expect(done).toHaveBeenCalledOnce();
  });
  it('preserves a new playback started synchronously by an error callback',()=>{
    voices=[{lang:'zh-TW'}];const oldDone=vi.fn(),newDone=vi.fn();
    vi.mocked(window.speechSynthesis.speak).mockImplementationOnce(u=>u.onerror!({} as SpeechSynthesisErrorEvent));
    sayThen('一',oldDone,true,()=>sayThen('二',newDone));vi.runAllTimers();
    expect(oldDone).not.toHaveBeenCalled();expect(newDone).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
  });
});
