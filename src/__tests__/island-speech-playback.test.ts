import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelSpeech, sayThen } from '../island/speech';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { speechSynthesis: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [{lang:'zh-TW'}] } });
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
});
afterEach(() => { cancelSpeech(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Math Island demonstration playback ownership', () => {
  it('gives a replay its entire first step instead of the previous timer remainder', () => {
    const oldStep = vi.fn(), newStep = vi.fn();
    const stop = sayThen('我們來數魚。一條一條點，點過的魚會出現數字。', oldStep, false);
    vi.advanceTimersByTime(1500);
    stop();
    sayThen('我們來數魚。一條一條點，點過的魚會出現數字。', newStep, false);
    vi.advanceTimersByTime(100);
    expect(oldStep).not.toHaveBeenCalled();
    expect(newStep).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1500);
    expect(newStep).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves only the latest timer after rapid replay and cancels it when leaving', () => {
    const done = vi.fn();
    for (let i=0;i<30;i++) sayThen('看我示範喔！', done, false);
    expect(vi.getTimerCount()).toBe(1);
    cancelSpeech();
    vi.runAllTimers();
    expect(done).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not let an old effect cleanup or late speech events cancel/advance a newer step', () => {
    const old = vi.fn(), current = vi.fn();
    const stopOld = sayThen('一', old);
    const first = vi.mocked(window.speechSynthesis.speak).mock.calls[0][0];
    sayThen('二', current);
    const second = vi.mocked(window.speechSynthesis.speak).mock.calls[1][0];
    stopOld();
    first.onend!({} as SpeechSynthesisEvent);
    first.onerror!({} as SpeechSynthesisErrorEvent);
    expect(vi.getTimerCount()).toBe(1);
    second.onend!({} as SpeechSynthesisEvent);
    vi.runAllTimers();
    expect(old).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('completes only once after both end/error callbacks and releases its watchdog', () => {
    const done = vi.fn();
    sayThen('三', done);
    const utterance = vi.mocked(window.speechSynthesis.speak).mock.calls[0][0];
    utterance.onerror!({} as SpeechSynthesisErrorEvent);
    expect(vi.getTimerCount()).toBe(1);
    utterance.onend!({} as SpeechSynthesisEvent);
    utterance.onerror!({} as SpeechSynthesisErrorEvent);
    vi.runAllTimers();
    expect(done).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('continues visibly if the device throws while starting speech', () => {
    vi.mocked(window.speechSynthesis.speak).mockImplementation(() => { throw new Error('device unavailable'); });
    const done = vi.fn();
    expect(() => sayThen('四', done)).not.toThrow();
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(300);
    expect(done).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
