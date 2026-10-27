import { afterEach, describe, expect, it, vi } from "vitest";
import { beginVoiceSession, narrationCheckpoint, playRecording, speak, stopVoice, subscribeVoiceActivity } from "../voice";
import { COMPANION_CARE_LINES, COMPANION_FIXED_LINES, companionFixedRecording } from '../companion-fixed-voice';
import { existsSync } from 'node:fs';
import { CARE_COPY } from '../tideglow-companion';

afterEach(() => {
  if (typeof window !== "undefined") stopVoice();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function speechMock(voices: { lang: string }[]) {
  const synth = { cancel: vi.fn(), getVoices: () => voices, speak: vi.fn() };
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal("SpeechSynthesisUtterance", class {
    constructor(public text: string) {}
  });
  return synth;
}

describe("question narration", () => {
  it('prevents a delayed guide reply from interrupting a newer microphone even after it finishes', () => {
    speechMock([{lang:'zh-TW'}]);
    stopVoice();
    const mayNarrate=narrationCheckpoint();
    expect(mayNarrate()).toBe(true);
    const microphone=beginVoiceSession(vi.fn());
    expect(mayNarrate()).toBe(false);
    microphone.finish();
    expect(mayNarrate()).toBe(false);
    expect(narrationCheckpoint()()).toBe(true);
  });
  it('uses Kiki only for exact reviewed fixed phrases, preserving free dialogue', () => {
    for (const action of ['pet', 'feed', 'play'] as const) {
      expect(COMPANION_FIXED_LINES[action]).toBe(CARE_COPY[action]);
      expect(companionFixedRecording(CARE_COPY[action])).toBe(`/assets/tideglow-voice/kiki-20261025/${action}.mp3`);
    }
    expect(companionFixedRecording('我喜歡海龜')).toBeUndefined();
  });
  it('resolves every new care instruction to an existing Kiki recording', () => {
    for (const [id, text] of Object.entries(COMPANION_CARE_LINES)) {
      const path = companionFixedRecording(text);
      expect(path).toBe(`/assets/tideglow-voice/kiki-care-20261025/${id}.mp3`);
      expect(existsSync(`public${path}`)).toBe(true);
    }
    for (const action of ['highfive', 'bubbles'] as const) {
      expect(CARE_COPY[action]).toBe(COMPANION_CARE_LINES[action]);
    }
  });

  it('lets a fixed recording release its own playback without stopping newer narration', async () => {
    speechMock([{lang:'zh-TW'}]);
    const instances: {pause: ReturnType<typeof vi.fn>; onended?: () => void}[] = [];
    vi.stubGlobal('Audio', class {
      pause=vi.fn(); onended?:()=>void;
      constructor(){instances.push(this);}
      play(){return Promise.resolve();}
    });
    const first=playRecording('/first.mp3',undefined,vi.fn(),vi.fn());
    const done=vi.fn();
    const second=playRecording('/second.mp3',undefined,done,vi.fn());
    first();
    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
    expect(instances[1].pause).not.toHaveBeenCalled();
    instances[1].onended?.();
    expect(second.isCurrent()).toBe(false);
    expect(done).toHaveBeenCalledOnce();
    await Promise.resolve();
  });
  it("reads English blanks using an English voice even when Chinese is listed first", () => {
    const voices = [{ lang: "zh-TW" }, { lang: "en-GB" }, { lang: "en-US" }];
    const synth = speechMock(voices);
    speak("Amy ____ her teeth every morning.", undefined, "en-US");
    expect(synth.speak.mock.calls[0][0]).toMatchObject({
      text: "Amy blank her teeth every morning.", lang: "en-US", voice: voices[2],
    });
  });

  it("reports a missing English voice instead of substituting a Chinese voice", () => {
    vi.useFakeTimers();
    const synth = speechMock([{ lang: "zh-TW" }]);
    const onError = vi.fn();
    speak("Can you swim?", onError, "en-US");
    vi.runAllTimers();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining("英文語音"));
  });

  it("keeps the Chinese voice for existing Chinese prompts and feedback", () => {
    const voices = [{ lang: "en-US" }, { lang: "zh-TW" }];
    const synth = speechMock(voices);
    speak("答對了！");
    expect(synth.speak.mock.calls[0][0]).toMatchObject({ lang: "zh-TW", voice: voices[1] });
  });

  it("keeps music paused across replacement narration and ignores stale completion", () => {
    const synth = speechMock([{ lang: "zh-TW" }]);
    const activity = vi.fn();
    const unsubscribe = subscribeVoiceActivity(activity);
    speak("第一段");
    const first = synth.speak.mock.calls[0][0];
    speak("第二段");
    first.onend();
    expect(activity.mock.calls.map(([active]) => active)).toEqual([false, true]);
    synth.speak.mock.calls[1][0].onend();
    expect(activity.mock.calls.map(([active]) => active)).toEqual([false, true, false]);
    unsubscribe();
  });

  it("releases music after a failed recording without marking the question heard", async () => {
    speechMock([]);
    vi.stubGlobal("Audio", class {
      pause() {}
      play() { return Promise.reject(new Error("load failed")); }
    });
    const activity = vi.fn(), onDone = vi.fn(), onError = vi.fn();
    const unsubscribe = subscribeVoiceActivity(activity);
    playRecording("/missing.mp3", undefined, onDone, onError);
    await Promise.resolve();
    expect(activity.mock.calls.map(([active]) => active)).toEqual([false, true, false]);
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    unsubscribe();
  });
});

it("keeps music paused until the final bilingual segment and cancels the remaining queue", () => {
  const synth = speechMock([{ lang: "zh-TW" }, { lang: "en-US" }]);
  const activity = vi.fn();
  const unsubscribe = subscribeVoiceActivity(activity);
  speak("cat 是貓，dog 是狗。");
  expect(synth.speak.mock.calls[0][0].lang).toBe("en-US");
  synth.speak.mock.calls[0][0].onend();
  expect(synth.speak.mock.calls[1][0].lang).toBe("zh-TW");
  expect(activity.mock.calls.map(([active]) => active)).toEqual([false, true]);
  stopVoice();
  synth.speak.mock.calls[1][0].onend();
  expect(synth.speak).toHaveBeenCalledTimes(2);
  expect(activity.mock.calls.map(([active]) => active)).toEqual([false, true, false]);
  unsubscribe();
});

it("waits for asynchronously loaded voices, ignoring empty voiceschanged events", () => {
  vi.useFakeTimers();
  const events = new EventTarget();
  let voices: { lang: string }[] = [];
  const synth = speechMock(voices);
  synth.getVoices = () => voices;
  Object.assign(synth, { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
  const error = vi.fn();
  speak("知識", error);
  events.dispatchEvent(new Event("voiceschanged"));
  expect(error).not.toHaveBeenCalled();
  voices = [{ lang: "zh-TW" }];
  events.dispatchEvent(new Event("voiceschanged"));
  vi.runAllTimers();
  expect(synth.speak).toHaveBeenCalledOnce();
  expect(error).not.toHaveBeenCalled();
});

it("stops a pending voice request before its timeout", () => {
  vi.useFakeTimers();
  const synth = speechMock([]), error = vi.fn();
  speak("知識", error);
  stopVoice();
  vi.runAllTimers();
  expect(synth.speak).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});

it("waits for a Taiwan voice when only English has arrived", () => {
  vi.useFakeTimers();
  const events = new EventTarget();
  let voices: { lang: string }[] = [{ lang: "en-US" }];
  const synth = speechMock(voices), error = vi.fn();
  synth.getVoices = () => voices;
  Object.assign(synth, { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
  speak("知識", error);
  events.dispatchEvent(new Event("voiceschanged"));
  expect(error).not.toHaveBeenCalled();
  expect(synth.speak).not.toHaveBeenCalled();
  voices.push({ lang: "zh-TW" });
  events.dispatchEvent(new Event("voiceschanged"));
  vi.runAllTimers();
  expect(synth.speak).toHaveBeenCalledOnce();
  expect(synth.speak.mock.calls[0][0].voice.lang).toBe("zh-TW");
  expect(error).not.toHaveBeenCalled();
});
