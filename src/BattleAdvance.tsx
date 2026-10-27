import { useEffect, useRef, useState } from 'react';
import { annotateTree } from './readability';

/** Mounted once per settled answer; unmount/hidden/offline cancels the timer. */
export default function BattleAdvance({ grade, reduced, busy, online, correct, onAdvance, animationMs = 1100 }: {
  grade: number; reduced: boolean; busy: boolean; online: boolean; correct: boolean; animationMs?: number; onAdvance: () => Promise<unknown>;
}) {
  const [paused, setPaused] = useState(false);
  const [sending, setSending] = useState(false), [failures, setFailures] = useState(0);
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden');
  const locked = useRef(false), mounted = useRef(true);
  const callback = useRef(onAdvance); callback.current = onAdvance;
  const current = useRef({ busy, online, visible }); current.current = { busy, online, visible };
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const clearTimer = () => { clearTimeout(timer.current); timer.current = undefined; };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; clearTimer(); }; }, []);
  async function advance() {
    const state = current.current;
    if (locked.current || state.busy || !state.online || !state.visible || document.visibilityState === 'hidden') return;
    clearTimer();
    locked.current = true;
    setSending(true);
    let accepted = false;
    try { accepted = await callback.current() === true; }
    catch { /* Keep the action available if transport rejects. */ }
    finally {
      if (mounted.current && !accepted) {
        locked.current = false;
        setSending(false);
        setFailures(n => n + 1);
      }
    }
  }
  const advanceRef = useRef(advance); advanceRef.current = advance;
  useEffect(() => { const update = () => setVisible(document.visibilityState !== 'hidden'); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  useEffect(() => {
    if (paused || sending || failures >= 2 || busy || !online || !visible) return;
    // One delayed retry handles a background sync collision without an endless request loop.
    timer.current = setTimeout(() => { void advanceRef.current(); }, failures ? 1800 : reduced ? 450 : Math.max(1300, animationMs + 200));
    return clearTimer;
  }, [paused, sending, failures, busy, online, visible, reduced, animationMs]);
  return annotateTree(<div className="quiz-next-dock" aria-label="自動換題">
    <p role="status">{correct ? '答對了！夥伴出招！' : '這題先記下來，戰後一起練習。'}<small>{!online ? '連線恢復後再繼續' : sending ? '正在換題…' : failures ? '尚未換題，請按下一題重試' : paused ? '自動換題已暫停，按下一題繼續' : '即將自動換題，也可以直接按下一題'}</small></p>
    <button type="button" className="quiz-next-primary" disabled={busy || sending || !online} onClick={() => { void advance(); }}>{sending ? '正在換題…' : '下一題 ➜'}</button>
    <button type="button" className="quiz-next-pause" disabled={sending} aria-pressed={paused} onClick={() => { clearTimer(); setPaused(v => !v); }}>{paused ? '恢復自動換題' : '暫停自動換題'}</button>
  </div>, grade);
}
