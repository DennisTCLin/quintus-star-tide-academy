import { expect, it } from 'vitest';
import { createConquest, shieldActive } from '../conquest';
import { islandProtection } from '../conquest-presentation';
import { nextConquestClockDelay } from '../useConquestClock';

const now = Date.UTC(2026, 10, 6);
const tile = { ...createConquest(undefined, now).tiles[0], owner: 'other', shieldStartsAt: now + 1100, shieldUntil: now + 7100 };
it('wakes at exact protection boundaries rather than the next five-second tick', () => {
  expect(nextConquestClockDelay([tile], now)).toBe(1100);
  expect(nextConquestClockDelay([tile], now + 1099)).toBe(1);
  expect(islandProtection(tile, now + 1099)?.kind).toBe('preparing');
  expect(shieldActive(tile, now + 1100)).toBe(true);
  expect(nextConquestClockDelay([tile], now + 1100)).toBe(5000);
  expect(nextConquestClockDelay([tile], now + 6100)).toBe(1000);
  expect(nextConquestClockDelay([tile], now + 7099)).toBe(1);
  expect(islandProtection(tile, now + 7100)?.kind).toBe('vulnerable');
  expect(nextConquestClockDelay([tile], now + 7100)).toBe(5000);
});
it('updates minute rounding even far from the shield expiry', () => {
  const long = { ...tile, shieldStartsAt: now - 1, shieldUntil: now + 3601100 };
  expect(nextConquestClockDelay([long], now)).toBe(1100);
  expect(islandProtection(long, now)?.detail).toBe('剩餘 1 小時 1 分');
  expect(islandProtection(long, now + 1100)?.detail).toBe('剩餘 1 小時 0 分');
  expect(nextConquestClockDelay([long], now + 1100)).toBe(5000);
});
it('includes battle locks on both owned and wild islands', () => {
  expect(nextConquestClockDelay([{ ...tile, battleUntil: now + 400 }], now)).toBe(400);
  const wild = { ...tile, owner: null, battleUntil: now + 900 };
  expect(nextConquestClockDelay([wild], now)).toBe(900);
  expect(nextConquestClockDelay([wild], now + 900)).toBe(5000);
});
it('resamples overdue, newly supplied and backwards-corrected server times without persisting state', () => {
  const before = JSON.stringify(tile);
  expect(nextConquestClockDelay([tile], now + 90000)).toBe(5000);
  expect(nextConquestClockDelay([{ ...tile, shieldUntil: now + 90250 }], now + 90000)).toBe(250);
  expect(nextConquestClockDelay([tile], now - 1000)).toBe(2100);
  expect(nextConquestClockDelay([], now)).toBe(5000);
  expect(nextConquestClockDelay([{ ...tile, owner: null }], now)).toBe(5000);
  expect(JSON.stringify(tile)).toBe(before);
});
