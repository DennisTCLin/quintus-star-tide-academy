import { useEffect, useRef, useState } from 'react';
import { countOnCurrentSpeech, countOnFrame, countOnIntroduction, countOnLesson, type CountOnInput, type CountOnLesson } from './count-on';
import './count-on.css';

type Props = CountOnInput & {
  sessionKey: string;
  companion: { name: string; image: string };
  reduced: boolean;
  onSpeak: (text: string) => void;
  onStop: () => void;
};
export default function CountOnExplanation(props: Props) {
  const lesson = countOnLesson(props);
  if (!lesson) return null;
  return <CountOnSteps key={`${props.sessionKey}:${props.question.id}`} lesson={lesson}
    companion={props.companion} reduced={props.reduced} onSpeak={props.onSpeak} onStop={props.onStop} />;
}
function CountOnSteps({ lesson, companion, reduced, onSpeak, onStop }: Pick<Props, 'companion' | 'reduced' | 'onSpeak' | 'onStop'> & { lesson: CountOnLesson }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const stopRef = useRef(onStop);
  const usedSpeech = useRef(false);
  stopRef.current = onStop;
  useEffect(() => () => { if (usedSpeech.current) stopRef.current(); }, []);
  const frame = countOnFrame(lesson, step);
  function speak(text: string) { usedSpeech.current = true; onSpeak(text); }
  function restart() {
    onStop();
    stepRef.current = 0;
    setStep(0);
    setOpen(true);
    speak(countOnIntroduction(lesson));
  }
  function advance() {
    const current = countOnFrame(lesson, stepRef.current);
    if (current.complete) return;
    const next = countOnFrame(lesson, current.added + 1);
    stepRef.current = next.added;
    setStep(next.added);
    speak(next.complete ? `${next.count}。${lesson.start}加${lesson.add}等於${lesson.total}。` : String(next.count));
  }
  function close() {
    onStop(); usedSpeech.current = false; setOpen(false);
  }
  return <section className={`count-on ${reduced ? 'count-on-reduced' : ''}`} aria-label="跟夥伴數星星">
    {!open ? <button className="count-on-open" onClick={restart} aria-label="和夥伴一起數一次">
      <img src={companion.image} alt={companion.name} loading="lazy" />
      <span><b>和夥伴數一次</b><small aria-hidden="true">👆 ＋1 → ⭐</small></span><span aria-hidden="true">▶</span>
    </button> : <>
      <div className="count-on-heading"><img src={companion.image} alt={companion.name} loading="lazy" />
        <strong aria-label={`${lesson.start}加${lesson.add}`}>{lesson.start} ＋ {lesson.add}</strong>
        <button className="count-on-close" onClick={close} aria-label="停止並收起解說">■</button>
      </div>
      <div className="count-on-workspace">
        <div className="count-on-stars" role="img" aria-label={`原本${lesson.start}顆，已加${frame.added}顆，共${frame.count}顆星星`}>
          {Array.from({length: lesson.start}, (_, i) => <span className="count-on-star" key={`original-${i}`} aria-hidden="true">★</span>)}
          {Array.from({length: frame.added}, (_, i) => <span className="count-on-star count-on-added" key={`added-${i}`} aria-hidden="true">★</span>)}
          {frame.count === 0 && <span className="count-on-empty" aria-hidden="true">0</span>}
        </div>
        <output className="count-on-total" aria-live="polite" aria-label="現在有幾顆">{frame.count}</output>
      </div>
      <p className="count-on-equation" aria-label={frame.complete ? `${lesson.start}加${lesson.add}等於${lesson.total}` : `還要加${frame.remaining}顆`}>
        {frame.complete ? `${lesson.start} ＋ ${lesson.add} ＝ ${lesson.total} ✓` : `＋ ${frame.remaining} ⭐`}
      </p>
      <div className="count-on-actions">
        <button className="count-on-step" onClick={advance} disabled={frame.complete} aria-label="再加一顆星星">{frame.complete ? '✓' : '👆 ＋1'}</button>
        <button onClick={restart} aria-label="重新數一次">↻</button>
        <button onClick={() => speak(countOnCurrentSpeech(lesson, step))} aria-label="聽目前的數量">🔊</button>
      </div>
    </>}
  </section>;
}
