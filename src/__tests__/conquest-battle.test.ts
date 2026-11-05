import { describe, expect, it } from 'vitest';
import { act, createConquest, seasonAt, type Companion, type Guard } from '../conquest';
import { claimReport, drillReport, prepareBattle, type BattlePlan } from '../conquest-battle';
const now = Date.UTC(2026, 10, 3, 4), fresh = () => createConquest(seasonAt(now), now);
const roster: Companion[] = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, name: `夥伴${i}`, image: '', level: 4, element: 'metal', loan: true }));
const team = roster.map(c => c.id);
const plan: BattlePlan = { mode: 'claim', player: 'p', season: seasonAt(now), tileId: '0,0' };
const guard = (id: string, level = 4, element: Guard['element'] = 'metal'): Guard => ({ id, level, element });
describe('conquest battle preparation and receipts', () => {
  it('prepares a cancellable attack without changing energy, ownership or guards', () => {
    const state = fresh(), before = JSON.stringify(state);
    const setup = prepareBattle(state, plan, team, roster, 'coast', now);
    expect(setup.fullCost).toBe(24); expect(setup.attackers).toHaveLength(5); expect(setup.block).toBeNull();
    expect(JSON.stringify(state)).toBe(before);
    roster[0].level = 99; expect(setup.attackers[0].level).toBe(4); roster[0].level = 4;
  });
  it('rejects invalid teams and unavailable outer islands before confirmation', () => {
    for (const ids of [team.slice(0, 2), [...team, 'extra'], ['c0', 'c0', 'c1'], ['c0', 'c1', 'missing']]) expect(prepareBattle(fresh(), plan, ids, roster, 'coast', now).block).toContain('3–5');
    expect(() => prepareBattle(fresh(), { ...plan, tileId: 'locked:6,0' }, team, roster, 'coast', now)).toThrow('尚未開放');
  });
  it('uses the authoritative committed result and does not settle again when building a receipt', () => {
    const state = fresh(), setup = prepareBattle(state, plan, team, roster, 'coast', now);
    const committed = act(state, 'p', { type: 'claim', tileId: '0,0', team, season: state.season }, roster, now);
    const before = JSON.stringify(committed);
    const receipt = claimReport({ ...setup, result: { ...setup.result, won: false, cost: 999 } }, committed, now);
    expect(receipt.playerWon).toBe(true); expect(receipt.result.cost).toBe(24); expect(receipt.energyAfter).toBe(26);
    expect(claimReport(setup, committed, now).energyAfter).toBe(26); expect(JSON.stringify(committed)).toBe(before);
  });
  it('pins confirmation to its preview season even if the parent has already rolled over', () => {
    expect(() => prepareBattle(fresh(), { ...plan, season: 'season-2026-10' }, team, roster, 'coast', now)).toThrow('航季');
    expect(() => act(fresh(), 'p', { type: 'claim', tileId: '0,0', team, season: 'season-2026-10' }, roster, now)).toThrow('賽季');
  });
  it('preserves a losing outcome and exact half-price in its receipt', () => {
    const state = fresh(); state.tiles.find(t => t.id === '0,0')!.guards = [guard('enemy', 100)];
    const setup = prepareBattle(state, plan, team, roster, 'coast', now);
    const committed = act(state, 'p', { type: 'claim', tileId: '0,0', team }, roster, now);
    expect(claimReport(setup, committed, now)).toMatchObject({ playerWon: false, energyAfter: 38, result: { cost: 12 } });
    expect(committed.tiles.find(t => t.id === '0,0')!.owner).toBeNull();
  });
});
describe('pure defense drills', () => {
  it.each([[20, false], [4, false], [0, true]])('defender win/loss/tie with enemy level %i leaves all state unchanged', (enemyLevel, playerWon) => {
    const state = act(fresh(), 'p', { type: 'claim', tileId: '0,0', team: team.slice(0, 3) }, roster, now);
    for (const tile of state.tiles) tile.wild = [0, 1, 2].map(i => guard(`enemy${i}`, enemyLevel));
    const before = JSON.stringify(state), setup = prepareBattle(state, { ...plan, mode: 'drill' }, [], roster, 'deep', now);
    const result = drillReport(setup, state, now);
    expect(result.playerWon).toBe(playerWon); expect(result.result.cost).toBe(0); expect(result.energyAfter).toBe(state.energy);
    expect(result.result.catchup).toBe(false); expect(result.result.overextended).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });
  it('requires owned territory and uses real seasonal wild configurations for each difficulty', () => {
    expect(() => prepareBattle(fresh(), { ...plan, mode: 'drill' }, [], roster, 'coast', now)).toThrow('自己');
    const state = act(fresh(), 'p', { type: 'claim', tileId: '0,0', team }, roster, now);
    const coast = prepareBattle(state, { ...plan, mode: 'drill' }, [], roster, 'coast', now), deep = prepareBattle(state, { ...plan, mode: 'drill' }, [], roster, 'deep', now);
    expect(coast.attackers.every(g => g.level <= 1)).toBe(true); expect(deep.attackers.every(g => g.level >= 3)).toBe(true);
    expect(deep.defenders.map(g => g.id)).toEqual(team);
  });
});
