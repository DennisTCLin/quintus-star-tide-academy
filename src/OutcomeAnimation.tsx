import { useEffect, useRef, useState } from 'react';
import { petById } from './game-view';
import { BATTLE_ARENA } from './battle-assets';
import { prefersCompanionFrames, startCompanionFrames } from './companion-frames';
import { startCompanionPlayback } from './companion-playback';
import clips from './data/outcome-frames.json';
import './outcome-animation.css';

type Props = { outcome: 'won' | 'failed'; companion: string; autoPlay: boolean; reduced: boolean; onConsumed: () => void };
/** Presentation only: no commands, balances or reward transitions. */
export default function OutcomeAnimation({ outcome, companion, autoPlay, reduced, onConsumed }: Props) {
  const kind = outcome === 'won' ? 'victory' : 'defeat', pet = petById(companion)!;
  const [legacy] = useState(() => prefersCompanionFrames(navigator.userAgent, navigator.maxTouchPoints));
  const [playing, setPlaying] = useState(autoPlay && !reduced && document.visibilityState !== 'hidden');
  const [nonce, setNonce] = useState(0), [videoFailed, setVideoFailed] = useState(legacy), [ready, setReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null), host = useRef<HTMLDivElement>(null);
  const consumed = useRef(onConsumed); consumed.current = onConsumed;
  useEffect(() => { if (autoPlay) consumed.current(); }, []);
  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);
  // One-shot scenes end when hidden. Returning never silently starts a second run.
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') setPlaying(false); };
    document.addEventListener('visibilitychange', hide);
    hide();
    let seen = false;
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) seen = true; else if (seen) setPlaying(false);
    });
    if (host.current) observer?.observe(host.current);
    return () => { document.removeEventListener('visibilitychange', hide); observer?.disconnect(); };
  }, []);
  useEffect(() => {
    setReady(false);
    if (!playing || reduced) return;
    if (videoFailed && canvas.current) return startCompanionFrames(canvas.current, clips[kind], false, {
      ready: () => setReady(true), failed: () => setPlaying(false), ended: () => setPlaying(false),
    });
    if (video.current) return startCompanionPlayback(video.current, {
      frame: setReady, failed: () => setVideoFailed(true), ended: () => setPlaying(false),
    });
  }, [playing, reduced, videoFailed, nonce, kind]);
  const active = playing && !reduced;
  const replay = () => { setReady(false); setVideoFailed(legacy); setNonce(n => n + 1); setPlaying(true); };
  return <div ref={host} className={`outcome-scene outcome-${kind}`} data-playing={active && ready} data-source={active ? videoFailed ? 'frames' : 'video' : 'still'}>
    <div className="outcome-scenery" aria-hidden="true">
      <img className="outcome-poster" src={`/assets/outcome-motion-v1/${kind}-poster.jpg`} alt="" onError={e => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback='true'; e.currentTarget.src=BATTLE_ARENA; } }} />
      {active && (videoFailed ? <canvas ref={canvas} className="outcome-media" style={{ opacity: ready ? 1 : 0 }} /> : <video ref={video} className="outcome-media" style={{ opacity: ready ? 1 : 0 }} src={`/assets/outcome-motion-v1/${kind}.mp4`} muted playsInline preload="metadata" />)}
      <div className="outcome-shade" />
    </div>
    <img key={nonce} className="outcome-companion" src={pet.image} alt={pet.name} />
    <button type="button" className="outcome-toggle" disabled={reduced} onClick={active ? () => setPlaying(false) : replay} aria-label={reduced ? '已減少動態' : active ? '略過結算動畫' : '重播結算動畫'}>{reduced ? '已減少動態' : active ? '略過動畫' : '重播動畫'}</button>
  </div>;
}
