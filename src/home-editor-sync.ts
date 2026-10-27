import type { HomeDecor } from "./home-decoration";

export function roomSnapshotSync(saved: HomeDecor | undefined, baseline: HomeDecor, dirty: boolean, awaitingSave: boolean) {
  if (!saved) return { replace: false, clearSaving: false };
  const changed = JSON.stringify(saved) !== JSON.stringify(baseline);
  return {
    replace: changed && (!dirty || awaitingSave),
    // Initial open can acknowledge an identical fresh room. An unchanged poll
    // while a dirty save is in flight is not that save's acknowledgement.
    clearSaving: !dirty || (changed && awaitingSave),
  };
}
