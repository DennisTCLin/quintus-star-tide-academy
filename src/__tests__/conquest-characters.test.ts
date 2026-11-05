const enrollment = {allianceId:'forge', heroId:'hero-dwarf', joinedAt:0};
import { describe, expect, it } from 'vitest';
import { CONQUEST_HEROES, expeditionRoster, initialExpedition, wildIdentity } from '../conquest-characters';
import { ROSTER } from '../game-view';
import { act, createConquest, seasonAt } from '../conquest';
import { prepareBattle, claimReport } from '../conquest-battle';

const now = Date.now(), roster = expeditionRoster({ tideglow: 1 }, enrollment);
const team = initialExpedition(roster), hero = CONQUEST_HEROES[1];
describe('conquest character identity', () => {
  it('uses the collection element for every owned companion', () => {
    const labels = {金:'metal',木:'wood',土:'earth',水:'water',火:'fire'};
    for (const c of expeditionRoster(Object.fromEntries(ROSTER.map(c => [c.id,1])))) expect(c.element).toBe(labels[ROSTER.find(r => r.id === c.id)!.element]);
  });
  it('starts with the equipped collectible and never duplicates it', () => {
    const available = expeditionRoster({ tideglow: 1, bubbleyak: 1 }, enrollment);
    expect(initialExpedition(available, 'bubbleyak')[0]).toBe('bubbleyak');
    expect(new Set(initialExpedition(available, 'tideglow')).size).toBe(4);
    expect(initialExpedition(available, 'not-owned')).not.toContain('not-owned');
  });
  it('keeps owned collection members selectable and marks alliance starters', () => {
    const available = expeditionRoster({ tideglow: 1, bubbleyak: 1 }, enrollment);
    expect(available.find(c => c.id === 'bubbleyak')?.loan).toBe(false);
    expect(available.find(c => c.id === 'pebblefin')?.loan).toBe(true);
    expect(available.find(c => c.id === 'tideglow')?.loan).toBe(false);
  });
  it('preserves selected identities and stable wild species in planning', () => {
    const state = createConquest(), plan = { mode: 'claim' as const, player: 'quintus', season: seasonAt(now), tileId: '0,0' };
    const setup = prepareBattle(state, plan, team, roster, 'coast', now, hero.id);
    expect(setup.commander?.id).toBe(hero.id);
    expect(setup.attackers.map(u => u.speciesId)).toEqual(team);
    expect(setup.defenders.every(u => u.image && u.model && u.name !== '野怪 1')).toBe(true);
    expect(wildIdentity(state.tiles[0].wild[0])).toEqual(wildIdentity(state.tiles[0].wild[0]));
    const noHero = prepareBattle(state, plan, team, roster, 'coast', now);
    expect(setup.result).toEqual(noHero.result);
  });
  it('pins commander and guard identities to the occupied island and receipt', () => {
    const initial = createConquest(), plan = { mode: 'claim' as const, player: 'quintus', season: initial.season, tileId: '0,0' };
    const setup = prepareBattle(initial, plan, team, roster, 'coast', now, hero.id);
    const occupied = act(initial, 'quintus', { type: 'claim', tileId: '0,0', team, commander: hero.id }, roster, now);
    const report = claimReport(setup, occupied, now);
    expect(report.commander?.id).toBe(hero.id);
    const drill = prepareBattle(occupied, { ...plan, mode: 'drill' }, [], [], 'coast', now, CONQUEST_HEROES[0].id);
    expect(drill.commander?.id).toBe(hero.id);
    expect(drill.defenders.map(u => u.speciesId)).toEqual(team);
    expect(drill.defenders.every(u => u.image && u.model)).toBe(true);
    const reinforced = act(occupied, 'quintus', { type: 'reinforce', tileId: '0,0', team: team.slice(0, 3), commander: CONQUEST_HEROES[0].id }, roster, now);
    const tile = reinforced.tiles.find(t => t.id === '0,0')!;
    expect(tile.commander).toBe(CONQUEST_HEROES[0].id);
    expect(tile.shieldUntil).toBe(occupied.tiles.find(t => t.id === '0,0')!.shieldUntil);
    expect(reinforced.energy).toBe(occupied.energy);
    const abandoned = act(reinforced, 'quintus', { type: 'abandon', tileId: '0,0' }, roster, now);
    expect(abandoned.tiles.find(t => t.id === '0,0')!.commander).toBeUndefined();
  });
});
