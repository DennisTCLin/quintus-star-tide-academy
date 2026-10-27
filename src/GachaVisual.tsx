import { useState, type ReactNode } from 'react';
import './gacha-machine.css';

export type GachaPhase = 'idle' | 'turning' | 'mixing' | 'waiting' | 'dropping' | 'opening' | 'revealed';
/** Shared artwork only: each caller keeps its own odds, payment and server receipt. */
export default function GachaVisual({ phase, children }: { phase: GachaPhase; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const showing = phase === 'dropping' || phase === 'opening' || phase === 'revealed';
  return <div className="gacha-visual star-capsule-machine">
    <div className="gacha-orbit" aria-hidden="true" />
    <div className={`gacha-instrument ${failed ? 'art-unavailable' : ''}`} aria-hidden="true">
      {!failed && <img className="gacha-machine-art" src="/assets/gacha/starwish-machine.webp?v=a9ee8fdfbf5f" alt="" width="1024" height="1024" draggable={false} onError={() => setFailed(true)} />}
      <div className="gacha-chamber">{Array.from({ length: 7 }, (_, i) => <i className={`gacha-orb orb-${i}`} key={i}><span>✦</span></i>)}</div>
      <div className="gacha-crank"><i /><span>✦</span></div>
    </div>
    {(phase === 'dropping' || phase === 'opening') && <div className="gacha-drop" aria-hidden="true"><i className="gacha-shell-top" /><i className="gacha-shell-bottom" /><span>✦</span></div>}
    {showing && <div className="gacha-reveal" aria-hidden={phase !== 'revealed'}><div className="gacha-reveal-halo" aria-hidden="true" />{children}</div>}
  </div>;
}
