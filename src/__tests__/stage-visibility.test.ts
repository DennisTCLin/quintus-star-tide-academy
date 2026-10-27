import { describe, expect, it, vi } from "vitest";
import { observeStageVisibility } from "../useStageVisibility";

function fixture(hidden = false, withObserver = true) {
  const watchers: { deliver: (inside: boolean) => void; disconnect: ReturnType<typeof vi.fn> }[] = [];
  const doc = Object.assign(new EventTarget(), { hidden, defaultView: {} as object });
  const target = { ownerDocument: doc } as unknown as Element;
  class Observer {
    disconnect = vi.fn();
    constructor(private receive: IntersectionObserverCallback) {
      watchers.push({ deliver: inside => receive([{ target, isIntersecting: inside } as IntersectionObserverEntry], this as unknown as IntersectionObserver), disconnect: this.disconnect });
    }
    observe = vi.fn();
  }
  if (withObserver) doc.defaultView = { IntersectionObserver: Observer };
  const publish = vi.fn();
  const stop = observeStageVisibility(target, publish);
  const visibility = (isHidden: boolean) => { doc.hidden = isHidden; doc.dispatchEvent(new Event("visibilitychange")); };
  return { doc, target, watchers, publish, stop, visibility, values: () => publish.mock.calls.map(([visible]) => visible) };
}

describe("cosmetic stage visibility ownership", () => {
  it("waits for intersection and does not reactivate an offscreen stage when the document returns", () => {
    const f = fixture();
    expect(f.values()).toEqual([false]);
    f.watchers[0].deliver(false); f.visibility(true); f.visibility(false);
    expect(f.values()).toEqual([false]);
    f.watchers[0].deliver(true); expect(f.values()).toEqual([false, true]);
    f.watchers[0].deliver(false); f.visibility(false);
    expect(f.values()).toEqual([false, true, false]); f.stop();
  });
  it("keeps hidden mounts still even with intersection, and combines either event order", () => {
    const f = fixture(true); f.watchers[0].deliver(true);
    expect(f.values()).toEqual([false]);
    f.visibility(false); f.visibility(true); f.watchers[0].deliver(false); f.visibility(false);
    expect(f.values()).toEqual([false, true, false]);
    f.watchers[0].deliver(true); expect(f.values()).toEqual([false, true, false, true]); f.stop();
  });
  it("falls back without IntersectionObserver while still respecting document visibility", () => {
    const f = fixture(false, false);
    expect(f.values()).toEqual([true]); f.visibility(true); f.visibility(false);
    expect(f.values()).toEqual([true, false, true]); f.stop();
    const hidden = fixture(true, false); expect(hidden.values()).toEqual([false]); hidden.stop();
  });
  it("disposes listeners and queued observer callbacks, including a StrictMode-style replacement", () => {
    const f = fixture(); f.watchers[0].deliver(true); f.stop();
    expect(f.watchers[0].disconnect).toHaveBeenCalledOnce();
    const next = vi.fn(); const stopNext = observeStageVisibility(f.target, next);
    f.watchers[0].deliver(false); f.watchers[0].deliver(true); f.visibility(true); f.visibility(false);
    expect(f.values()).toEqual([false, true]); expect(next.mock.calls).toEqual([[false]]);
    f.watchers[1].deliver(true); expect(next.mock.calls).toEqual([[false], [true]]); stopNext();
  });
});
