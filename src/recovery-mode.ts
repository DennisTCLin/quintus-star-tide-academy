/** A per-tab recovery choice; never modifies account or progress preferences. */
export function isSafeMode(search: string): boolean {
  return new URLSearchParams(search).get('safe') === '1';
}

export function recoveryHref(href: string, safe: boolean): string {
  const url = new URL(href);
  if (safe) url.searchParams.set('safe', '1');
  else url.searchParams.delete('safe');
  // A path starting with // would otherwise be interpreted as another host.
  return url.origin + url.pathname + url.search + url.hash;
}

export const SAFE_MODE = typeof window !== 'undefined' && isSafeMode(window.location.search);
