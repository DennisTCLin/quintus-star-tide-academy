export const COMPANION_FRAME_TIMEOUT = 8000;
type PlaybackEvents = { frame: (ready: boolean) => void; failed: () => void; playing?: (duration: number) => void; ended?: () => void };
/** Native Safari posters may disappear as soon as play() starts, before a frame exists.
 * Keep an independent image until a decoded frame is presented, and bound silent stalls. */
export function startCompanionPlayback(node: HTMLVideoElement, events: PlaybackEvents) {
  let active = true, failed = false, finished = false, hasFrame = false, frameEpoch = 0, frameId: number | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined, lastTime = node.currentTime;
  const cancelFrame = () => { frameEpoch++; if (frameId !== undefined) node.cancelVideoFrameCallback?.(frameId); frameId = undefined; };
  const fail = () => {
    if (!active || failed || finished) return;
    failed = true; clearTimeout(watchdog); cancelFrame(); node.pause(); events.frame(false); events.failed();
  };
  const armTimeout = () => { if (watchdog === undefined) watchdog = setTimeout(fail, COMPANION_FRAME_TIMEOUT); };
  const showFrame = () => {
    if (!active || failed || finished || node.readyState < 2 || node.videoWidth === 0) return;
    hasFrame = true; lastTime = node.currentTime; clearTimeout(watchdog); watchdog = undefined; armTimeout(); events.frame(true);
  };
  const requestFrame = () => {
    if (!active || failed || finished || frameId !== undefined || typeof node.requestVideoFrameCallback !== 'function') return;
    const mine = ++frameEpoch;
    frameId = node.requestVideoFrameCallback(() => { if (mine !== frameEpoch) return; frameId = undefined; showFrame(); });
  };
  const playing = () => { if (!active || failed || finished) return; events.playing?.(node.duration); requestFrame(); };
  const timeupdate = () => {
    if (!active || failed || finished || node.currentTime === lastTime) return;
    lastTime = node.currentTime;
    if (typeof node.requestVideoFrameCallback !== 'function') showFrame();
    else if (hasFrame) { clearTimeout(watchdog); watchdog = undefined; armTimeout(); }
  };
  const waiting = () => { if (!active || failed || finished) return; hasFrame = false; events.frame(false); lastTime = node.currentTime; cancelFrame(); armTimeout(); requestFrame(); };
  const ended = () => { if (!active || failed || finished) return; finished = true; clearTimeout(watchdog); cancelFrame(); events.ended?.(); };
  const listeners = { playing, timeupdate, waiting, stalled: waiting, error: fail, ended };
  for (const [name, listener] of Object.entries(listeners)) node.addEventListener(name, listener);
  // Set DOM properties as well as attributes before play() for older iOS WebKit.
  node.muted = true; node.defaultMuted = true; node.playsInline = true;
  node.setAttribute('muted', ''); node.setAttribute('playsinline', ''); node.setAttribute('webkit-playsinline', '');
  events.frame(false); armTimeout(); requestFrame();
  try { void node.play().catch(fail); } catch { fail(); }
  return () => {
    active = false; clearTimeout(watchdog); cancelFrame();
    for (const [name, listener] of Object.entries(listeners)) node.removeEventListener(name, listener);
    node.pause();
  };
}
