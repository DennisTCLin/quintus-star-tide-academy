import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { deferHeroMedia, nextHeroSlideIndex, readHeroVisit, saveHeroVisit, shouldPlayHeroVideo } from './hero-carousel'

type NetworkConnection = EventTarget & { saveData?: boolean }

type NavigatorWithConnection = Navigator & {
  connection?: NetworkConnection
}

export type HeroVideoSlide = {
  id: string
  shortLabel: string
  title: string
  desktopVideoSrc: string
  mobileVideoSrc: string
  desktopPosterSrc: string
  mobilePosterSrc: string
  focalPoint: string
  mobileFocalPoint: string
  posterTheme: 'departure' | 'companion' | 'shield' | 'starwhale' | 'aurora' | 'meteor'
  posterMark: string
}

export const HERO_VIDEO_SLIDES: HeroVideoSlide[] = [
  {
    id: 'departure',
    shortLabel: '破浪啟航',
    title: '星潮船穿過晨光海峽，航向漂浮島嶼',
    desktopVideoSrc: '/assets/hero-departure-desktop.mp4?v=6749bb1f1bd5',
    mobileVideoSrc: '/assets/hero-departure-mobile.mp4?v=e4076f4c9770',
    desktopPosterSrc: '/assets/hero-departure-desktop-poster.jpg?v=1e410a814e85',
    mobilePosterSrc: '/assets/hero-departure-mobile-poster.jpg?v=66fc9e4bf800',
    focalPoint: '67% 50%',
    mobileFocalPoint: '66% 50%',
    posterTheme: 'departure',
    posterMark: '⌑',
  },
  {
    id: 'companion',
    shortLabel: '夥伴領航',
    title: '潮光獸點亮航線，知識星圖在海面展開',
    desktopVideoSrc: '/assets/hero-companion-desktop.mp4?v=59dee1235519',
    mobileVideoSrc: '/assets/hero-companion-mobile.mp4?v=faa45de61aba',
    desktopPosterSrc: '/assets/hero-companion-desktop-poster.jpg?v=4d1747d34812',
    mobilePosterSrc: '/assets/hero-companion-mobile-poster.jpg?v=6409dffc99d1',
    focalPoint: '70% 46%',
    mobileFocalPoint: '73% 48%',
    posterTheme: 'companion',
    posterMark: '✦',
  },
  {
    id: 'shield',
    shortLabel: '護盾挑戰',
    title: '探險船升起知識護盾，穿越友善的訓練浪潮',
    desktopVideoSrc: '/assets/hero-shield-desktop.mp4?v=5fab70311401',
    mobileVideoSrc: '/assets/hero-shield-mobile.mp4?v=3d443ecdb058',
    desktopPosterSrc: '/assets/hero-shield-desktop-poster.jpg?v=729c8ec36fb1',
    mobilePosterSrc: '/assets/hero-shield-mobile-poster.jpg?v=4ff330cf25fe',
    focalPoint: '64% 50%',
    mobileFocalPoint: '61% 50%',
    posterTheme: 'shield',
    posterMark: '◈',
  },
  {
    "id": "starwhale",
    "shortLabel": "星鯨巡遊",
    "title": "星鯨穿過浮島，在暮色星海留下溫柔光跡",
    "desktopVideoSrc": "/assets/hero-starwhale-desktop.mp4?v=d80ef2b491bc",
    "mobileVideoSrc": "/assets/hero-starwhale-mobile.mp4?v=e13e2914497b",
    "desktopPosterSrc": "/assets/hero-starwhale-desktop-poster.jpg?v=1d8b5adb584f",
    "mobilePosterSrc": "/assets/hero-starwhale-mobile-poster.jpg?v=1ddd92dba72c",
    "focalPoint": "50% 50%",
    "mobileFocalPoint": "50% 50%",
    "posterTheme": "starwhale",
    "posterMark": "☾"
  },
  {
    "id": "aurora",
    "shortLabel": "極光群島",
    "title": "極光緩緩展開，燈塔照亮通往學院的海路",
    "desktopVideoSrc": "/assets/hero-aurora-desktop.mp4?v=8aec5fc6f65f",
    "mobileVideoSrc": "/assets/hero-aurora-mobile.mp4?v=0cf4cf93574a",
    "desktopPosterSrc": "/assets/hero-aurora-desktop-poster.jpg?v=bcfcb271eb12",
    "mobilePosterSrc": "/assets/hero-aurora-mobile-poster.jpg?v=504c93ef6159",
    "focalPoint": "50% 50%",
    "mobileFocalPoint": "50% 50%",
    "posterTheme": "aurora",
    "posterMark": "❋"
  },
  {
    "id": "meteor",
    "shortLabel": "流星許願",
    "title": "流星掠過寧靜港灣，陪航海員許下新願望",
    "desktopVideoSrc": "/assets/hero-meteor-desktop.mp4?v=525f809e3616",
    "mobileVideoSrc": "/assets/hero-meteor-mobile.mp4?v=e76d6f976d45",
    "desktopPosterSrc": "/assets/hero-meteor-desktop-poster.jpg?v=c422cfd6c552",
    "mobilePosterSrc": "/assets/hero-meteor-mobile-poster.jpg?v=0dad3ea4bf98",
    "focalPoint": "50% 50%",
    "mobileFocalPoint": "50% 50%",
    "posterTheme": "meteor",
    "posterMark": "✧"
  },
]

function useSystemReducedMotion() {
  const [reduced, setReduced] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ))

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return reduced
}

function useDataSaver() {
  const readPreference = () => Boolean(
    typeof navigator !== 'undefined'
    && (navigator as NavigatorWithConnection).connection?.saveData,
  )
  const [dataSaver, setDataSaver] = useState(readPreference)

  useEffect(() => {
    const connection = (navigator as NavigatorWithConnection).connection
    if (!connection) return
    const update = () => setDataSaver(readPreference())
    update()
    connection.addEventListener('change', update)
    return () => connection.removeEventListener('change', update)
  }, [])

  return dataSaver
}

function useMobileHeroMedia() {
  const [mobile, setMobile] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
  ))

  useEffect(() => {
    const query = window.matchMedia('(max-width: 720px)')
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return mobile
}

function useDeferredMedia(enabled: boolean) {
  const [mediaReady, setMediaReady] = useState(false)

  useEffect(() => {
    // Admission is sticky for this source. Pausing must not discard its position.
    if (!enabled || mediaReady) return
    return deferHeroMedia(() => setMediaReady(true), window)
  }, [enabled, mediaReady])

  return mediaReady
}

function HeroVideoSource({ src, playAllowed, ready, onLoadedData, onEnded, onError, onBlocked }: {
  src: string; playAllowed: boolean; ready: boolean;
  onLoadedData: () => void; onEnded: () => void; onError: () => void; onBlocked: () => void;
}) {
  const admitted = useDeferredMedia(playAllowed)
  const videoRef = useRef<HTMLVideoElement>(null)
  const blockedRef = useRef(onBlocked)
  blockedRef.current = onBlocked
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!playAllowed) { video.pause(); return }
    let cancelled = false
    void video.play().catch((error: unknown) => {
      if (!cancelled && error instanceof DOMException && error.name === 'NotAllowedError') blockedRef.current()
    })
    return () => { cancelled = true; video.pause() }
  }, [admitted, playAllowed])
  if (!admitted) return null
  return <video ref={videoRef} className={ready ? 'ready' : ''} src={src}
    muted playsInline preload="metadata" tabIndex={-1}
    onLoadedData={onLoadedData} onEnded={onEnded} onError={onError} />
}

export default function HeroVideoCarousel({ reduceMotion, entrance = false, suspended = false }: { reduceMotion: boolean; entrance?: boolean; suspended?: boolean }) {
  // Reading is side-effect free: StrictMode may initialize twice, but only commits one visit.
  const [visit] = useState(() => readHeroVisit(HERO_VIDEO_SLIDES.length))
  const [activeIndex, setActiveIndex] = useState(visit.index)
  const [userPaused, setUserPaused] = useState(false)
  const [isVisible, setIsVisible] = useState(() => typeof window !== 'undefined' && !('IntersectionObserver' in window))
  const [documentVisible, setDocumentVisible] = useState(() => (
    typeof document === 'undefined' || !document.hidden
  ))
  const [failedVideos, setFailedVideos] = useState<Record<string, boolean>>({})
  const [readyVideoId, setReadyVideoId] = useState<string | null>(null)
  const regionRef = useRef<HTMLDivElement>(null)
  const systemReducedMotion = useSystemReducedMotion()
  const motionIsReduced = reduceMotion || systemReducedMotion
  const dataSaver = useDataSaver()
  const mobileMedia = useMobileHeroMedia()
  const activeVideoFailed = Boolean(failedVideos[HERO_VIDEO_SLIDES[activeIndex].id])
  const mediaAllowed = !motionIsReduced && !dataSaver && !activeVideoFailed && !suspended
  const mediaReady = readyVideoId === `${HERO_VIDEO_SLIDES[activeIndex].id}-${mobileMedia ? 'mobile' : 'desktop'}`
  const videoShouldPlay = shouldPlayHeroVideo({
    motionIsReduced,
    dataSaver,
    // The keyed child defers admission using these same gates, then plays.
    mediaReady: true,
    userPaused,
    isVisible: isVisible && !suspended,
    documentVisible,
    failed: activeVideoFailed,
  })
  const playbackPaused = !videoShouldPlay
  const activeSlide = HERO_VIDEO_SLIDES[activeIndex]
  const activeVideoKey = `${activeSlide.id}-${mobileMedia ? 'mobile' : 'desktop'}`
  const activeVideoSrc = mobileMedia ? activeSlide.mobileVideoSrc : activeSlide.desktopVideoSrc

  useEffect(() => {
    saveHeroVisit({ index: activeIndex, remaining: visit.remaining })
  }, [activeIndex, visit])

  useEffect(() => {
    const region = regionRef.current?.querySelector('.hero-media')
    if (!region || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: [0] },
    )
    observer.observe(region)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  useEffect(() => {
    setReadyVideoId(null)
  }, [activeVideoKey, mediaAllowed])

  function selectSlide(index: number) {
    if (index === activeIndex) return
    setReadyVideoId(null)
    setActiveIndex(index)
  }

  function advanceSlide() {
    if (playbackPaused) return
    setReadyVideoId(null)
    setActiveIndex((current) => nextHeroSlideIndex(current, HERO_VIDEO_SLIDES.length))
  }

  function togglePlayback() {
    setUserPaused((current) => !current)
  }

  function markActiveVideoFailed() {
    setReadyVideoId(null)
    setFailedVideos((current) => ({ ...current, [activeSlide.id]: true }))
  }

  return (
    <div
      className={`hero-carousel ${entrance ? 'hero-carousel--entrance' : ''} ${playbackPaused ? 'is-paused' : ''}`}
      ref={regionRef}
      role="region"
      aria-label="首頁航線影片"
      aria-roledescription="輪播"
    >
      <div className="hero-media" aria-hidden="true">
        <div
          className="hero-media-layer active"
          key={activeSlide.id}
          style={{
            '--hero-focal-point': activeSlide.focalPoint,
            '--hero-mobile-focal-point': activeSlide.mobileFocalPoint,
          } as CSSProperties}
        >
          <picture
            className={`hero-poster hero-poster--${activeSlide.posterTheme}`}
            data-mark={activeSlide.posterMark}
          >
            <source media="(max-width: 720px)" srcSet={activeSlide.mobilePosterSrc} />
            <img src={activeSlide.desktopPosterSrc} alt="" />
          </picture>
          {mediaAllowed && (
            <HeroVideoSource
              key={activeVideoKey}
              src={activeVideoSrc}
              playAllowed={videoShouldPlay}
              ready={mediaReady}
              onLoadedData={() => setReadyVideoId(activeVideoKey)}
              onEnded={advanceSlide}
              onError={markActiveVideoFailed}
              onBlocked={() => setUserPaused(true)}
            />
          )}
        </div>
      </div>

      <div className="hero-carousel-controls" role="group" aria-label="首頁航線影片輪播控制">
        <div className="hero-route-tabs" role="group" aria-label="選擇航線片段">
          {HERO_VIDEO_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-pressed={index === activeIndex}
              aria-label={`顯示第 ${index + 1} 段：${slide.shortLabel}`}
              className={index === activeIndex ? 'active' : ''}
              onClick={() => selectSlide(index)}
            >
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <strong>{slide.shortLabel}</strong>
            </button>
          ))}
        </div>
        {(!entrance || userPaused) && <button
          type="button"
          className="hero-playback-toggle"
          aria-label={failedVideos[activeSlide.id]
            ? '這段影片無法播放，目前顯示靜態圖片'
            : motionIsReduced
              ? '已依減少動態設定顯示靜態圖片'
              : dataSaver
                ? '已依資料節省設定顯示靜態圖片'
                : !mediaReady
                  ? userPaused ? '播放稍後載入的首頁航線影片' : '暫停稍後自動播放的首頁航線影片'
              : userPaused ? '播放首頁航線影片' : '暫停首頁航線影片'}
          aria-pressed={userPaused}
          disabled={motionIsReduced || dataSaver || Boolean(failedVideos[activeSlide.id])}
          onClick={togglePlayback}
        >
          {motionIsReduced || dataSaver || activeVideoFailed ? '靜態畫面' : userPaused ? '播放動畫' : '暫停動畫'}
        </button>}
      </div>
      <p className="visually-hidden">目前片段：{activeSlide.shortLabel}。{activeSlide.title}</p>
    </div>
  )
}
