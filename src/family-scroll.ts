/** Reset ordinary document scrolling when navigating between game pages. */
export function resetFamilyScroll() {
  window.scrollTo({ top: 0, behavior: 'instant' });
}
