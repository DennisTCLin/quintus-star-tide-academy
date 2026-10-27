import QuestionFigure,{useQuestionFigure} from './QuestionFigure';
import ReadAloud from './ReadAloud';
import QuestionPrompt from './QuestionPrompt';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import AnswerOption from './AnswerOption';
import { canListenToEnglishChoices } from './english-choice-listening';
import { annotateTree } from './readability';
import type { Run } from './game-view';
import type { LearningQuestion, Choice } from './learning';
import './battle-review.css';
type Item = { index: number; question: LearningQuestion };
type Props = { run: Run; items: Item[]; grade: number; busy: boolean; online: boolean; oldDay: boolean;
  onCorrect: (index: number, choice: number) => Promise<boolean | undefined>;
  onListen: (q: LearningQuestion) => (() => void); renderChoice: (choice: Choice, q: LearningQuestion) => ReactNode;
  onSpeak: (text: string, english?: boolean) => (() => void); onSkip: () => void };
export default function BattleReview(props: Props) {
  const { run, items, grade, oldDay } = props;
  const playback = useRef<(() => void) | undefined>(undefined);
  const stopPlayback = () => { const cancel = playback.current; playback.current = undefined; cancel?.(); };
  useEffect(() => () => stopPlayback(), [run.id]);
  const listen = (q: LearningQuestion) => { stopPlayback(); playback.current = props.onListen(q); };
  const say = (text: string, english?: boolean) => { stopPlayback(); playback.current = props.onSpeak(text, english); };
  if (!items.length) return null;
  const m = run.remediation, receipt = m?.receipt;
  const next = items.find(item => !m?.corrected.includes(item.index));
  const remainingCoins = Math.max(0, (m?.coinTarget ?? 0) - run.rewarded * 10);
  const remainingXp = Math.max(0, (m?.xpTarget ?? 0) - run.encounter.earned);
  return annotateTree(<section className="battle-review" aria-label="戰後錯題補練">
    <h2>📖 一起補練</h2>
    <p>這場有 {items.length} 道錯題，已訂正 {m?.corrected.length ?? 0} 道。</p>
    {run.status === 'failed' && <p className="battle-review-reward">{receipt
      ? receipt.skipped ? '這次先休息，已獲得的獎勵都保留。' : `全部訂正完成！補發 ${receipt.coins} 星幣、${receipt.xp} XP，已存好。`
      : oldDay || run.practice || !m ? '這次補練不發獎勵，答對的進度仍保留。'
      : remainingCoins || remainingXp ? `全部訂正完成，可補發 ${remainingCoins} 星幣、最多 ${remainingXp} XP。`
      : '本場已獲得至少半份獎勵，補練不會重複發放。'}</p>}
    {!receipt && next && <ReviewQuestion key={`${run.id}:${next.index}`} {...props} onListen={listen} onSpeak={say} onStop={stopPlayback} item={next} />}
    {!receipt && !next && <p role="status">✓ 錯題都訂正好了！</p>}
    <details><summary>查看這場的錯題</summary><ol>{items.map(({ index, question }) => <li key={index}>
      <span>{m?.corrected.includes(index) ? '✓ 已訂正' : '○ 待補練'}</span> <QuestionPrompt question={question} grade={grade} />
      <ReadAloud grade={grade}><button data-read-aloud type="button" onClick={() => listen(question)}>🔊 聽題目</button></ReadAloud>
    </li>)}</ol></details>
    {run.status === 'failed' && !receipt && <>
      <small>以六題全對的星幣與經驗為基準，補到半份；已獲得的計入，不扣回、不重發。補練不發星願券、建材或夥伴。跨日補練不補發獎勵。</small>
      <button className="quiet-button" disabled={props.busy || !props.online} onClick={() => { stopPlayback(); props.onSkip(); }}>略過這次補練</button>
    </>}
  </section>, grade);
}
function ReviewQuestion({ item, grade, busy, online, onCorrect, onSpeak, onListen, onStop, renderChoice }: Omit<Props, "onListen" | "onSpeak"> & { item: Item; onListen: (q: LearningQuestion) => void; onSpeak: (text: string, english?: boolean) => void; onStop: () => void }) {
  const [incorrect, setIncorrect] = useState(false), [sending, setSending] = useState(false);
  const q = item.question;
  const figure=useQuestionFigure(q);
  const stop = useRef(onStop); stop.current = onStop;
  useEffect(() => () => stop.current(), [q.id]);
  const listenChoices = canListenToEnglishChoices(grade, q);
  return <div className="battle-review-question">
    <h3><QuestionPrompt question={q} grade={grade} /></h3>
    {q.visual && <p className="math-visual">{q.visual}</p>}
    <QuestionFigure question={q} onReady={figure.onReady} />
    <ReadAloud grade={grade}><button data-read-aloud type="button" onClick={() => onListen(q)}>🔊 聽題目</button></ReadAloud>
    <div className={`battle-review-choices answer-grid ${listenChoices ? 'with-choice-audio' : ''}`}>{q.options.map((choice, index) => <AnswerOption key={index}
      disabled={busy || sending || !online || !figure.ready} className="" label={grade === 1 && q.course === 'words' ? `選擇圖片 ${index + 1}` : `選擇 ${choice.text}`}
      listening={listenChoices ? { text: choice.text, disabled: busy || sending || !online, play: () => onSpeak(choice.text, true), stop: onStop } : undefined}
      onAnswer={async () => {
        if (sending || !figure.ready) return; onStop(); setSending(true);
        try { const correct = await onCorrect(item.index, index); if (correct !== undefined) setIncorrect(!correct); } finally { setSending(false); }
      }}>{renderChoice(choice, q)}</AnswerOption>)}</div>
    {incorrect && <div role="status"><p>再想想，可以參考下面的解說。</p><p>{q.explanation ?? q.options[q.answer].text}</p>
      <ReadAloud grade={grade}><button data-read-aloud onClick={() => onSpeak(q.course === 'english' ? q.options[q.answer].text : q.explanation ?? q.options[q.answer].text, q.course === 'english')}>🔊 聽解說</button></ReadAloud></div>}
  </div>;
}
