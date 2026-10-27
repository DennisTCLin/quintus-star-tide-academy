import ReadAloud from './ReadAloud';
import { Component, Suspense, createElement, lazy, useContext, useEffect, useRef, useState, type ComponentPropsWithRef, type ComponentType, type ReactNode } from "react";
import { ReadingContext, annotateTree } from "./readability";
import { speak, stopVoice } from "./voice";

// Only import failures use this recovery UI. An editor render failure needs a
// separate draft-recovery design; do not imply its local draft was preserved.
class PageLoadError extends Error {
  constructor(readonly original: unknown) { super("Page module could not be loaded"); }
}
class LoadBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  render() {
    if (this.state.error instanceof PageLoadError) return this.props.fallback;
    if (this.state.error) throw this.state.error;
    return this.props.children;
  }
}

function Recovery({ title, onRetry, onBack }: { title: string; onRetry: () => void; onBack: () => void }) {
  const { grade } = useContext(ReadingContext);
  const heading = useRef<HTMLHeadingElement>(null);
  const [voiceError, setVoiceError] = useState("");
  useEffect(() => { heading.current?.focus({ preventScroll: true }); return stopVoice; }, []);
  const message = `${title}還沒準備好。可以再試一次，或先回港口。`;
  return <section className="route-recovery f-panel" role="alert">
    <div className="route-recovery-symbol" aria-hidden="true">🧭</div>
    {annotateTree(<><h1 ref={heading} tabIndex={-1}>這裡暫時打不開</h1><p>{message}</p>
      <ReadAloud grade={grade}><button data-read-aloud className="route-recovery-listen" aria-label="聽開啟頁面的說明" onClick={() => {
        setVoiceError("");
        speak(message, () => setVoiceError("這台裝置暫時無法朗讀。請按下方按鈕繼續。"));
      }}>🔊 聽說明</button></ReadAloud>
      <div className="route-recovery-actions">
        <button className="f-primary" aria-label="再試一次" onClick={onRetry}>↻ 再試一次</button>
        <button aria-label="先回港口" onClick={onBack}>⛵ 先回港口</button>
      </div>
      {voiceError && <p role="status">{voiceError}</p>}
    </>, grade)}
  </section>;
}

/** Call once at module scope. Ordinary cloud/online/parent updates must keep
 * the same loaded component identity so room drafts and undo history survive. */
export function recoverablePage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>, title: string) {
  const importer = () => load().catch(error => { throw new PageLoadError(error); });
  return function RecoverablePage(props: ComponentPropsWithRef<ComponentType<P>> & { onLoadBack: () => void }) {
    const { grade } = useContext(ReadingContext);
    const [attempt, setAttempt] = useState(() => ({ Page: lazy(importer), key: 0 }));
    const retry = () => setAttempt(previous => ({ Page: lazy(importer), key: previous.key + 1 }));
    // A new lazy identity is needed after a rejection; a new boundary key alone
    // rethrows the cached error. The browser may still reject an old chunk URL,
    // so every failed attempt must retain a usable route back to the harbor.
    return <LoadBoundary key={attempt.key} fallback={<Recovery title={title} onRetry={retry} onBack={props.onLoadBack} />}>
      <Suspense fallback={<section className="route-recovery f-panel" role="status">{annotateTree(<>
        <p>正在打開{title}…</p><button aria-label="先回港口" onClick={props.onLoadBack}>⛵ 先回港口</button>
      </>, grade)}</section>}>
        {createElement(attempt.Page, props)}
      </Suspense>
    </LoadBoundary>;
  };
}
