import { describe, expect, it } from 'vitest';
import { isSafeMode, recoveryHref } from '../recovery-mode';

describe('per-tab recovery mode', () => {
  it('requires an explicit safe=1 URL', () => {
    expect(isSafeMode('?safe=1')).toBe(true);
    for (const query of ['', '?safe=0', '?unsafe=1', '?safe=true']) expect(isSafeMode(query)).toBe(false);
  });
  it('preserves the current route, unrelated query and anchor when switching modes', () => {
    expect(recoveryHref('https://example.com/academy?view=island#challenge', true))
      .toBe('https://example.com/academy?view=island&safe=1#challenge');
    expect(recoveryHref('https://example.com/academy?view=island&safe=1#challenge', false))
      .toBe('https://example.com/academy?view=island#challenge');
  });
  it('normalizes duplicate safe flags', () => {
    expect(recoveryHref('https://example.com/?safe=0&safe=1', true)).toBe('https://example.com/?safe=1');
    expect(recoveryHref('https://example.com/?safe=1&safe=1', false)).toBe('https://example.com/');
  });
  it('keeps double-leading-slash paths on the original origin in both modes', () => {
    const original = 'https://academy.example//other.example/learn?view=island#challenge';
    const safe = recoveryHref(original, true);
    expect(safe).toBe('https://academy.example//other.example/learn?view=island&safe=1#challenge');
    expect(new URL(safe).origin).toBe(new URL(original).origin);
    expect(recoveryHref(safe, false)).toBe(original);
  });
});
