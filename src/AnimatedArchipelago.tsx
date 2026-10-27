import { useContext, useEffect, useState, type ReactNode } from 'react';
import { annotateTree, ReadingContext } from './readability';
import { useStageVisibility } from './useStageVisibility';
import { SAFE_MODE } from './recovery-mode';
import './animated-archipelago.css';
import ArchipelagoAtmosphere from './ArchipelagoAtmosphere';

type Connection = EventTarget & { saveData?: boolean };
const POSTER = '/assets/subject-islands/panorama-v2-1600.webp';
const FALLBACK = '/assets/subject-islands/panorama.webp?v=20261025';
const SOURCES = [960, 1600, 2560, 4096].map(width => `/assets/subject-islands/panorama-v2-${width}.webp ${width}w`).join(', ');

export default function AnimatedArchipelago({ reduced = false, granted = true, suspended = false, onActivity, children }: {
  reduced?: boolean; granted?: boolean; suspended?: boolean; onActivity?: (active: boolean) => void; children: ReactNode;
}) {
  const { grade } = useContext(ReadingContext);
  const { stageRef, visible } = useStageVisibility();
  const [paused, setPaused] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [systemStill, setSystemStill] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [savingData, setSavingData] = useState(() => typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { connection?: Connection }).connection?.saveData));
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => { setSystemStill(query.matches); setSavingData(Boolean(connection?.saveData)); };
    query.addEventListener('change', update); connection?.addEventListener('change', update);
    return () => { query.removeEventListener('change', update); connection?.removeEventListener('change', update); };
  }, []);
  const still = reduced || systemStill || SAFE_MODE || savingData;
  const eligible = visible && !still && !paused && !fallback && !suspended;
  useEffect(() => { onActivity?.(eligible); return () => onActivity?.(false); }, [eligible, onActivity]);
  return annotateTree(<div className="archipelago">
    <div className={`archipelago-scene ${eligible && granted ? "map-moving" : "map-still"}`} ref={stageRef} role="group" aria-label="群島冒險地圖">
      <img src={fallback ? FALLBACK : POSTER} srcSet={fallback ? undefined : SOURCES} sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1600px) calc(100vw - 96px), 1600px" width="5456" height="3072" loading="lazy" decoding="async" alt="五座漂浮在雲海上的冒險島嶼" onError={() => setFallback(true)} />
      {eligible && granted && <ArchipelagoAtmosphere /> }
      {children}
    </div>
    <div className="archipelago-toolbar">
      <p>點選島上的科目，開始冒險。</p>
      <button type="button" disabled={still || fallback} aria-pressed={paused} onClick={() => setPaused(v => !v)}>
        {still || fallback ? '靜態群島' : paused ? '▶ 播放動畫' : 'Ⅱ 暫停動畫'}
      </button>
    </div>
  </div>, grade);
}
