// 數學島的語音：唸完一句才呼叫 done，讓示範動畫跟著說話節奏走。
// Share the Taiwan voice selector, asynchronous discovery and playback ownership.
import { speak, type VoicePlayback } from "../voice";

let token = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let stopPlayback: VoicePlayback | undefined;

export function cancelSpeech() {
  token++;
  clearTimeout(timer);
  timer = undefined;
  const stop = stopPlayback;
  stopPlayback = undefined;
  stop?.();
}

/** 唸出 text，唸完（或語音不可用時依字數估算的時間到）才呼叫 done。 */
export function sayThen(text: string, done?: () => void, enabled = true, onError?: (message: string) => void) {
  cancelSpeech();
  const mine = token;
  // An old effect's cleanup must not cancel a newer question or demonstration.
  const cancel = () => { if (mine === token) cancelSpeech(); };
  const estimate = Math.max(900, text.replace(/[\s，。！？、]/g, "").length * 260);
  let finished = false;
  const finish = () => {
    if (finished || mine !== token) return;
    // A page-level guide can replace us without unmounting the demonstration.
    // Its old watchdog must not start another step and steal the newer voice.
    if (stopPlayback && !stopPlayback.isCurrent()) { cancelSpeech(); return; }
    finished = true;
    clearTimeout(timer);
    timer = undefined;
    const stop = stopPlayback;
    stopPlayback = undefined;
    stop?.();
    done?.();
  };
  if (!enabled || typeof window === "undefined") {
    timer = setTimeout(finish, Math.min(estimate, 1600));
    return cancel;
  }
  const failed = (message: string) => {
    if (finished || mine !== token) return;
    onError?.(message.includes("臺灣中文語音")
      ? "這台裝置還沒有臺灣中文語音。請家長在裝置設定加入臺灣中文語音；現在可以先看圖做題。"
      : "朗讀暫時無法使用，可以再按耳朵試試，或先看圖做題。");
    if (finished || mine !== token) return;
    clearTimeout(timer);
    timer = setTimeout(finish, 300);
  };
  // Include the shared engine's voice-discovery wait in the stalled-engine fallback.
  timer = setTimeout(finish, estimate + 3700);
  const stop = speak(text, failed, "zh-TW", finish);
  // Some engines complete synchronously; done may already have started another step.
  if (mine === token && !finished) stopPlayback = stop;
  else stop();
  return cancel;
}

/** A deliberate ear-button press requests speech even when automatic narration is off. */
export const speakOnDemand = (text: string, onError?: (message: string) => void) => sayThen(text, undefined, true, onError);
