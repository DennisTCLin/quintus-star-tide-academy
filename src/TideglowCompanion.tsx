import ReadAloud, { allowsReadAloud } from './ReadAloud';
import { useContext, useEffect, useRef, useState } from 'react';
import type { DragonGuideProps } from './DragonGuide';
import { useDragonDialogue } from './useDragonDialogue';
import { GUIDE_CHOICES, guideOptions } from './dragon-dialogue';
import { annotateTree, ReadingContext } from './readability';
import TideglowActor from './TideglowActor';
import useCompanionDock from './useCompanionDock';
import { COMPANION_FRAME_TIMEOUT } from './companion-playback';
import CareActionArt from './CareActionArt';
import CompanionVoiceChat from './CompanionVoiceChat';
import { useCompanionConversation } from './useCompanionConversation';
import { COMPANION_CARE_LINES, COMPANION_FIXED_LINES } from './companion-fixed-voice';
import { companionName, type CompanionMascot, CARE_ACTIONS, CARE_COPY, careGoal, companionContext, hitCareTarget, type CareRound, type CareAction, type TideglowMotion } from './tideglow-companion';
import './tideglow-companion.css';

type Props = DragonGuideProps & { mascot?: CompanionMascot; page: string; completed: boolean; courseName?: string; suppressed: boolean; openRequest: number; onOpenChange?: (open: boolean) => void };
export default function TideglowCompanion(props: Props) {
  const name = companionName(props.mascot);
  const [mode, setMode] = useState<'closed' | 'dock' | 'large'>('closed');
  const [hidden, setHidden] = useState(false), [paused, setPaused] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closePanel = () => { setMode('closed'); requestAnimationFrame(() => (opener.current?.isConnected ? opener.current : launcher.current)?.focus({ preventScroll: true })); };
  const previousRequest = useRef(props.openRequest);
  useEffect(() => { if (props.openRequest !== previousRequest.current) { previousRequest.current = props.openRequest; opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setHidden(false); setMode('large'); } }, [props.openRequest]);
  useEffect(() => { setMode('closed'); }, [props.page, props.suppressed]);
  const isOpen = mode !== 'closed' && !props.suppressed;
  useEffect(() => { props.onOpenChange?.(isOpen); return () => props.onOpenChange?.(false); }, [isOpen, props.onOpenChange]);
  const editing = useCompanionDock(!props.suppressed);
  if (props.suppressed) return null;
  const inactive = isOpen || props.suppressed;
  return annotateTree(<div className="tide-companion">
    <div className={`tide-launcher ${hidden ? 'tide-hidden' : ''} ${inactive ? 'tide-launcher-inactive' : ''}`} data-obscured={editing} aria-hidden={inactive || editing || undefined}>
      <button ref={launcher} className="tide-launch" aria-label={`找${name}，摸摸或聊聊天`} aria-haspopup="dialog" tabIndex={inactive || editing ? -1 : undefined} onKeyDown={e => {
        // A fixed button has no native scroll target. Keep keyboard browsing usable
        // after closing the panel returns focus here, without taking Enter/Space.
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const target = ({ PageDown: window.scrollY + window.innerHeight * .9, PageUp: window.scrollY - window.innerHeight * .9,
          ArrowDown: window.scrollY + 40, ArrowUp: window.scrollY - 40, Home: 0, End: document.documentElement.scrollHeight } as Record<string, number>)[e.key];
        if (target === undefined) return;
        e.preventDefault(); window.scrollTo({ top: target, behavior: 'instant' });
      }} onClick={e => { opener.current = e.currentTarget; e.currentTarget.focus({ preventScroll: true }); setHidden(false); setMode('dock'); }}>
        <img className="tide-launch-cutout" src={props.mascot === 'bow' ? '/assets/companion-launcher-v3/bow.png' : props.mascot === 'dog' ? '/assets/olivia-dog/poster-v1.png' : '/assets/tideglow-companion.png'} alt="" width="480" height="480" onError={e => { e.currentTarget.style.visibility = 'hidden'; }} /><span>{hidden ? `找${name}` : '陪你一起學'}</span>
      </button>
    </div>
    {isOpen && <TideglowPanel {...props} paused={paused} setPaused={setPaused} large={mode === 'large'} onSize={() => setMode(mode === 'large' ? 'dock' : 'large')} onClose={closePanel} onHide={() => { closePanel(); setHidden(true); }} />}
  </div>, props.grade);
}

function TideglowPanel(props: Props & { paused: boolean; setPaused: (v: boolean) => void; large: boolean; onSize: () => void; onClose: () => void; onHide: () => void }) {
  const name = companionName(props.mascot);
  const personalize = (text: string) => text.replace(/潮光獸|小龍/g, name);
  const dialog = useRef<HTMLDialogElement>(null), stage = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'care' | 'talk'>('care');
  const { voice: voicePreference } = useContext(ReadingContext);
  const autoVoice = voicePreference && allowsReadAloud(props.grade);
  // Care narrates its immediate local feedback; a delayed cloud reply must not speak over a newer action.
  const guide = useDragonDialogue({ ...props, characterName: name, onReady: undefined, autoNarrate: false });
  const conversation = useCompanionConversation({ ...props, enabled: tab === 'talk' });
  const [action, setAction] = useState<TideglowMotion | null>(props.completed ? 'cheering' : 'greet'), [nonce, setNonce] = useState(0);
  const [feedback, setFeedback] = useState(`你好，我是${name}！點點我的頭，或選一個圖案吧。`);
  const [round, setRound] = useState<CareRound | null>(null), roundRef = useRef<CareRound | null>(null);
  const [selected, setSelected] = useState<CareAction | null>(null), [acting, setActing] = useState(false);
  const actionToken = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(), locked = useRef(false), drag = useRef<{ x: number; y: number; used: boolean } | null>(null), skipClick = useRef(false);
  const reduced = props.reduced || props.paused;
  const context = companionContext(props.page, props.completed, props.courseName);
  const text = personalize(guide.copy.text);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    timer.current = setTimeout(() => setAction(null), reduced ? 0 : 5200);
    return () => { clearTimeout(timer.current); dialog.current?.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  function say(message: string) { message = personalize(message); setFeedback(message); if (autoVoice) guide.listen(message); }
  function updateRound(value: CareRound | null) { roundRef.current = value; setRound(value); }
  function resetCare(rest = false, preserveGesture = false) {
    actionToken.current++; clearTimeout(timer.current); locked.current = false;
    if (!preserveGesture) { drag.current = null; skipClick.current = false; }
    setActing(false); updateRound(null); setSelected(rest ? 'rest' : null); setAction(rest ? 'rest' : null); guide.stop();
    if (rest) setFeedback(CARE_COPY.rest);
  }
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') resetCare(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  function changeTab(value: 'care' | 'talk') { resetCare(); conversation.stop(); setTab(value); }
  function finishAction(token: number) {
    if (token !== actionToken.current) return;
    clearTimeout(timer.current); locked.current = false; setActing(false); setAction(null);
  }
  function animate(motion: TideglowMotion, message: string) {
    clearTimeout(timer.current); const token = ++actionToken.current;
    guide.stop(); locked.current = true; setActing(true); setAction(motion); setNonce(n => n + 1); setFeedback(message);
    if (autoVoice) guide.listen(message);
    // Actual video completion releases the action; this only bounds a stalled load.
    timer.current = setTimeout(() => finishAction(token), reduced ? 300 : 20000);
  }
  const playbackToken = actionToken.current;
  function playbackLoading() {
    if (playbackToken !== actionToken.current || !acting) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => finishAction(playbackToken), 20000);
  }
  function playbackStarted(duration: number) {
    if (playbackToken !== actionToken.current || !acting || !Number.isFinite(duration)) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => finishAction(playbackToken), duration * 1000 + COMPANION_FRAME_TIMEOUT + 1500);
  }
  useEffect(() => {
    if (reduced && acting) { const token = actionToken.current; clearTimeout(timer.current); timer.current = setTimeout(() => finishAction(token), 300); }
  }, [props.paused, props.reduced, acting]);
  function care(choice: CareAction) {
    if ((locked.current && choice !== 'rest') || tab === 'talk') return;
    resetCare(false, true); setSelected(choice); setNonce(n => n + 1);
    if (choice === 'rest') { setAction('rest'); say(CARE_COPY.rest); return; }
    if (choice === 'play' || choice === 'highfive' || choice === 'bubbles') {
      updateRound({ game: choice, hits: [] });
      say(COMPANION_CARE_LINES[choice === 'play' ? 'ball-start' : choice === 'highfive' ? 'highfive-start' : 'bubbles-start']);
      setAction(choice); return;
    }
    if (guide.loaded && !guide.busy && props.online && !guide.pending.current) void guide.choose(choice);
    animate(choice, CARE_COPY[choice]);
  }
  function hit(target: number) {
    const current = roundRef.current;
    if (locked.current || !current) return;
    const next = hitCareTarget(current, target);
    if (next === current) return;
    updateRound(next);
    const done = next.hits.length === careGoal(next.game);
    const message = done ? next.game === 'play' ? COMPANION_FIXED_LINES.cheer : next.game === 'highfive' ? CARE_COPY.highfive : COMPANION_CARE_LINES['bubbles-done'] : CARE_COPY[next.game];
    if (done && next.game === 'play' && guide.loaded && !guide.busy && props.online && !guide.pending.current) void guide.choose('play');
    animate(next.game, message);
  }
  const voiceMood: TideglowMotion | null = tab !== 'talk' ? null : conversation.status === 'speaking' ? 'speaking' : ['thinking','loading-audio'].includes(conversation.status) ? 'thinking' : ['recording','permission'].includes(conversation.status) ? 'listening' : null;
  const mood: TideglowMotion = voiceMood ?? action ?? (guide.speaking ? 'speaking' : tab === 'talk' && guide.busy ? 'thinking' : guide.current.reply === 'rest' ? 'rest' : tab === 'talk' ? 'listening' : 'idle');
  const choose = (choice: Parameters<typeof guide.choose>[0]) => { conversation.stop(); resetCare(); void guide.choose(choice); };
  return annotateTree(<dialog ref={dialog} className={`tide-panel family-app grade-${props.grade} ${props.large ? 'tide-large' : ''} ${reduced ? 'tide-reduced' : ''}`} aria-label={`${name} AI 學伴`} onCancel={e => { e.preventDefault(); props.onClose(); }}>
    <header className="tide-heading"><div><span className="tide-kicker">{props.mascot === 'dog' ? '你畫的狗狗・專屬星潮學伴' : props.mascot === 'bow' ? '你畫的夥伴・專屬星潮學伴' : '你的星潮學伴'}</span><h2>{name}</h2></div><div className="tide-window-actions"><button onClick={props.onSize} aria-label={props.large ? '縮小互動畫面' : '放大互動畫面'}>{props.large ? '↙' : '↗'}</button><button onClick={props.onClose} aria-label={`收起${name}`}>✕</button></div></header>
    <div className="tide-tabs" aria-label="互動方式"><button aria-pressed={tab === 'care'} onClick={() => changeTab('care')}>🐾 陪伴</button><button aria-pressed={tab === 'talk'} onClick={() => changeTab('talk')}>💬 聊聊天</button></div>
    <div className={`tide-body tide-tab-${tab}`}>
      <div className="tide-portrait-column"><div className="tide-stage" ref={stage} data-care-action={tab === 'care' ? selected ?? undefined : undefined} data-celebrating={action === 'cheering' ? 'true' : undefined}>
        <button className="tide-touch" aria-label={`摸摸${name}`} disabled={acting || tab === 'talk'} onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, used: false }; skipClick.current = false; }} onPointerMove={e => { const d = drag.current; if (d && !d.used && Math.abs(e.clientX - d.x) > 18 && Math.abs(e.clientY - d.y) < 30) { d.used = true; skipClick.current = true; care('pet'); } }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; skipClick.current = false; }} onClick={() => { if (!skipClick.current) care('pet'); skipClick.current = false; }}>
          <TideglowActor mascot={props.mascot} motion={mood} reduced={reduced} nonce={nonce} onPlaying={playbackStarted} onLoading={playbackLoading} onComplete={() => { if (acting) finishAction(playbackToken); }} />
        </button>
        {tab === 'care' && selected && <div key={`${selected}:${nonce}`} className={`tide-care-effects effect-${selected}`} aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div>}
        {round?.game === 'play' && round.hits.length < 3 && <button className={`tide-ball target-${round.hits.length}`} disabled={acting} aria-label={`接第 ${round.hits.length + 1} 顆星光球`} onClick={() => hit(round.hits.length)}>✦</button>}
        {round?.game === 'highfive' && !round.hits.length && <button className="tide-highfive-target" disabled={acting} aria-label={`和${name}擊掌`} onClick={() => hit(0)}><CareActionArt action="highfive" /></button>}
        {round?.game === 'bubbles' && [0, 1, 2].map(n => <button key={n} className={`tide-bubble-target bubble-${n} ${round.hits.includes(n) ? 'popped' : ''}`} disabled={acting || round.hits.includes(n)} aria-label={`點第 ${n + 1} 個泡泡`} onClick={() => hit(n)}><span aria-hidden="true">{round.hits.includes(n) ? '★' : '✧'}</span></button>)}
        {round && <div className="tide-ball-progress" role="status" aria-label={`完成 ${round.hits.length} / ${careGoal(round.game)}`}>{Array.from({ length: careGoal(round.game) }, (_, n) => <span key={n} aria-hidden="true" className={round.hits.length > n ? 'lit' : ''}>{round.hits.length > n ? '★' : '☆'}</span>)}</div>}
      </div><p className="tide-touch-hint">{tab === 'talk' ? `按麥克風，${name}會聽你說話` : round ? '點點畫面裡亮亮的圖案' : selected === 'rest' ? '慢慢來，想玩再點一個圖案' : `輕輕摸摸頭，${name}會回應你`}</p>
      {tab === 'care' && (acting || round) && <button className="tide-stop-care" onClick={() => resetCare(true)}>☾ 停下來休息</button>}</div>
      <div className="tide-content">
        {tab === 'care' ? <>
          <p className="tide-context">{context}</p>
          <div className="tide-care-actions" aria-label="選一種陪伴動作">{CARE_ACTIONS.map(item =>
            <button key={item.id} className={item.id === 'feed' ? 'tide-snack' : undefined} disabled={acting && item.id !== 'rest'} aria-label={item.label} aria-pressed={selected === item.id}
              onPointerDown={item.id !== 'feed' ? undefined : e => { skipClick.current = false; drag.current = { x: e.clientX, y: e.clientY, used: false }; e.currentTarget.setPointerCapture(e.pointerId); }}
              onPointerUp={item.id !== 'feed' ? undefined : e => { const d = drag.current, box = stage.current?.getBoundingClientRect(); drag.current = null; if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 15) { skipClick.current = true; if (box && e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom) care('feed'); } }}
              onPointerCancel={() => { drag.current = null; skipClick.current = false; }}
              onClick={() => { if (item.id !== 'feed' || !skipClick.current) care(item.id); skipClick.current = false; }}><CareActionArt action={item.id} /><span className="tide-action-label">{item.label}</span></button>
          )}</div>
          <div className="tide-bubble"><p role="status">{feedback}</p><ReadAloud grade={props.grade}><button data-read-aloud aria-label={`聽${name}的互動回應`} onClick={() => { if (!acting && action !== 'rest') setAction(null); guide.listen(feedback); }}>🔊 聽牠說</button></ReadAloud></div>
          <p className="tide-care-note">所有動作都免費，不用趕，隨時可以休息。</p>
        </> : <>
          <p className="tide-context">{context}</p>
          <CompanionVoiceChat characterName={name} voice={conversation} grade={props.grade} online={props.online} onHelp={() => { conversation.stop(); guide.listen(COMPANION_FIXED_LINES.microphone); }} />
          <details className="tide-guided-fallback"><summary>🖼️ 用圖卡聊聊天</summary>
          <div className="tide-bubble" aria-busy={guide.busy}><p ref={guide.heading} tabIndex={-1} aria-live="polite">{guide.busy ? `${name}正在想…` : text}</p><ReadAloud grade={props.grade}><button data-read-aloud aria-label={`聽${name}說話`} onClick={() => { conversation.stop(); setAction(null); guide.listen(text); }}>🔊 {guide.speaking ? '再聽一次' : '聽牠說'}</button></ReadAloud></div>
          <div className="tide-answers">{guideOptions(guide.current).map(choice => <div key={choice}><button disabled={guide.busy || !guide.loaded || !props.online || Boolean(guide.pending.current)} onClick={() => choose(choice)}><span className="tide-action-icon">{GUIDE_CHOICES[choice].icon}</span><span className="tide-action-label">{personalize(GUIDE_CHOICES[choice].label)}</span></button><ReadAloud grade={props.grade}><button data-read-aloud className="tide-answer-audio" aria-label={`聽選項：${personalize(GUIDE_CHOICES[choice].label)}`} onClick={() => { conversation.stop(); guide.listen(personalize(GUIDE_CHOICES[choice].label)); }}>🔊</button></ReadAloud></div>)}</div>
          {guide.current.reply !== 'preference' && <button className="tide-topic" disabled={guide.busy || !guide.loaded || !props.online || Boolean(guide.pending.current)} onClick={() => choose('preference')}>🌈 聊聊喜歡的地方</button>}
          <small className="tide-source">{guide.current.source === 'ai' ? 'AI 回應' : '學伴引導'}</small></details>
        </>}
        {guide.error && <div className="tide-error" role="status"><p>{personalize(guide.error)}</p><button disabled={guide.busy || !props.online} onClick={() => guide.pending.current ? void guide.choose(guide.pending.current.choice) : void guide.read()}>再試一次</button></div>}
        {!props.online && <p className="tide-error">暫時離線，陪伴動作還是可以玩。</p>}
        <button className="tide-learn" onClick={() => { props.onClose(); props.onReady?.(); }}>🧭 一起去冒險</button>
      </div>
    </div>
    <footer className="tide-footer"><button disabled={props.reduced} aria-pressed={reduced} onClick={() => props.setPaused(!props.paused)}>{props.reduced ? '已減少動態' : props.paused ? '▶ 播放動態' : 'Ⅱ 暫停動態'}</button><button onClick={props.onHide}>暫時隱藏</button></footer>
  </dialog>, props.grade);
}
