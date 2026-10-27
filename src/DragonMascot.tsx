import { useEffect, useRef, useState } from 'react';
import type { GuideMood } from './dragon-dialogue';

export default function DragonMascot({ mood, reduced }: { mood: GuideMood; reduced: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const sync = () => setPageVisible(document.visibilityState !== 'hidden');
    sync(); document.addEventListener('visibilitychange', sync);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (scene.current) observer?.observe(scene.current);
    return () => { document.removeEventListener('visibilitychange', sync); observer?.disconnect(); };
  }, []);
  useEffect(() => { setFailed(false); }, [mood]);
  useEffect(() => {
    if (!video.current) return;
    if (!reduced && pageVisible && inView && !failed) {
      const node = video.current;
      void node.play().catch(() => { if (node.isConnected) setFailed(true); });
    }
    else video.current.pause();
  }, [mood, reduced, pageVisible, inView, failed]);
  return <div ref={scene} className={`dragon-mascot mood-${mood}`} aria-hidden="true">
    <div className="dragon-moon" />
    {!reduced && !failed ? <video key={mood} ref={video} className="dragon-character" muted playsInline loop preload="none"
      src={`/assets/dragon-guide/${mood}.mp4`} poster={`/assets/dragon-guide/${mood}-poster.webp`} onError={() => setFailed(true)} />
      : <img className="dragon-character" src={`/assets/dragon-guide/${mood}-poster.webp`} alt="" width="480" height="480" onError={e => { if (!e.currentTarget.src.endsWith('/assets/star-tide-dragon.png')) e.currentTarget.src = '/assets/star-tide-dragon.png'; }} />}
    <span className="dragon-star star-one">✦</span><span className="dragon-star star-two">✧</span>
    <div className="dragon-voice-wave">{[0, 1, 2, 3, 4].map(i => <i key={i} />)}</div>
  </div>;
}
