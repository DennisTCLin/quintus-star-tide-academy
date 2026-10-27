import { describe, expect, it } from "vitest";
import { createIslandAtlasLoader } from "../island-atlas-loader";
import type { IslandClip } from "../island-motion";

const clip = (src: string): IslandClip => ({ src, columns: 2, rows: 2, frames: 4, cell: 10, seconds: 1 });
function fixture() {
  const requests: string[] = [];
  const created: HTMLImageElement[] = [];
  const ready = new Map<string, HTMLImageElement>();
  let paints = 0;
  const loader = createIslandAtlasLoader(ready, () => paints++, () => {
    let source = "";
    const image = {
      onload: null, onerror: null, naturalWidth: 20, naturalHeight: 20,
      set src(value: string) { source = value; requests.push(value); },
      get src() { return source; },
      removeAttribute(name: string) { if (name === "src") source = ""; },
    } as unknown as HTMLImageElement;
    created.push(image);
    return image;
  });
  const finish = (i: number) => created[i].onload?.call(created[i], {} as Event);
  return { loader, ready, requests, created, finish, paints: () => paints };
}

describe("habitat atlas request ownership", () => {
  it("defers all requests while inactive and loads each URL once when visible", () => {
    const f = fixture(), clips = [clip("idle"), clip("walk"), clip("idle")];
    for (let i = 0; i < 5; i++) f.loader.sync(clips, false);
    expect(f.requests).toEqual([]);
    f.loader.sync(clips, true); f.finish(0);
    for (let i = 0; i < 3; i++) { f.loader.sync(clips, false); f.loader.sync(clips, true); }
    expect(f.requests).toEqual(["idle", "walk"]);
    expect([...f.ready.keys()]).toEqual(["idle"]);
    // A request already in flight can finish while paused, without starting more.
    f.loader.sync([...clips, clip("play")], false); f.finish(1);
    expect([...f.ready.keys()]).toEqual(["idle", "walk"]);
    expect(f.requests).toHaveLength(2);
    f.loader.sync([...clips, clip("play")], true);
    expect(f.requests).toEqual(["idle", "walk", "play"]);
  });

  it("retains shared sheets and rejects stale callbacks across A→B→A", () => {
    const f = fixture();
    f.loader.sync([clip("a"), clip("shared")], true);
    const staleA = f.created[0].onload!;
    f.finish(1);
    f.loader.sync([clip("b"), clip("shared")], true);
    expect(f.created[0].src).toBe("");
    expect(f.ready.has("shared")).toBe(true);
    f.loader.sync([clip("a"), clip("shared")], true);
    staleA.call(f.created[0], {} as Event);
    expect(f.ready.has("a")).toBe(false);
    f.finish(3);
    expect(f.ready.get("a")).toBe(f.created[3]);
    expect(f.requests).toEqual(["a", "shared", "b", "a"]);
    expect(f.paints()).toBe(2);
  });

  it("releases obsolete sheets even while hidden, without starting the new batch", () => {
    const f = fixture();
    f.loader.sync([clip("a")], true); f.finish(0);
    f.loader.sync([clip("b")], false);
    expect(f.ready.size).toBe(0);
    expect(f.created[0].src).toBe("");
    expect(f.requests).toEqual(["a"]);
    f.loader.sync([clip("b")], true);
    expect(f.requests).toEqual(["a", "b"]);
  });

  it("keeps failed or malformed atlases as still portraits without scroll retries", () => {
    const f = fixture();
    f.loader.sync([clip("failed"), clip("wrong-size")], true);
    f.created[0].onerror?.call(f.created[0], {} as Event);
    Object.defineProperty(f.created[1], "naturalWidth", { value: 19 }); f.finish(1);
    f.loader.sync([clip("failed"), clip("wrong-size")], false);
    f.loader.sync([clip("failed"), clip("wrong-size")], true);
    expect(f.requests).toHaveLength(2);
    expect(f.ready.size).toBe(0);
    expect(f.paints()).toBe(0);
  });

  it("disposes pending and ready ownership; late callbacks cannot resurrect either", () => {
    const f = fixture();
    f.loader.sync([clip("ready"), clip("pending")], true); f.finish(0);
    const stale = f.created[1].onload!;
    f.loader.dispose(); stale.call(f.created[1], {} as Event);
    f.loader.sync([clip("new")], true);
    expect(f.ready.size).toBe(0);
    expect(f.requests).toEqual(["ready", "pending"]);
    expect(f.created.every(image => image.onload === null && image.src === "")).toBe(true);
    expect(f.paints()).toBe(1);
  });
});
