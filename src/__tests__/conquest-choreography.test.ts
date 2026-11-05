const enrollment = {allianceId:'forge', heroId:'hero-dwarf', joinedAt:0};
import { describe, expect, it } from 'vitest';
import { battleResult, createConquest, health } from '../conquest';
import { expeditionRoster, initialExpedition } from '../conquest-characters';
import { prepareBattle } from '../conquest-battle';
import { battleHealth, beatAt, combatKey, createChoreography } from '../conquest-choreography';
const state = createConquest(), roster = expeditionRoster({}, enrollment), team = initialExpedition(roster);
const setup = () => prepareBattle(state, { mode: 'claim', player: 'p', season: state.season, tileId: '0,0' }, team, roster, 'coast', Date.now(), 'hero-elf');
describe('authoritative battle choreography', () => {
  it('replays every real impact exactly once, without synthetic attacks', () => {
    const battle = setup(), beats = createChoreography(battle);
    expect(beats).toHaveLength(battle.result.events.length);
    for (const [i, beat] of beats.entries()) {
      const event = battle.result.events[i];
      expect(beat.source).toBe(combatKey(event.side, event.source)); expect(beat.target).toBe(combatKey(-event.side, event.target));
      expect(beat.damage).toBe(event.damage); expect(beat.targetHp).toBe(event.hp);
      expect(beat.start).toBeLessThan(beat.launch); expect(beat.launch).toBeLessThan(beat.impact); expect(beat.impact).toBeLessThan(beat.end);
      if (i) expect(beats[i - 1].end).toBeLessThanOrEqual(beat.start);
      expect(beatAt(beats, beat.impact)?.id).toBe(beat.id);
    }
    expect(beatAt(beats, -1)).toBeUndefined(); expect(beatAt(beats, 1)).toBeUndefined();
  });
  it('changes HP at the impact frame and ends at the exact committed HP, including skip', () => {
    const battle = setup(), beats = createChoreography(battle), first = beats[0];
    const target = battle.attackers.find(g => g.id === battle.result.events[0].target)!;
    expect(battleHealth(battle, beats, -1, target.id, first.impact - .00001)).toBe(health(target));
    expect(battleHealth(battle, beats, -1, target.id, first.impact)).toBe(first.targetHp);
    for (const [list, side] of [[battle.result.attackersAfter, -1], [battle.result.defendersAfter, 1]] as const) for (const unit of list) expect(battleHealth(battle, beats, side, unit.id, 1)).toBe(health(unit));
  });
  it('never animates an attack after its source was knocked out', () => {
    const battle = setup(), dead = new Set<string>();
    for (const beat of createChoreography(battle)) { expect(dead.has(beat.source)).toBe(false); if (beat.knockedOut) dead.add(beat.target); }
  });
  it('handles unknown original-art species and identical IDs on opposite sides', () => {
    const battle = setup(); battle.attackers = [{ ...battle.attackers[0], id: 'same', speciesId: 'unknown' }]; battle.defenders = [{ ...battle.attackers[0] }];
    battle.result = battleResult(battle.attackers, { ...state.tiles[0], guards: battle.defenders }, 0, 0);
    const beats = createChoreography(battle); expect(beats[0]).toMatchObject({ source: '1:same', target: '-1:same', name: '元素突擊' });
  });
  it('empty islands have no invented attacks and an actual win', () => {
    const battle = setup(); battle.defenders = []; battle.result = battleResult(battle.attackers, { ...state.tiles[0], guards: [] }, 0, 0);
    expect(battle.result.won).toBe(true); expect(createChoreography(battle)).toEqual([]);
  });
});
