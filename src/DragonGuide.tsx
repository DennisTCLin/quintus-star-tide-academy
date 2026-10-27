import ReadAloud from './ReadAloud';
import { useState } from 'react';
import { useDragonDialogue } from './useDragonDialogue';
import { annotateTree } from './readability';
import { currentGuide, GUIDE_CHOICES, guideCopy, guideOptions, type GuideChoice, type GuideFacts, type GuideState } from './dragon-dialogue';
import type { Grade } from './learning';
import DragonMascot from './DragonMascot';
import './dragon-guide.css';

export type DragonGuideProps = {
  player: string; csrf: string; name: string; grade: Grade; facts: GuideFacts; petName?: string;
  reduced: boolean; online: boolean; onReady?: () => void; characterName?: string;
};
export default function DragonGuide(props: DragonGuideProps) {
  const { current, copy, busy, loaded, error, speaking, listening, setListening, heading, pending, choose, listen, read, stop } = useDragonDialogue(props);
  const lastChoice = current.history[current.history.length - 1]?.choice;
  return annotateTree(<section className={`dragon-guide ${props.reduced ? 'dragon-reduced' : ''}`} aria-label="和小龍對話" aria-busy={busy}>
    <div className="dragon-guide-scene">
      <DragonMascot mood={busy ? 'thinking' : speaking ? 'speaking' : listening ? 'listening' : copy.mood} reduced={props.reduced} />
      <p className="dragon-nameplate">✦ 星潮小龍 <small>AI 冒險嚮導</small></p>
    </div>
    <div className="dragon-conversation">
      {lastChoice && <div className="dragon-last-choice"><span>{props.name}</span> {GUIDE_CHOICES[lastChoice].icon} {GUIDE_CHOICES[lastChoice].label}</div>}
      <div className="dragon-bubble">
        <p className="dragon-eyebrow">{busy ? '小龍正在想…' : `${props.name}，小龍想和你說`}</p>
        <p className="dragon-line" ref={heading} tabIndex={-1} aria-live="polite">{copy.text}</p>
        <ReadAloud grade={props.grade}><button data-read-aloud className="dragon-listen" aria-label="聽小龍說話" onClick={() => listen(copy.text)}><span aria-hidden="true">👂</span> {speaking ? '再聽一次' : '聽小龍說'}</button></ReadAloud>
      </div>
      <div className="dragon-replies" aria-label="選一張圖卡回答小龍">
        {guideOptions(current).map(choice => <div className="dragon-reply" key={choice}>
          <button className="dragon-choice" aria-label={`回答：${GUIDE_CHOICES[choice].label}`} disabled={busy || !loaded || !props.online || Boolean(pending.current)}
            onFocus={() => setListening(true)} onBlur={() => setListening(false)} onClick={() => void choose(choice)}>
            <span className="dragon-choice-art" aria-hidden="true">{GUIDE_CHOICES[choice].icon}</span><span>{GUIDE_CHOICES[choice].label}</span>
          </button>
          <ReadAloud grade={props.grade}><button data-read-aloud className="dragon-choice-listen" aria-label={`聽選項：${GUIDE_CHOICES[choice].label}`} onClick={() => listen(GUIDE_CHOICES[choice].label)}>🔊</button></ReadAloud>
        </div>)}
      </div>
      {error && <div className="dragon-error" role="status"><p>{error}</p><button disabled={busy || !props.online} onClick={() => pending.current ? void choose(pending.current.choice) : void read()}>再試一次</button></div>}
      <div className="dragon-guide-footer"><span>{current.source === 'ai' ? 'AI 回應 · 已記住這次對話' : '小龍引導 · 隨時可以直接出發'}</span>{props.onReady && <button className="dragon-continue" onClick={() => { stop(); props.onReady?.(); }}>{props.facts.phase === 'welcome' ? '🎁 去迎接夥伴' : '🧭 一起出發'}</button>}</div>
    </div>
  </section>, props.grade);
}

export function HarborGuide(props: DragonGuideProps) {
  const [open, setOpen] = useState(false);
  return <section className="harbor-dragon"><button className="harbor-dragon-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><img src="/assets/star-tide-dragon.png" width="56" height="56" alt="" /><span>{annotateTree(open ? '收起小龍對話' : '和小龍說說話', props.grade)}</span><span aria-hidden="true">{open ? '⌃' : '💬'}</span></button>{open && <DragonGuide {...props} onReady={props.onReady ? () => { setOpen(false); props.onReady?.(); } : undefined} />}</section>;
}
