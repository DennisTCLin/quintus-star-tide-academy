import ReadAloud from './ReadAloud';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import BrandLogo from './BrandLogo';
import GachaVisual, { type GachaPhase } from './GachaVisual';
import DragonGuide from './DragonGuide';
import { petById } from './game-view';
import { STARTER_E_RATE, type Onboarding } from './starter';
import { annotateTree } from './readability';
import type { Grade } from './learning';
import './starter-onboarding.css';

type Props = {
  player: string; csrf: string; name: string; onboarding: Onboarding; grade: Grade; online: boolean; busy: boolean;
  reduced: boolean; notice: string; transfer: ReactNode; musicControl: ReactNode; motionControl: ReactNode;
  onDraw: () => Promise<string | undefined>; onConfirm: () => Promise<boolean | undefined>;
  onListen: (text: string) => void; onBack?: () => void;
};
export default function StarterOnboarding(props: Props) {
  const { onboarding, busy, online, reduced } = props;
  const [step, setStep] = useState<'welcome' | 'draw'>('welcome');
  const [phase, setPhase] = useState<GachaPhase>(onboarding.pet ? 'revealed' : 'idle');
  const [brokenArt, setBrokenArt] = useState(false), [error, setError] = useState('');
  const locked = useRef(false), alive = useRef(true), sequence = useRef(0), skip = useRef(reduced), wake = useRef<(() => void) | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const result = onboarding.pet ? petById(onboarding.pet) : null;
  const turning = !['idle', 'revealed'].includes(phase);
  const revealed = Boolean(result && !turning);
  useEffect(() => { alive.current = true; return () => { alive.current = false; sequence.current++; wake.current?.(); }; }, []);
  useEffect(() => { if (reduced) { skip.current = true; wake.current?.(); } }, [reduced]);
  useEffect(() => { if (revealed) { setPhase('revealed'); resultHeading.current?.focus({ preventScroll: true }); } }, [revealed]);
  function pause(ms: number) {
    if (skip.current || !alive.current) return Promise.resolve();
    return new Promise<void>(resolve => {
      const finish = () => { clearTimeout(timer); if (wake.current === finish) wake.current = null; resolve(); };
      const timer = setTimeout(finish, ms); wake.current = finish;
    });
  }
  async function turn() {
    if (locked.current || busy || !online || result) return;
    locked.current = true; skip.current = reduced; setError('');
    const seq = ++sequence.current, current = () => alive.current && sequence.current === seq;
    setPhase(reduced ? 'waiting' : 'turning');
    try {
      const intro = async () => {
        await pause(550); if (!current()) return;
        if (!skip.current) setPhase('mixing');
        await pause(850); if (current()) setPhase('waiting');
      };
      const [pet] = await Promise.all([props.onDraw(), intro()]);
      if (!current()) return;
      if (!pet) { setPhase('idle'); setError('結果還沒確認，請先查看雲端同步，再試一次。'); return; }
      if (!skip.current) { setPhase('dropping'); await pause(650); }
      if (!current()) return;
      if (!skip.current) { setPhase('opening'); await pause(700); }
      if (current()) setPhase('revealed');
    } catch {
      if (current()) { sequence.current++; wake.current?.(); locked.current = false; setPhase('idle'); setError('結果還沒確認，請先查看雲端同步，再試一次。'); }
    } finally { if (current()) locked.current = false; }
  }
  const guide = <DragonGuide player={props.player} csrf={props.csrf} name={props.name} grade={props.grade}
    facts={{ phase: result ? 'meet' : 'welcome', pet: result?.id ?? null }} petName={result?.name}
    reduced={reduced} online={online} onReady={result ? undefined : () => setStep('draw')} />;
  return annotateTree(<main className={`starter-shell ${turning ? 'is-turning' : ''} ${revealed ? 'is-revealed' : ''} ${reduced ? 'starter-reduced' : ''}`} aria-busy={busy || turning}>
    <header className="starter-header"><BrandLogo /><div>{props.musicControl}{props.motionControl}<ReadAloud grade={props.grade}><button data-read-aloud className="voice-button" aria-label="聽新手扭蛋說明" onClick={() => props.onListen('我是小龍，先選一張圖卡和我聊天，也可以直接迎接夥伴。每位新玩家可以免費轉一次扭蛋，E 級機率百分之八十，D 級百分之二十。')}>🔊</button></ReadAloud></div></header>
    <ol className="starter-steps" aria-label="歡迎旅程"><li aria-current={!result && step === 'welcome' ? 'step' : undefined}>👋 認識小龍</li><li aria-current={!result && step === 'draw' ? 'step' : undefined}>🎁 迎接夥伴</li><li aria-current={revealed ? 'step' : undefined}>🧭 一起出發</li></ol>
    {!result && step === 'welcome' ? <><h1 className="starter-intro-title">{props.name}，歡迎來到星潮學院</h1>{guide}<div className="starter-transfer">{props.transfer}</div></> : <>
      <section className={`starter-stage gacha-machine phase-${phase} ${reduced ? 'gacha-reduced' : ''}`} aria-labelledby="starter-title" data-phase={phase}>
        <div className="starter-copy">
          <p className="starter-welcome">{props.name} 的第一顆星願</p>
          <h1 id="starter-title">{revealed ? '有夥伴，陪你一起出發' : '轉動星願，遇見新朋友'}</h1>
          <p>{revealed ? '你的夥伴已經加入收藏，小龍還有話想對你說。' : '每位新玩家免費一次，不用星幣，也不用星願券。'}</p>
          {!revealed && <><div className="starter-odds" aria-label="新手扭蛋機率"><span><b>E 級</b> {Math.round(STARTER_E_RATE * 100)}%</span><span><b>D 級</b> {Math.round((1 - STARTER_E_RATE) * 100)}%</span></div><p className="starter-fine">同級夥伴機率相同。抽取結果會存到雲端。</p><button disabled={turning} onClick={() => setStep('welcome')}>💬 再和小龍聊聊</button></>}
          {revealed && result && <div className="starter-result-copy"><h2 ref={resultHeading} tabIndex={-1}>{result.name}</h2><span className="starter-result-level">{result.rarity} 級 · Lv.1 · {result.element}</span><p>{result.story}</p><p className="starter-saved">已加入收藏，並選為陪練夥伴。</p></div>}
        </div>
        <div className="starter-experience">
          <GachaVisual phase={phase}>{result && <div className="gacha-result-art starter-result-art">{brokenArt ? <span className="starter-art-fallback">✦</span> : <img src={result.image} alt={result.name} width="400" height="400" onError={() => setBrokenArt(true)} />}</div>}</GachaVisual>
          <p className="starter-animation-status" role="status">{turning ? '星願正在路上，夥伴馬上就來…' : revealed ? '你的第一位夥伴登場！' : '有一位新朋友，正在等你。'}</p>
          {turning && !reduced && <button className="gacha-skip" onClick={() => { skip.current = true; wake.current?.(); }}>略過動畫</button>}
          {!result && <button className="f-primary starter-action" disabled={busy || turning || !online} onClick={() => void turn()}>{turning ? '正在迎接夥伴…' : '免費轉一次'}</button>}
          {(props.notice || error) && <p role="alert" className="starter-error">{props.notice || error}</p>}
          {!online && <p className="starter-error">請先確認上方的雲端同步，再繼續。</p>}
        </div>
      </section>
      {revealed && <section className="starter-meet">{guide}<button className="f-primary starter-action" disabled={busy || !online} onClick={() => void props.onConfirm()}>{busy ? '正在準備…' : '一起出發'}</button></section>}
    </>}
    {props.onBack && <button className="starter-back" disabled={busy || turning} onClick={props.onBack}>返回選擇玩家</button>}
  </main>, props.grade);
}
