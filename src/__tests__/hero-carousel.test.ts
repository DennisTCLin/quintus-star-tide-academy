import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import HeroVideoCarousel, { HERO_VIDEO_SLIDES } from '../HeroVideoCarousel'
import { chooseHeroVisit, deferHeroMedia, nextHeroSlideIndex, shouldPlayHeroVideo } from '../hero-carousel'

describe('hero video carousel policy', () => {
  it('advances through the six-shot voyage and wraps safely', () => {
    expect(HERO_VIDEO_SLIDES).toHaveLength(6)
    expect(nextHeroSlideIndex(0, 6)).toBe(1)
    expect(nextHeroSlideIndex(4, 6)).toBe(5)
    expect(nextHeroSlideIndex(5, 6)).toBe(0)
    expect(nextHeroSlideIndex(9, 0)).toBe(0)
  })

  it('shows all six openings before refilling and avoids repeats across visits and bags', () => {
    let raw: string | null = null
    let last = -1
    for (let round = 0; round < 5; round++) {
      const seen = new Set<number>()
      for (let i = 0; i < 6; i++) {
        const visit = chooseHeroVisit(raw, 6, () => 0.42)
        expect(visit.index).not.toBe(last)
        seen.add(visit.index)
        last = visit.index
        raw = JSON.stringify(visit)
      }
      expect(seen.size).toBe(6)
    }
  })

  it('handles corrupted preferences and the last queued scene already seen during autoplay', () => {
    for (const raw of ['broken', 'null', '{}', '{"index":999,"remaining":[0,0]}', '{"remaining":[-1,"x"]}']) {
      const visit = chooseHeroVisit(raw, 6, () => 0)
      expect(visit.index).toBeGreaterThanOrEqual(0)
      expect(visit.index).toBeLessThan(6)
      expect(new Set([visit.index, ...visit.remaining]).size).toBe(6)
    }
    expect(chooseHeroVisit('{"index":3,"remaining":[3]}', 6, () => 0.99).index).not.toBe(3)
    expect(chooseHeroVisit('{"index":0,"remaining":[]}', 1)).toEqual({ index: 0, remaining: [] })
  })

  it('plays only when motion, visibility, pause, and failure gates allow it', () => {
    const base = {
      motionIsReduced: false,
      dataSaver: false,
      mediaReady: true,
      userPaused: false,
      isVisible: true,
      documentVisible: true,
      failed: false,
    }
    expect(shouldPlayHeroVideo(base)).toBe(true)
    expect(shouldPlayHeroVideo({ ...base, motionIsReduced: true })).toBe(false)
    expect(shouldPlayHeroVideo({ ...base, dataSaver: true })).toBe(false)
    expect(shouldPlayHeroVideo({ ...base, mediaReady: false })).toBe(false)
    expect(shouldPlayHeroVideo({ ...base, userPaused: true })).toBe(false)
    expect(shouldPlayHeroVideo({ ...base, isVisible: false })).toBe(false)
    expect(shouldPlayHeroVideo({ ...base, documentVisible: false })).toBe(false)
    expect(shouldPlayHeroVideo({ ...base, failed: true })).toBe(false)
  })

  it('keeps reduced-motion output poster-only and exposes usable carousel semantics', () => {
    const html = renderToStaticMarkup(createElement(HeroVideoCarousel, { reduceMotion: true }))
    expect(html).not.toContain('<video')
    expect(html).toContain('role="region"')
    expect(html).toContain('aria-roledescription="輪播"')
    expect(html).toContain('顯示第 1 段')
    expect(html).toContain('hero-media-layer active')
  })

  it('renders poster-first on the server and gives every fallback a distinct treatment', () => {
    const html = renderToStaticMarkup(createElement(HeroVideoCarousel, { reduceMotion: false }))
    expect(html).not.toContain('<video')
    expect(html).toContain('hero-departure-desktop-poster.jpg?v=1e410a814e85')
    expect(html).not.toContain('hero-companion-desktop.mp4')
    expect(new Set(HERO_VIDEO_SLIDES.map((slide) => slide.posterTheme)).size).toBe(HERO_VIDEO_SLIDES.length)
    expect(new Set(HERO_VIDEO_SLIDES.map((slide) => slide.posterMark)).size).toBe(HERO_VIDEO_SLIDES.length)
  })

  it('does not admit a source from a cancelled idle callback, even if it was already queued', () => {
    const callbacks: (() => void)[] = [], admit = vi.fn(), cancelIdleCallback = vi.fn()
    const scheduler = {
      requestIdleCallback: vi.fn((callback: () => void) => { callbacks.push(callback); return callbacks.length }),
      cancelIdleCallback, setTimeout: vi.fn(() => 1), clearTimeout: vi.fn(),
    }
    const cancel = deferHeroMedia(admit, scheduler)
    expect(scheduler.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1800 })
    cancel(); callbacks[0]()
    expect(admit).not.toHaveBeenCalled()
    expect(cancelIdleCallback).toHaveBeenCalledWith(1)
    expect(scheduler.setTimeout).not.toHaveBeenCalled()
  })

  it('rejects stale callbacks when the platform has no cancelIdleCallback', () => {
    let queued = () => {}; const admit = vi.fn()
    const cancel = deferHeroMedia(admit, {
      requestIdleCallback: callback => { queued = callback; return 1 },
      setTimeout: () => 1, clearTimeout: () => {},
    })
    cancel(); queued(); expect(admit).not.toHaveBeenCalled()
  })

  it('cancels the fallback timer on pause or source removal', () => {
    let queued = () => {}; const admit = vi.fn(), clearTimeout = vi.fn()
    const setTimeout = vi.fn((callback: () => void) => { queued = callback; return 7 })
    const cancel = deferHeroMedia(admit, { setTimeout, clearTimeout })
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 700)
    cancel(); queued(); expect(admit).not.toHaveBeenCalled()
    expect(clearTimeout).toHaveBeenCalledWith(7)
  })

  it('admits only the current source when an earlier deferral is cleaned up', () => {
    const queue: (() => void)[] = [], oldSource = vi.fn(), currentSource = vi.fn()
    const scheduler = { setTimeout: (callback: () => void) => { queue.push(callback); return queue.length }, clearTimeout: () => {} }
    const cancel = deferHeroMedia(oldSource, scheduler); cancel()
    deferHeroMedia(currentSource, scheduler)
    queue[0](); queue[1]()
    expect(oldSource).not.toHaveBeenCalled(); expect(currentSource).toHaveBeenCalledTimes(1)
  })
})
