import { expect, it } from 'vitest';
import { act, advanceConquest, createConquest, currentUnit, health, maxHealth, readyToDeploy, RECOVERY_MS, seasonAt, syncConquestRoster, type Companion } from '../conquest';
import { prepareBattle } from '../conquest-battle';
import { expeditionRoster } from '../conquest-characters';
import { parseConquest } from '../conquest-store';
import { xpForLevel } from '../companion-growth';

const now = Date.UTC(2026, 10, 5, 2);
const fresh = () => createConquest(seasonAt(now), now);
const roster: Companion[] = [62, 36, 11].map((level, i) => ({ id: `c${i}`, level, element: 'water', name: `夥伴${i}`, image: '', loan: false }));
const center = (s: ReturnType<typeof fresh>) => s.tiles.find(t => t.id === '0,0')!;
const legacy = () => {
  const s = fresh();
  roster.forEach(c => { s.units[c.id] = { id: c.id, level: 4, element: c.element, hp: 70, maxHp: 140 }; });
  return s;
};

it('uses native plus earned levels for owned creatures, and only loans stay at four', () => {
  const enrollment = { allianceId: 'verdant', heroId: 'hero-elf', joinedAt: now };
  const owned = Object.freeze({ aetherdragon: 1, tideglow: 1 });
  const xp = Object.freeze({ aetherdragon: xpForLevel(23), tideglow: xpForLevel(2) });
  const units = expeditionRoster(owned, undefined, xp);
  expect(units.find(c => c.id === 'aetherdragon')!.level).toBe(62);
  expect(units.find(c => c.id === 'tideglow')!.level).toBe(2);
  expect(expeditionRoster({ aetherdragon: 1 })[0].level).toBe(40);
  const loans = expeditionRoster(owned, enrollment, { ...xp, seasprout: 10000 });
  expect(loans.filter(c => c.loan).every(c => c.level === 4)).toBe(true);
  expect(loans.filter(c => c.loan)).toHaveLength(2);
  expect(loans.find(c => c.id === 'tideglow')!.level).toBe(2);
  expect(owned).toEqual({ aetherdragon: 1, tideglow: 1 });
  expect(xp.aetherdragon).toBe(xpForLevel(23));
});

it('projects legacy injury and stationed defenders without changing other state or wild guards', () => {
  const s = legacy(); center(s).owner = 'p'; center(s).guards = [s.units.c0];
  center(s).shieldUntil = now + 50000; s.inventory.bandage = 2; s.credited = ['old:correct'];
  s.units.orphan = { id: 'orphan', level: 4, element: 'fire', hp: 19, maxHp: 140 };
  const before = structuredClone(s), next = syncConquestRoster(s, roster);
  expect(next.units.c0).toMatchObject({ level: 62, hp: 650, maxHp: 1300 });
  expect(center(next).guards[0]).toEqual(next.units.c0);
  expect({ ...next, units: s.units, tiles: s.tiles }).toEqual(s);
  expect(next.tiles.filter(t => !t.owner)).toEqual(s.tiles.filter(t => !t.owner));
  expect({ ...center(next), guards: center(s).guards }).toEqual(center(s));
  expect(next.units.orphan).toEqual(s.units.orphan);
  expect(syncConquestRoster(next, roster)).toEqual(next);
  expect(currentUnit(next, { ...roster[0], ...next.units.c0 })).toEqual(next.units.c0);
  expect(s).toEqual(before);
  const loaded = parseConquest(JSON.stringify(next), 'p');
  expect(loaded.units).toEqual(next.units);
  expect(center(loaded).guards).toEqual(center(next).guards);
});

it('keeps KO, tiny wounds, and the twenty-percent boundary when levels increase or decrease', () => {
  for (const level of [1, 62]) for (const hp of [0, 0.001, 27.999, 28, 139.999, 140]) {
    const s = legacy(); s.units.c0.hp = hp;
    const unit = currentUnit(s, { ...roster[0], level });
    expect(health(unit) / maxHealth(unit)).toBeCloseTo(hp / 140, 12);
    expect(readyToDeploy(unit)).toBe(hp >= 28);
    if (hp === 0) expect(health(unit)).toBe(0);
  }
  const s = legacy(); s.units.c0.hp = 0;
  const next = advanceConquest(syncConquestRoster(s, roster), now + RECOVERY_MS);
  expect(next.units.c0.hp).toBe(65); // Only the normal elapsed-time recovery heals.
});

it('uses the same grown units for preview, damage, commit and saved battle outcome', () => {
  const s = legacy(), team = roster.map(c => c.id);
  const setup = prepareBattle(s, { mode: 'claim', player: 'p', season: s.season, tileId: '0,0' }, team, roster, 'coast', now);
  const next = act(s, 'p', { type: 'claim', tileId: '0,0', team }, roster, now);
  expect(setup.block).toBeNull();
  expect(setup.result).toMatchObject(next.lastBattle!);
  expect(setup.attackers.map(c => c.level)).toEqual([62, 36, 11]);
  expect(setup.result.initialAttackers[0]).toMatchObject({ hp: 650, maxHp: 1300 });
  const old = prepareBattle(s, { mode: 'claim', player: 'p', season: s.season, tileId: '0,0' }, team, roster.map(c => ({ ...c, level: 4 })), 'coast', now);
  expect(setup.result.attack).toBeGreaterThan(old.result.attack);
  expect(next.lastBattle!.won).toBe(true);
});

it('updates drills, healing, recall and reinforcement without resetting wounds or shields', () => {
  const s = legacy(); center(s).owner = 'p'; center(s).guards = [s.units.c0]; center(s).shieldUntil = now + 12345; s.inventory.bandage = 1;
  const before = structuredClone(s);
  const drill = prepareBattle(s, { mode: 'drill', player: 'p', season: s.season, tileId: '0,0' }, [], roster, 'deep', now);
  expect(drill.defenders[0]).toMatchObject({ level: 62, hp: 650, maxHp: 1300 });
  expect(s).toEqual(before);
  const healed = act(s, 'p', { type: 'heal', unitId: 'c0', remedy: 'bandage' }, roster, now);
  expect(healed.units.c0.hp).toBe(1040); expect(healed.inventory.bandage).toBe(0);
  expect(center(healed).guards[0]).toEqual(healed.units.c0);
  const recalled = act(healed, 'p', { type: 'recall', tileId: '0,0', unitId: 'c0' }, roster, now);
  const returned = act(recalled, 'p', { type: 'station', tileId: '0,0', unitId: 'c0' }, roster, now);
  expect(returned.units.c0.hp).toBe(1040);
  expect(center(returned).shieldUntil).toBe(center(s).shieldUntil);
  expect(center(returned).guards[0]).toEqual(returned.units.c0);
});
