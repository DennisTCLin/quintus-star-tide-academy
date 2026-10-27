import { useEffect, useRef, useState } from 'react';
import { companionPortrait, companionVideo, companionPoster, companionLoops, type CompanionMascot, type TideglowMotion } from './tideglow-companion';
import { startCompanionPlayback } from './companion-playback';
import { companionFrames, prefersCompanionFrames, startCompanionFrames } from './companion-frames';

type ActorProps = { motion: TideglowMotion; reduced: boolean; nonce?: number; mascot?: CompanionMascot; onComplete?: () => void; onPlaying?: (duration: number) => void; onLoading?: () => void };
export default function TideglowActor({ motion, reduced, nonce = 0, mascot = 'tideglow', onComplete, onPlaying, onLoading }: ActorProps) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true), [inView, setInView] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState !== 'hidden'); sync();
    document.addEventListener('visibilitychange', sync);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (host.current) observer?.observe(host.current);
    return () => { document.removeEventListener('visibilitychange', sync); observer?.disconnect(); };
  }, []);
  return <div className={`tide-actor ${mascot === 'dog' ? 'dog-actor' : mascot === 'bow' ? 'bow-actor' : ''}`} ref={host} data-motion={motion} aria-hidden="true">
    <ActorMedia key={`${mascot}:${motion}:${nonce}`} motion={motion} mascot={mascot} reduced={reduced} active={visible && inView} onComplete={onComplete} onPlaying={onPlaying} onLoading={onLoading}/>
  </div>;
}
function ActorMedia({ motion, mascot = 'tideglow', reduced, active, onComplete, onPlaying, onLoading }: ActorProps & { active: boolean }) {
  const video = useRef<HTMLVideoElement>(null), callbacks = useRef({ onComplete, onPlaying, onLoading });
  callbacks.current = { onComplete, onPlaying, onLoading };
  const [failed, setFailed] = useState(false), [frame, setFrame] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const clip = companionFrames(mascot, motion);
  const [framesFailed, setFramesFailed] = useState(false), [framesReady, setFramesReady] = useState(false);
  const [legacy] = useState(() => prefersCompanionFrames(navigator.userAgent, navigator.maxTouchPoints));
  const useFrames = Boolean(clip && (legacy || failed));
  const showFrames = useFrames && !reduced && active && !framesFailed;
  const showVideo = !reduced && !failed && !useFrames;
  const ready = active && (showFrames ? framesReady : showVideo && frame);
  useEffect(() => {
    setFramesReady(false);
    if (!showFrames || !canvas.current || !clip) return;
    callbacks.current.onLoading?.();
    return startCompanionFrames(canvas.current, clip, companionLoops(motion), {
      ready: () => { setFramesReady(true); callbacks.current.onPlaying?.(clip.duration); },
      failed: () => { setFramesFailed(true); callbacks.current.onComplete?.(); },
      ended: () => callbacks.current.onComplete?.(),
    });
  }, [showFrames, clip, motion]);
  useEffect(() => {
    const node = video.current;
    if (!node || !showVideo || !active) { setFrame(false); return; }
    return startCompanionPlayback(node, { frame: setFrame,
      failed: () => { setFailed(true); if (!clip) callbacks.current.onComplete?.(); },
      playing: duration => callbacks.current.onPlaying?.(duration), ended: () => callbacks.current.onComplete?.() });
  }, [showVideo, active]);
  return <>
    <img className="tide-actor-poster" data-frame-ready={ready} src={companionPoster(mascot, motion)} alt="" width="640" height="640"
      onError={e => { const fallback = companionPortrait(mascot); if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; }} />
    {showFrames && <canvas ref={canvas} className="tide-actor-frames" data-motion={motion} />}
    {showVideo && <video ref={video} src={companionVideo(mascot, motion)} poster={companionPoster(mascot, motion)} width="640" height="640" muted playsInline loop={companionLoops(motion)} preload="metadata" />}
  </>;
}
