import { describe, expect, it } from 'vitest';
import { castleGrowth, castleStyle, CASTLE_STAGES, CASTLE_STYLES, isCastleStyle, MAX_TERRITORY_PLOTS } from '../castle-growth';

describe('castle growth policy', () => {
  it('uses one companion milestone, not total XP or duplicate cards', () => {
    expect(castleGrowth(0, {a:49,b:49}).eligible).toBe(false);
    expect(castleGrowth(0, {a:50}).eligible).toBe(true);
    expect(castleGrowth(1, {a:349}).eligible).toBe(false);
    expect(castleGrowth(1, {a:350}).eligible).toBe(true);
    expect(castleGrowth(2, {a:1000}).next).toBeUndefined();
    expect(castleGrowth(2, {a:1000}).eligible).toBe(false);
  });
  it('keeps historical growth and filters invalid numeric values defensively', () => {
    expect(castleGrowth(0, {tradedPet:50}).eligible).toBe(true);
    const p = castleGrowth(1,{a:100,b:200,c:NaN,d:Infinity,e:-1,f:10_000_001,g:350.5});
    expect(p.companionId).toBe('b');
    expect(p.remaining).toBe(150);
    expect(castleGrowth(0,{}).remaining).toBe(50);
  });
  it('has six stable identities and increasing compatible capacities', () => {
    expect(new Set(CASTLE_STYLES.map(s=>s.id)).size).toBe(6);
    expect(new Set(CASTLE_STYLES.map(s=>s.emblem)).size).toBe(6);
    expect(castleStyle().id).toBe('star-tide');
    expect(castleStyle('unknown').id).toBe('star-tide');
    expect(isCastleStyle('__proto__')).toBe(false);
    expect(isCastleStyle(null)).toBe(false);
    expect(CASTLE_STAGES.map(s=>s.plots)).toEqual([8,16,24]);
    expect(MAX_TERRITORY_PLOTS).toBe(24);
  });
});
