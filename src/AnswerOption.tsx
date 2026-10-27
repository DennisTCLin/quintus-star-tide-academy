import type { ReactNode } from 'react';
import './answer-option.css';

type Props = {
  children: ReactNode;
  disabled: boolean;
  className: string;
  label: string;
  onAnswer: () => void;
  listening?: { text: string; disabled?: boolean; play: () => void; stop: () => void };
};
/** Listening and answering are sibling actions: an audio tap never bubbles into an answer. */
export default function AnswerOption({ children, disabled, className, label, onAnswer, listening }: Props) {
  const answer = <button type="button" disabled={disabled} className={className} aria-label={label} data-answer-option
    onClick={() => { listening?.stop(); onAnswer(); }}>
    {children}{listening && <small className="option-answer-cue" aria-hidden="true">👆 選這個</small>}
  </button>;
  return listening ? <div className="answer-option">
    {answer}
    <button type="button" className="option-listen" aria-label={`聽選項 ${listening.text} 的英文發音`}
      disabled={listening.disabled} onClick={listening.play}>
      <span aria-hidden="true">🔊</span><small aria-hidden="true">聽</small>
    </button>
  </div> : answer;
}
