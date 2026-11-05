import { describe, expect, it } from 'vitest';
import { act, adjacent, battleResult, claimBlock, claimCost, counters, createConquest, creditAnswer, ELEMENTS, ensureSeason, hexDistance, leaderboard, majority, power, seasonAt, SHIELD_MS, SHIELD_DELAY_MS, health, withHealth, TRIAL_LEVEL, type Companion, type Guard, type Tile } from '../conquest';

const now = Date.UTC(2026, 10, 3, 2);
const fresh = () => createConquest(seasonAt(now), now);
const guard = (element: Guard['element'] = 'metal', level = 5, id = 'test'): Guard => ({ id, element, level });
const roster: Companion[] = Array.from({ length: 10 }, (_, i) => ({ ...guard(ELEMENTS[i % 5], 5, `c${i}`), name: `伙伴${i}`, image: '', loan: true }));
const team = roster.slice(0, 5).map(c => c.id);
const center = (tiles: Tile[]) => tiles.find(t => t.id === '0,0')!;
describe('seasonal conquest geography', () => {
  it('has exactly 91 unique hexes in radius five, with six interior neighbors', () => {
    const s = fresh();
    expect(s.tiles).toHaveLength(91);
    expect(new Set(s.tiles.map(t => t.id)).size).toBe(91);
    expect(s.tiles.every(t => hexDistance(t.q, t.r) <= 5)).toBe(true);
    expect(s.tiles.filter(t => t.distance === 5)).toHaveLength(30);
    expect(s.tiles.filter(t => adjacent(center(s.tiles), t))).toHaveLength(6);
  });
  it('shares geography within a season and changes across seasons', () => {
    expect(fresh()).toEqual(fresh());
    expect(fresh().tiles).not.toEqual(createConquest('season-2026-12').tiles);
    expect(fresh().tiles.every(t => !t.owner && t.shieldUntil === 0)).toBe(true);
    expect(new Set(fresh().tiles.map(t => t.terrain)).size).toBe(5);
    expect(new Set(fresh().tiles.filter(t => t.facility).map(t => t.facility)).size).toBe(5);
  });
  it('uses Taipei month boundaries, and resets progress only at rollover', () => {
    const end = Date.UTC(2026, 9, 31, 15, 59, 59);
    expect(seasonAt(end)).toBe('season-2026-10');
    expect(seasonAt(end + 1000)).toBe('season-2026-11');
    const s = { ...fresh(), energy: 123 };
    expect(ensureSeason(s, now)).toBe(s);
    const next = ensureSeason(s, Date.UTC(2026, 11, 1)); expect(next.season).toBe('season-2026-12'); expect(next.energy).toBe(50); expect(next.tiles.every(t => !t.owner)).toBe(true);
  });
  it('generates integral guards and levels inside the specified ranges for 36 seasons', () => {
    for (let year = 2025; year <= 2027; year++) for (let month = 1; month <= 12; month++) for (const t of createConquest(`season-${year}-${String(month).padStart(2, '0')}`).tiles) {
      const base = 1 + Math.floor(t.distance / 2);
      expect([base, Math.min(5, base + 1)]).toContain(t.guards.length);
      expect(t.guards.every(g => [Math.max(0, t.distance - 1), Math.max(0, t.distance - 1) + 1].includes(g.level))).toBe(true);
    }
  });
});
describe('combat and costs', () => {
  it('keeps the starter island approachable while injury changes otherwise equal matchups', () => {
    const squad = ELEMENTS.map((element, i) => guard(element, TRIAL_LEVEL, `trial${i}`));
    for (let month = 1; month <= 12; month++) expect(battleResult(squad, center(createConquest(`season-2026-${String(month).padStart(2, '0')}`).tiles), 0, 0).won).toBe(true);
    const tile = { ...center(fresh().tiles), element: 'earth' as const, guards: [guard('wood', 4)] };
    expect(battleResult([{ ...guard('wood', 10), hp: 1 }], tile, 0, 0).won).toBe(false);
  });
  it('implements all five directional counters and resolves ties without an element', () => {
    for (let i = 0; i < 5; i++) { expect(counters(ELEMENTS[i], ELEMENTS[(i + 1) % 5])).toBe(true); expect(counters(ELEMENTS[(i + 1) % 5], ELEMENTS[i])).toBe(false); }
    expect(majority([guard('water'), guard('fire')])).toBeNull();
    expect(majority([])).toBeNull();
    expect(majority([guard('water'), guard('water'), guard('fire')])).toBe('water');
  });
  it('uses base damage, defender initiative at equal HP, and elemental multiplier', () => {
    const tile = { ...center(fresh().tiles), element: 'earth' as const, guards: [guard('wood')], facility: null };
    expect(power([guard('metal', 0), guard('metal', 5)])).toBe(45);
    expect(battleResult([guard('wood')], tile, 0, 0).won).toBe(false);
    expect(battleResult([guard('metal')], tile, 0, 0)).toMatchObject({ won: true, attack: 43.75, defense: 35, elemental: true, catchup: false });
  });
  it('applies tower, player defense, then newcomer discount in exact order', () => {
    const tile = { ...center(fresh().tiles), element: 'earth' as const, guards: [guard('wood')], facility: 'tower' as const, owner: 'opponent' };
    expect(claimCost(tile, 2)).toBe(42.8); // (30*1.2 + 35*.5)*.8
    expect(claimCost(tile, 3)).toBe(53.5);
    expect(claimCost({ ...tile, owner: null }, 0)).toBe(28.8);
    expect(claimCost({ ...tile, owner: null, facility: null }, 0)).toBe(24);
  });
  it('applies catch-up and overextension only against owned territory and strictly beyond 2x', () => {
    const tile = { ...center(fresh().tiles), element: 'earth' as const, guards: [guard('wood')], owner: 'opponent' };
    expect(battleResult([guard('metal')], tile, 2, 5)).toMatchObject({ attack: 52.5, defense: 31.5, catchup: true, overextended: true });
    expect(battleResult([guard('metal')], tile, 2, 4)).toMatchObject({ attack: 43.75, defense: 35, catchup: false, overextended: false });
    expect(battleResult([guard('metal')], { ...tile, owner: null }, 0, 99)).toMatchObject({ catchup: false, overextended: false });
  });
  it('terrain does not alter damage, while a matching shrine explicitly buffs its defenders', () => {
    const tile = { ...center(fresh().tiles), element: 'earth' as const, facility: null, guards: [guard('wood')] };
    const baseline = battleResult([guard('metal')], tile, 0, 0);
    expect(battleResult([guard('metal')], { ...tile, terrain: 'mountain', facility: 'shrine', shrineElement: 'metal' }, 0, 0)).toEqual(baseline);
    const buffed = battleResult([guard('metal')], { ...tile, facility: 'shrine', element: 'wood', shrineElement: 'wood' }, 0, 0); expect(buffed.shrineBoost).toBe(true); expect(buffed.defense).toBe(38.5); expect(buffed.events[0].damage).toBe(39);
  });
});
describe('conquest actions', () => {
  it('allows first claim anywhere, installs guards and starts a 24h shield after one contested hour without mutation', () => {
    const s = fresh(); const before = JSON.stringify(s);
    const result = act(s, 'p', { type: 'claim', tileId: '0,0', team }, roster, now);
    expect(JSON.stringify(s)).toBe(before);
    expect(center(result.tiles)).toMatchObject({ owner: 'p', shieldUntil: now + SHIELD_DELAY_MS + SHIELD_MS });
    expect(center(result.tiles).guards.map(g => g.id)).toEqual(team); expect(center(result.tiles).guards.some(g => health(g) < withHealth(g).maxHp!)).toBe(true);
    expect(result.energy).toBe(50 - claimCost(center(s.tiles), 0));
    expect(claimBlock(s, 'p', s.tiles.find(t => t.id === '5,0')!, now)).toBeNull();
  });
  it('enforces adjacency after first capture and rejects insufficient full cost', () => {
    const s = { ...act(fresh(), 'p', { type: 'claim', tileId: '0,0', team }, roster, now), energy: 100 };
    expect(() => act(s, 'p', { type: 'claim', tileId: '5,0', team }, roster, now)).toThrow('相鄰');
    expect(act(s, 'p', { type: 'claim', tileId: '1,0', team: roster.slice(5).map(g => g.id) }, roster, now).tiles.find(t => t.id === '1,0')!.owner).toBe('p');
    expect(() => act({ ...s, energy: 12 }, 'p', { type: 'claim', tileId: '1,0', team }, roster, now)).toThrow('能量不足');
  });
  it('rejects fewer than 3, more than 5, duplicate, and unavailable companions', () => {
    for (const ids of [team.slice(0, 2), [...team, 'c5'], ['c0', 'c0', 'c1'], ['c0', 'c1', 'missing']]) expect(() => act(fresh(), 'p', { type: 'claim', tileId: '0,0', team: ids }, roster, now)).toThrow();
  });
  it('charges half price on loss and preserves defender wounds and ownership', () => {
    const s = fresh(); center(s.tiles).guards = [guard('fire', 50)]; center(s.tiles).facility = 'tower';
    const before = structuredClone(center(s.tiles));
    const lost = act(s, 'p', { type: 'claim', tileId: '0,0', team }, roster, now);
    expect(lost.energy).toBe(35.6);
    expect(center(lost.tiles).owner).toBe(before.owner); expect(center(lost.tiles).shieldUntil).toBe(before.shieldUntil); expect(health(center(lost.tiles).guards[0])).toBeLessThan(health(before.guards[0]));
    expect(lost.lastBattle?.won).toBe(false);
  });
  it('blocks foreign shields until exact expiration, and disables PvP by default', () => {
    const s = fresh(); const tile = center(s.tiles); tile.owner = 'opponent'; tile.shieldUntil = now + 1; s.energy = 200;
    expect(claimBlock(s, 'p', tile, now, true)).toContain('護盾');
    expect(claimBlock(s, 'p', tile, now + 1, true)).toBeNull();
    expect(claimBlock(s, 'p', tile, now + 1)).toContain('PvE');
    expect(() => act(s, 'p', { type: 'claim', tileId: tile.id, team }, roster, now + 1)).toThrow('PvE');
  });
  it('can resolve PvP in the engine when explicitly enabled', () => {
    const s = fresh(); center(s.tiles).owner = 'other'; s.energy = 200;
    const result = act(s, 'p', { type: 'claim', tileId: '0,0', team }, roster, now, true);
    expect(center(result.tiles).owner).toBe('p');
    expect(result.lastBattle?.catchup).toBe(true);
  });
  it('reinforcement is free, replaces guards and never renews protection', () => {
    const s = act(fresh(), 'p', { type: 'claim', tileId: '0,0', team }, roster, now);
    const result = act(s, 'p', { type: 'reinforce', tileId: '0,0', team: ['c5', 'c6', 'c7'] }, roster, now + 10000);
    expect(result.energy).toBe(s.energy);
    expect(center(result.tiles).shieldUntil).toBe(now + SHIELD_DELAY_MS + SHIELD_MS);
    expect(center(result.tiles).guards.map(g => g.id)).toEqual(['c5', 'c6', 'c7']);
    expect(() => act(s, 'other', { type: 'reinforce', tileId: '0,0', team }, roster, now)).toThrow('自己');
  });
  it('abandon is free and restores the exact seeded wild guards', () => {
    const initial = fresh();
    const s = act(initial, 'p', { type: 'claim', tileId: '0,0', team }, roster, now);
    const result = act(s, 'p', { type: 'abandon', tileId: '0,0' }, roster, now);
    expect(result.energy).toBe(s.energy);
    expect(center(result.tiles)).toMatchObject({ owner: null, shieldUntil: 0 }); expect(center(result.tiles).guards).toEqual(center(initial.tiles).wild.map(withHealth)); expect(result.units).toEqual(s.units);
    expect(() => act(s, 'other', { type: 'abandon', tileId: '0,0' }, roster, now)).toThrow('自己');
  });
  it('rejects actions from a stale season rather than applying them to a new map', () => {
    expect(() => act(fresh(), 'p', { type: 'claim', tileId: '0,0', team }, roster, Date.UTC(2026, 11, 1))).toThrow('賽季');
  });
});
describe('learning and rankings', () => {
  it('awards +2 once for wrong, +10 once for correction; different questions still earn', () => {
    let s = creditAnswer(fresh(), 'run:0', false);
    expect(s.energy).toBe(52);
    expect(creditAnswer(s, 'run:0', false)).toBe(s);
    s = creditAnswer(s, 'run:0', true);
    expect(s.energy).toBe(62);
    expect(creditAnswer(s, 'run:0', true)).toBe(s);
    expect(creditAnswer(s, 'run:1', true).energy).toBe(72);
  });
  it('ranks by territory count, then total raw defense; does not mix player sessions', () => {
    const a = fresh(), b = fresh(), c = fresh();
    a.tiles[0].owner = 'a'; a.tiles[0].guards = [guard('metal', 10)];
    b.tiles[0].owner = 'b'; b.tiles[0].guards = [guard('metal', 3)];
    c.tiles[0].owner = c.tiles[1].owner = 'c'; c.tiles[0].guards = c.tiles[1].guards = [guard('metal', 0)];
    expect(leaderboard([{ id: 'b', name: 'B', state: b }, { id: 'a', name: 'A', state: a }, { id: 'c', name: 'C', state: c }]).map(r => [r.id, r.count, r.defense])).toEqual([['c', 2, 20], ['a', 1, 60], ['b', 1, 25]]);
  });
});
