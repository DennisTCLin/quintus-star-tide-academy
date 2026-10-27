import manifest from './data/companion-frames.json';
import type { CompanionMascot, TideglowMotion } from './tideglow-companion';
export type FrameClip = { fps: number; size: number; cellHeight?: number; columns: number; perSheet: number; frames: number; sheets: string[]; duration: number };
export function companionFrames(mascot: CompanionMascot, motion: TideglowMotion): FrameClip | undefined {
  return (manifest as Record<string, FrameClip>)[`${mascot}:${motion}`];
}
/** iPad desktop browsing masks the OS; Safari's Version token still identifies its engine. */
export function prefersCompanionFrames(userAgent: string, touchPoints: number) {
  const ios = /(?:iPad|iPhone|iPod).*OS (\d+)[_\.]/.exec(userAgent);
  if (ios) return Number(ios[1]) <= 15;
  const desktopIPad = /Macintosh/.test(userAgent) && touchPoints > 1;
  const safari = /Version\/(\d+)/.exec(userAgent);
  return desktopIPad && Boolean(safari && Number(safari[1]) <= 15);
}
type Events = { ready: () => void; failed: () => void; ended: () => void };
/** Decode at most two small JPEG sheets; draw the original footage without video autoplay. */
export function startCompanionFrames(canvas: HTMLCanvasElement, clip: FrameClip, loop: boolean, events: Events) {
  let active = true, complete = false, raf = 0, start: number | undefined, lastFrame = -1, loaded = 0;
  const context = canvas.getContext('2d');
  const images: HTMLImageElement[] = [];
  const cellHeight = clip.cellHeight ?? clip.size;
  const finish = (failed: boolean) => {
    if (!active || complete) return;
    complete = true; clearTimeout(timeout); cancelAnimationFrame(raf);
    if (failed) events.failed(); else events.ended();
  };
  const timeout = setTimeout(() => finish(true), 8000);
  const tick = (now: number) => {
    if (!active || complete || !context) return;
    if (start === undefined) start = now;
    const elapsed = (now - start) / 1000;
    const frame = Math.min(clip.frames - 1, Math.floor((loop ? elapsed % clip.duration : elapsed) * clip.fps));
    if (frame !== lastFrame) {
      const sheet = images[Math.floor(frame / clip.perSheet)], cell = frame % clip.perSheet;
      try { context.drawImage(sheet, cell % clip.columns * clip.size, Math.floor(cell / clip.columns) * cellHeight, clip.size, cellHeight, 0, 0, clip.size, cellHeight); }
      catch { finish(true); return; }
      lastFrame = frame; canvas.dataset.frame = String(frame);
      if (start === now) events.ready();
    }
    if (!loop && elapsed >= clip.duration) { finish(false); return; }
    raf = requestAnimationFrame(tick);
  };
  if (!context) finish(true);
  else {
    canvas.width = clip.size; canvas.height = cellHeight;
    for (const url of clip.sheets) {
      const img = new Image(); images.push(img);
      img.onload = () => {
        if (!active || complete) return;
        loaded++;
        if (loaded === clip.sheets.length) { clearTimeout(timeout); raf = requestAnimationFrame(tick); }
      };
      img.onerror = () => finish(true); img.src = url;
    }
  }
  return () => {
    active = false; clearTimeout(timeout); cancelAnimationFrame(raf);
    for (const img of images) { img.onload = null; img.onerror = null; img.removeAttribute('src'); }
    images.length = 0;
  };
}
