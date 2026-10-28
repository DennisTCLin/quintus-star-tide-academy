import { speechParts, selectSpeechVoice, type SpeechLanguage } from "./speech-text";

let current: HTMLAudioElement | null = null;
let stopPendingVoices: (() => void) | undefined;
let generation = 0;
let voiceActive = false;
let externalCancel: (() => void) | undefined;
const activityListeners = new Set<(active: boolean) => void>();
function setVoiceActive(active: boolean) {
  if (voiceActive === active) return;
  voiceActive = active;
  activityListeners.forEach((listener) => listener(active));
}
export function subscribeVoiceActivity(listener: (active: boolean) => void) {
  activityListeners.add(listener);
  listener(voiceActive);
  return () => { activityListeners.delete(listener); };
}
function cancelVoice(notify = true) {
  generation++;
  const cancelExternal = externalCancel;
  externalCancel = undefined;
  cancelExternal?.();
  stopPendingVoices?.();
  stopPendingVoices = undefined;
  if (current) {
    current.pause();
    current = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (notify) setVoiceActive(false);
}
export function stopVoice() {
  cancelVoice();
}
export type VoicePlayback = (() => void) & { isCurrent: () => boolean };
// A delayed guide reply must not interrupt a newer microphone/narration turn.
export function narrationCheckpoint() {
  const token = generation;
  return () => token === generation && !voiceActive;
}
// Share narration/music arbitration with microphone capture and decoded AI audio.
export function beginVoiceSession(onCancel: () => void) {
  cancelVoice(false);
  const token = generation;
  externalCancel = onCancel;
  setVoiceActive(true);
  return {
    isCurrent: () => token === generation,
    finish: () => {
      if (token !== generation) return;
      externalCancel = undefined;
      generation++;
      setVoiceActive(false);
    },
    cancel: () => { if (token === generation) stopVoice(); },
  };
}
export function speak(
  text: string,
  onError?: (message: string) => void,
  lang: SpeechLanguage = "zh-TW",
  onDone?: () => void,
) {
  cancelVoice(false);
  const token = generation;
  // Callers can dispose their own speech without stopping a newer page's voice.
  const cancel: VoicePlayback = Object.assign(
    () => { if (token === generation) stopVoice(); },
    { isCurrent: () => token === generation },
  );
  let settled = false;
  const finish = () => {
    if (settled || token !== generation) return;
    settled = true;
    setVoiceActive(false);
    onDone?.();
  };
  const fail = (message?: string) => {
    if (settled || token !== generation) return;
    settled = true;
    setVoiceActive(false);
    if (message) onError?.(message);
  };
  if (!("speechSynthesis" in window)) {
    fail("此裝置無法朗讀，請使用題目的錄音按鈕。");
    return cancel;
  }
  const parts = speechParts(text, lang);
  if (!parts.length) { finish(); return cancel; }
  const synth = window.speechSynthesis;
  const voicesReady = () => parts.every(part => selectSpeechVoice(synth.getVoices(), part.lang));
  let begun = false;
  const begin = () => {
    if (begun || settled || token !== generation) return;
    begun = true;
    const voices = synth.getVoices();
    const missing = parts.find(part => !selectSpeechVoice(voices, part.lang));
    if (missing) {
      fail(missing.lang === "zh-TW"
        ? "此裝置暫無臺灣中文語音，可直接閱讀題目作答。"
        : "此裝置尚未提供英文語音，請先在裝置設定中安裝英文語音。");
      return;
    }
    const playPart = (index: number) => {
      if (settled || token !== generation) return;
      if (index >= parts.length) { finish(); return; }
      const part = parts[index];
      const u = new SpeechSynthesisUtterance(part.text);
      u.lang = part.lang;
      u.rate = 0.85;
      u.voice = selectSpeechVoice(voices, part.lang)!;
      let ended = false;
      u.onend = () => {
        if (ended) return;
        ended = true;
        playPart(index + 1);
      };
      u.onerror = (e) => {
        if (ended) return;
        ended = true;
        fail(e.error !== "interrupted" && e.error !== "canceled"
          ? "朗讀暫時無法使用，請再按一次耳朵。" : undefined);
      };
      try { synth.speak(u); }
      catch { fail("朗讀暫時無法使用，請再按一次耳朵。"); }
    };
    playPart(0);
  };
  setVoiceActive(true);
  if (voicesReady()) begin();
  else {
    // Browsers may populate voices asynchronously after the first request.
    const changed = () => { if (voicesReady()) ready(); };
    const ready = () => {
      cleanup();
      if (stopPendingVoices === cleanup) stopPendingVoices = undefined;
      begin();
    };
    const timer = setTimeout(ready, 1200);
    const cleanup = () => { clearTimeout(timer); synth.removeEventListener?.("voiceschanged", changed); };
    stopPendingVoices = cleanup;
    synth.addEventListener?.("voiceschanged", changed);
  }
  return cancel;
}
export function playRecording(
  src: string,
  end: number | undefined,
  onDone: () => void,
  onError: (message: string) => void,
) {
  cancelVoice(false);
  const token = generation;
  const audio = new Audio(src);
  current = audio;
  let done = false;
  const finish = () => {
    if (done || token !== generation) return;
    done = true;
    audio.pause();
    current = null;
    setVoiceActive(false);
    onDone();
  };
  audio.onended = finish;
  if (end)
    audio.ontimeupdate = () => {
      if (audio.currentTime >= end) finish();
    };
  const fail = (message: string) => {
    if (done || token !== generation) return;
    done = true;
    audio.pause();
    current = null;
    setVoiceActive(false);
    onError(message);
  };
  audio.onerror = () => fail("錄音暫時載入失敗，請再按一次耳朵。");
  setVoiceActive(true);
  void audio.play().catch(() => {
    fail("請再按一次耳朵播放聲音。");
  });
  return Object.assign(
    () => { if (token === generation) stopVoice(); },
    { isCurrent: () => token === generation && !done },
  ) as VoicePlayback;
}
