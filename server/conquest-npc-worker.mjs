export const NPC_TICK_MS = 30000;

// Runs without requests or presence. A cycle schedules its successor only after
// settling; the service's database world lock provides cross-replica exclusion.
export function startNpcRaidWorker({ tick, intervalMs = NPC_TICK_MS, onError = () => console.error('NPC raid worker failed; will retry') }) {
  if (!Number.isFinite(intervalMs) || intervalMs < 1) throw Error('Invalid NPC worker interval');
  let stopped = false, timer, running = null;
  const schedule = delay => { timer = setTimeout(run, delay); timer.unref?.(); };
  const run = () => {
    if (stopped) return;
    running = Promise.resolve().then(tick).catch(onError).finally(() => {
      running = null;
      if (!stopped) schedule(intervalMs);
    });
  };
  schedule(0);
  return { stop: async () => { stopped = true; clearTimeout(timer); await running; } };
}
