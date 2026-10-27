import { validIslandAtlas, type IslandClip } from "./island-motion";

/** Own only this habitat's current atlas set; visibility controls starting work. */
export function createIslandAtlasLoader(
  ready: Map<string, HTMLImageElement>,
  onReady: () => void,
  createImage: () => HTMLImageElement = () => new Image(),
) {
  const entries = new Map<string, HTMLImageElement>();
  let disposed = false;

  function release(src: string, image: HTMLImageElement) {
    entries.delete(src);
    ready.delete(src);
    image.onload = null;
    image.onerror = null;
    image.removeAttribute("src");
  }

  return {
    sync(clips: readonly IslandClip[], mayStart: boolean) {
      if (disposed) return;
      const wanted = new Map(clips.map(clip => [clip.src, clip]));
      for (const [src, image] of entries) if (!wanted.has(src)) release(src, image);
      // Keep already-loaded sheets across pauses, editing and viewport changes.
      // Pending loads may finish; no new request is started until visible again.
      if (!mayStart) return;
      for (const [src, clip] of wanted) {
        if (entries.has(src)) continue;
        const image = createImage();
        entries.set(src, image);
        image.decoding = "async";
        image.onload = () => {
          if (disposed || entries.get(src) !== image) return;
          image.onload = null;
          image.onerror = null;
          if (validIslandAtlas(image.naturalWidth, image.naturalHeight, clip)) {
            ready.set(src, image);
            onReady();
          }
        };
        // An invalid or failed sheet stays a still portrait, without scroll retries.
        image.onerror = () => { image.onload = null; image.onerror = null; };
        image.src = src;
      }
    },
    dispose() {
      disposed = true;
      for (const [src, image] of entries) release(src, image);
    },
  };
}
