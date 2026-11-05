import { useEffect, useRef, useState } from 'react';
import { stopVoice, subscribeVoiceActivity } from './voice';
import { STORY_FILMS, type StoryFilm, type StoryId } from './story-films';
import './story-cinema.css';

function StoryPlayer({ film, onNext }: { film: StoryFilm; onNext: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const live = useRef(false);
  const [status, setStatus] = useState<'ready' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'>('ready');
  useEffect(() => {
    live.current = true;
    const element = video.current!;
    // React StrictMode replays setup after cleanup without replacing the node.
    if (element.getAttribute('src') !== film.src) element.src = film.src;
    const pause = () => element.pause();
    const onVisibility = () => { if (document.hidden) pause(); };
    const unsubscribe = subscribeVoiceActivity(active => { if (active) pause(); });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    return () => {
      live.current = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
      element.pause();
      element.removeAttribute('src');
      element.load();
    };
  }, [film.src]);
  function play() {
    const element = video.current;
    if (!element) return;
    stopVoice();
    if (status === 'error') element.load();
    if (element.ended) element.currentTime = 0;
    setStatus('loading');
    void element.play().catch((error: unknown) => {
      if (!live.current || video.current !== element) return;
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus(error instanceof DOMException && error.name === 'NotAllowedError' ? 'paused' : 'error');
    });
  }
  return <div className="story-player">
    <video ref={video} src={film.src} poster={film.poster} controls playsInline preload="none"
      aria-label={`${film.title}，${film.duration}，國語旁白與繁體中文字幕`}
      onPlay={() => { stopVoice(); if (live.current) setStatus('loading'); }}
      onPlaying={() => { if (live.current) setStatus('playing'); }}
      onWaiting={() => { if (live.current && !video.current?.paused) setStatus('loading'); }}
      onPause={() => { if (live.current) setStatus(current => current === 'error' || current === 'ended' ? current : 'paused'); }}
      onEnded={() => { if (live.current) setStatus('ended'); }}
      onError={() => { if (live.current) setStatus('error'); }} />
    <div className="story-player-actions">
      {status === 'playing' || status === 'loading'
        ? <button onClick={() => video.current?.pause()}>Ⅱ 暫停</button>
        : <button className="story-play" onClick={play}>{status === 'error' ? '↻ 重新載入影片' : status === 'ended' ? '↻ 再看一次' : status === 'paused' ? '▶ 繼續播放' : '▶ 播放故事'}</button>}
      <p role="status" aria-live="polite">{status === 'error' ? '影片暫時無法播放，請確認連線後重試。' : status === 'loading' ? '影片載入中…' : status === 'ended' ? '故事播放完畢。' : '國語旁白・繁體中文字幕'}</p>
      {status === 'ended' && film.id === 'opening' && <button onClick={onNext}>接著看：最後一座燈塔</button>}
    </div>
  </div>;
}

export default function StoryCinema({ initialStory = 'opening', onLoadBack }: { initialStory?: StoryId; onLoadBack: () => void }) {
  const [selected, setSelected] = useState<StoryId>(initialStory);
  const heading = useRef<HTMLHeadingElement>(null);
  const filmHeading = useRef<HTMLHeadingElement>(null);
  const film = STORY_FILMS.find(item => item.id === selected)!;
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  function select(id: StoryId) {
    if (id === selected) return;
    setSelected(id);
    requestAnimationFrame(() => {
      filmHeading.current?.focus({ preventScroll: true });
      filmHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
  return <section className="story-cinema" aria-labelledby="story-cinema-title">
    <header className="story-cinema-header"><div><h1 id="story-cinema-title" ref={heading} tabIndex={-1}>星潮故事</h1><p>在群島的另一端，還有人等待回家的光。</p></div><button onClick={onLoadBack}>回港口</button></header>
    <div className="story-film-list" role="group" aria-label="選擇故事">{STORY_FILMS.map(item => <button key={item.id} aria-pressed={selected === item.id} onClick={() => select(item.id)}>
      <img src={item.poster} alt="" width="320" height="180" decoding="async" />
      <span><small>{item.chapter} · {item.duration}</small><strong>{item.title}</strong></span>
      <span className="story-film-mark" aria-hidden="true">{selected === item.id ? '●' : '▶'}</span>
    </button>)}</div>
    <div className="story-film-heading"><h2 ref={filmHeading} tabIndex={-1}>{film.title}</h2><span>{film.duration}</span></div>
    <StoryPlayer key={film.id} film={film} onNext={() => select('lighthouse')} />
    <p className="story-synopsis">{film.description}</p>
  </section>;
}
