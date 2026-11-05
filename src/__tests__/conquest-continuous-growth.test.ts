import { expect, it } from 'vitest';
import { ROSTER } from '../game-view';
import { creatureProgress, xpForLevel } from '../companion-growth';
import { expeditionRoster } from '../conquest-characters';
import { advanceConquest, createConquest, health, maxHealth, RECOVERY_MS, syncConquestRoster } from '../conquest';
import { parseConquest } from '../conquest-store';
import { prepareBattle } from '../conquest-battle';

const now = Date.UTC(2026, 10, 5, 12);
it.each(ROSTER)('$id retains current collection level, wounds and saved garrison through repeated upgrades', (species) => {
    const owned = Object.freeze({ [species.id]: 2 });
    const beforeOwned = JSON.stringify(owned);
    let state = createConquest('season-2026-11', now);
    const first = expeditionRoster(owned, undefined, { [species.id]: 0 })[0];
    const maxHp = 60 + first.level * 20;
    state.units[first.id] = { ...first, hp: maxHp * .375, maxHp };
    const tile = state.tiles.find(t => t.id === '0,0')!;
    Object.assign(tile, { owner: 'quintus', guards: [state.units[first.id]], shieldUntil: now + 86400000, capturedAt: now - 1000 });
    state.energy = 83; state.inventory = { herbs: 13, spring: 7, bandage: 2, potion: 1 };
    state.credited = ['preserved-answer']; state.log = ['preserved-history'];
    state = parseConquest(JSON.stringify(state), 'quintus');
    const original = structuredClone(state);
    // Consecutive levels, a larger jump, and XP changes within one level.
    for (const training of [2, 3, 8, 9]) for (const extraXp of [0, 1]) {
      const xp = Object.freeze({ [species.id]: xpForLevel(training) + extraXp });
      const xpBefore = JSON.stringify(xp), previous = structuredClone(state);
      const roster = expeditionRoster(owned, undefined, xp);
      const synced = syncConquestRoster(state, roster);
      const unit = synced.units[first.id];
      expect(unit.level).toBe(creatureProgress(species.rarity, xp[first.id]).level);
      expect(health(unit) / maxHealth(unit)).toBeCloseTo(.375, 12);
      expect(synced.tiles.find(t => t.id === '0,0')!.guards[0]).toEqual(unit);
      expect({ ...synced, units: previous.units, tiles: previous.tiles }).toEqual(previous);
      expect(synced.tiles.map(t => ({ ...t, guards: [] }))).toEqual(original.tiles.map(t => ({ ...t, guards: [] })));
      expect(state).toEqual(previous);
      expect(syncConquestRoster(synced, roster)).toEqual(synced);
      state = parseConquest(JSON.stringify(synced), 'quintus');
      expect(state.units[first.id]).toEqual(unit);
      const preview = prepareBattle(state, { mode: 'drill', player: 'quintus', season: state.season, tileId: '0,0' }, [], roster, 'coast', now);
      expect(preview.defenders[0]).toMatchObject({ level: unit.level, hp: unit.hp, maxHp: unit.maxHp });
      expect(JSON.stringify(xp)).toBe(xpBefore);
      expect(JSON.stringify(owned)).toBe(beforeOwned);
    }
});

it('does not revive on upgrade or multiply normal elapsed-time recovery on repeated syncs', () => {
  const owned = { tideglow: 1 }, roster = expeditionRoster(owned, undefined, { tideglow: xpForLevel(8) });
  const state = createConquest('season-2026-11', now);
  state.units.tideglow = { id: 'tideglow', element: 'water', level: 2, hp: 0, maxHp: 100 };
  let synced = syncConquestRoster(state, roster);
  for (let i = 0; i < 10; i++) synced = syncConquestRoster(synced, roster);
  expect(synced.units.tideglow.hp).toBe(0);
  const recovered = advanceConquest(synced, now + RECOVERY_MS);
  expect(health(recovered.units.tideglow) / maxHealth(recovered.units.tideglow)).toBeCloseTo(.05, 12);
  const repeated = advanceConquest(syncConquestRoster(recovered, roster), now + RECOVERY_MS);
  expect(repeated).toEqual(recovered);
});
