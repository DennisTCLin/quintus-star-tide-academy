const enrollment = {allianceId:'forge', heroId:'hero-dwarf', joinedAt:0};
import { describe, expect, it } from 'vitest';
import { createConquest } from '../conquest';
import { expeditionRoster, initialExpedition } from '../conquest-characters';
import { prepareBattle } from '../conquest-battle';
import { BATTLE_RESOLVE, createChoreography } from '../conquest-choreography';
import { assistPose, heroAssist } from '../conquest-hero-motion';
const state = createConquest(), roster = expeditionRoster({}, enrollment);
const setup = () => prepareBattle(state, { mode: 'claim', player: 'p', season: state.season, tileId: '5,0' }, initialExpedition(roster), roster, 'coast', Date.now(), 'hero-elf');
describe('hero collaboration and victory staging', () => {
  it('assists once per allied round and never assists the opposing side', () => {
    const battle = setup(), before = JSON.stringify(battle.result), beats = createChoreography(battle);
    for (const side of [-1, 1]) {
      const assisted = beats.filter(beat => heroAssist(beats, beat, side));
      expect(assisted.length).toBeGreaterThan(0);
      expect(assisted.every(beat => beat.side === side)).toBe(true);
      expect(new Set(assisted.map(beat => beat.round)).size).toBe(assisted.length);
      expect(heroAssist(beats, undefined, side)).toBe(false);
    }
    expect(JSON.stringify(battle.result)).toBe(before);
  });
  it('finishes every actual hit before the victory sequence starts', () => {
    const battle = setup(), beats = createChoreography(battle);
    expect(beats.length).toBe(battle.result.events.length);
    expect(beats.every(beat => beat.end < BATTLE_RESOLVE)).toBe(true);
    expect(beats.map(b => b.damage)).toEqual(battle.result.events.map(e => e.damage));
  });
  it('draws before release then fully recovers instead of holding the shooting pose', () => {
    const beat = createChoreography(setup())[1];
    expect(assistPose(beat, beat.start)).toMatchObject({ draw: 0, recoil: 0 });
    expect(assistPose(beat, beat.launch).draw).toBe(1);
    expect(assistPose(beat, beat.impact).draw).toBe(0);
    expect(assistPose(beat, beat.end).recovery).toBe(1);
    expect(assistPose(beat, beat.end).recoil).toBeCloseTo(0);
  });
});
