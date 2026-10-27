import { describe, expect, it } from "vitest";
import { freshHomeDecor } from "../home-decoration";
import { roomSnapshotSync } from "../home-editor-sync";

describe("room editor cloud snapshot reconciliation", () => {
  it("preserves undo/redo when a clean room receives unchanged polling objects", () => {
    const baseline = freshHomeDecor();
    expect(roomSnapshotSync(structuredClone(baseline), baseline, false, false).replace).toBe(false);
    expect(roomSnapshotSync({ ...baseline, revision: 1 }, baseline, false, false).replace).toBe(true);
  });
  it("acknowledges the identical first-open room before a later remote edit", () => {
    const baseline = freshHomeDecor();
    let awaitingSave = true;
    const opening = roomSnapshotSync(structuredClone(baseline), baseline, false, awaitingSave);
    expect(opening).toEqual({ replace: false, clearSaving: true });
    if (opening.clearSaving) awaitingSave = false;
    // A child has since moved furniture. Another device's new revision must
    // trigger the existing stale warning, never overwrite that local draft.
    expect(roomSnapshotSync({ ...baseline, revision: 1 }, baseline, true, awaitingSave).replace).toBe(false);
  });
  it("keeps a pending dirty save through an unchanged poll, then accepts its new revision", () => {
    const baseline = freshHomeDecor();
    expect(roomSnapshotSync(structuredClone(baseline), baseline, true, true)).toEqual({ replace: false, clearSaving: false });
    expect(roomSnapshotSync({ ...baseline, revision: 1 }, baseline, true, true)).toEqual({ replace: true, clearSaving: true });
  });
  it("keeps a dirty draft after failed saving and handles absent saved state", () => {
    const baseline = freshHomeDecor();
    expect(roomSnapshotSync({ ...baseline, revision: 1 }, baseline, true, false)).toEqual({ replace: false, clearSaving: false });
    expect(roomSnapshotSync(undefined, baseline, false, true)).toEqual({ replace: false, clearSaving: false });
  });
});
