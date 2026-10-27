import { useEffect, useRef, useState } from 'react';
import { cinematicPosition, cinematicTiming, type Cinematic } from './battle-cinematics';
import './battle-cinematic.css';

export default function BattleCinematic({ clip, startedAt, reverse = false, phase }: {
  clip: Cinematic; startedAt: number; reverse?: boolean; phase: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const starting = useRef(false), mounted = useRef(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = video.current;
    mounted.current = true;
    if (element && !element.getAttribute('src')) { element.src = clip.src; element.load(); }
    return () => { mounted.current = false; starting.current = false; if (element) { element.pause(); element.removeAttribute('src'); element.load(); } };
  }, []);
  if (failed) return null;
  return <div className={`battle-cinematic ${ready ? 'is-ready' : ''} cinematic-${phase}`} aria-hidden="true" data-clip={clip.pet + '-' + (clip.slot + 1)}>
    <video ref={video} src={clip.src} muted playsInline preload="auto" disablePictureInPicture
      style={reverse ? { transform: 'scaleX(-1)' } : undefined}
      onLoadedMetadata={e => { e.currentTarget.playbackRate = clip.duration / (cinematicTiming(clip).end / 1000); }}
      onCanPlay={e => {
        if (starting.current || ready) return;
        starting.current = true;
        const element = e.currentTarget;
        const position = cinematicPosition(clip, performance.now() - startedAt);
        if (position === null) { setFailed(true); return; }
        element.currentTime = position;
        void element.play().then(() => { if (mounted.current) setReady(true); }).catch(() => { if (mounted.current) setFailed(true); });
      }} onError={() => setFailed(true)} />
    <span className="cinematic-name">{clip.name}</span>
  </div>;
}
