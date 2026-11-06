import { useLayoutEffect, useReducer } from 'react';
import type { ConquestState, Tile } from './conquest';

const REFRESH_MS = 5000;
const MINUTE_MS = 60000;

// Keep the ordinary refresh cadence, but never sleep across a protection,
// combat-lock, or displayed-minute boundary. This only schedules a render.
export function nextConquestClockDelay(tiles: readonly Tile[], now: number) {
  let delay = REFRESH_MS;
  for (const tile of tiles) {
    if (tile.owner) {
      for (const end of [tile.shieldStartsAt, tile.shieldUntil]) {
        if (end === undefined || !Number.isFinite(end) || end <= now) continue;
        const remaining = end - now;
        delay = Math.min(delay, remaining, remaining % MINUTE_MS || MINUTE_MS);
      }
    }
    if (Number.isFinite(tile.battleUntil) && tile.battleUntil! > now) {
      delay = Math.min(delay, tile.battleUntil! - now);
    }
  }
  return delay;
}

export function useConquestClock(snapshot: Pick<ConquestState, 'tiles'> | undefined, readNow: () => number) {
  const [revision, refresh] = useReducer((value: number) => value + 1, 0);
  // Read the server-aligned clock on every render, including a new snapshot or
  // server offset. A stored timestamp would show the new world at an old time.
  const now = readNow();
  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const sync = () => {
      if (disposed) return;
      clearTimeout(timer);
      refresh();
    };
    const resume = () => { if (!document.hidden) sync(); };
    const visibility = () => { if (document.hidden) clearTimeout(timer); else sync(); };
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', visibility);
    if (!document.hidden) {
      const deadline = now + nextConquestClockDelay(snapshot?.tiles ?? [], now);
      const wait = Math.min(REFRESH_MS, deadline - readNow());
      // A boundary may have passed during rendering. Correct it before paint.
      if (wait <= 0) sync();
      else timer = setTimeout(sync, wait);
    }
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [snapshot, readNow, now, revision]);
  return { now, refresh };
}
