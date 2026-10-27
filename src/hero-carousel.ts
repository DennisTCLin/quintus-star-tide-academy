export type HeroPlaybackState = {
  motionIsReduced: boolean
  dataSaver: boolean
  mediaReady: boolean
  userPaused: boolean
  isVisible: boolean
  documentVisible: boolean
  failed: boolean
}

export function nextHeroSlideIndex(current: number, slideCount: number) {
  if (!Number.isInteger(current) || !Number.isInteger(slideCount) || slideCount < 1) return 0
  return (Math.max(0, current) + 1) % slideCount
}

export function shouldPlayHeroVideo(state: HeroPlaybackState) {
  return !state.motionIsReduced
    && !state.dataSaver
    && state.mediaReady
    && !state.userPaused
    && state.isVisible
    && state.documentVisible
    && !state.failed
}

type MediaScheduler = {
  requestIdleCallback?: (callback: () => void, options: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
  setTimeout: (callback: () => void, delay: number) => number
  clearTimeout: (handle: number) => void
}

// Cancellation also guards a callback already queued when the source changes.
export function deferHeroMedia(admit: () => void, scheduler: MediaScheduler) {
  let cancelled = false
  const reveal = () => { if (!cancelled) admit() }
  if (scheduler.requestIdleCallback) {
    const handle = scheduler.requestIdleCallback(reveal, { timeout: 1_800 })
    return () => { cancelled = true; scheduler.cancelIdleCallback?.(handle) }
  }
  const handle = scheduler.setTimeout(reveal, 700)
  return () => { cancelled = true; scheduler.clearTimeout(handle) }
}

export const HERO_VISIT_KEY = 'star-tide.hero-visit.v1'
export type HeroVisit = { index: number; remaining: number[] }

// A shuffled bag gives every scene a turn, without repeating the last seen scene.
export function chooseHeroVisit(raw: string | null, count: number, random = Math.random): HeroVisit {
  if (!Number.isInteger(count) || count < 1) return { index: 0, remaining: [] }
  let last = -1
  let remaining: number[] = []
  try {
    const saved = JSON.parse(raw ?? 'null')
    if (saved && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < count) last = saved.index
    if (Array.isArray(saved?.remaining) && saved.remaining.every((n: unknown) =>
      typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < count)
      && new Set(saved.remaining).size === saved.remaining.length) remaining = [...saved.remaining]
  } catch { /* A stale animation preference must never prevent entry. */ }
  if (!remaining.length) {
    remaining = Array.from({ length: count }, (_, index) => index)
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[remaining[i], remaining[j]] = [remaining[j], remaining[i]]
    }
  }
  if (remaining[0] === last && count > 1) {
    if (remaining.length === 1) {
      // The last queued scene may have just played automatically. Start a new bag.
      return chooseHeroVisit(JSON.stringify({ index: last, remaining: [] }), count, random)
    }
    ;[remaining[0], remaining[1]] = [remaining[1], remaining[0]]
  }
  return { index: remaining[0], remaining: remaining.slice(1) }
}

let memoryVisit: string | null = null

export function readHeroVisit(count: number): HeroVisit {
  if (typeof window === 'undefined') return { index: 0, remaining: [] }
  let saved = memoryVisit
  try { saved = window.localStorage.getItem(HERO_VISIT_KEY) ?? saved } catch { /* Private browsing. */ }
  return chooseHeroVisit(saved, count)
}

export function saveHeroVisit(visit: HeroVisit) {
  memoryVisit = JSON.stringify(visit)
  try { window.localStorage.setItem(HERO_VISIT_KEY, memoryVisit) } catch { /* Use memory for this tab. */ }
}
