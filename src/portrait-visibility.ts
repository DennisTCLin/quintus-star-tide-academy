// One observer and one visibility listener for the whole collection, not one per card.
const images = new Map<HTMLImageElement, boolean>();
let observer: IntersectionObserver | undefined;
export function refreshPortraitVisibility() {
  images.forEach((visible, image) => { image.dataset.characterActive = String(visible && image.complete && image.naturalWidth > 0 && !document.hidden); });
}
export function observePortrait(image: HTMLImageElement) {
  if (!images.size) document.addEventListener('visibilitychange', refreshPortraitVisibility);
  images.set(image, false);
  image.dataset.characterActive = 'false';
  if (typeof IntersectionObserver !== 'undefined') {
    observer ??= new IntersectionObserver(entries => {
      for (const entry of entries) if (images.has(entry.target as HTMLImageElement)) images.set(entry.target as HTMLImageElement, entry.isIntersecting);
      refreshPortraitVisibility();
    });
    observer.observe(image);
  } else { images.set(image, true); refreshPortraitVisibility(); }
  return () => {
    observer?.unobserve(image); images.delete(image);
    if (!images.size) {
      observer?.disconnect(); observer = undefined;
      document.removeEventListener('visibilitychange', refreshPortraitVisibility);
    }
  };
}
