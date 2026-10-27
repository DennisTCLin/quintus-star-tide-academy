import { growthProgress } from './companion-growth';
import type { Profile } from './game-view';
import { MONSTER_CATALOG, monsterEligible } from './monsters';
import type { SUBJECT_ISLANDS } from './subject-islands';

export type CollectionProfile = Pick<Profile, 'owned' | 'equipped' | 'growth'>;
export type CollectionIsland = typeof SUBJECT_ISLANDS[number];

export function islandCollection(island: CollectionIsland, profile: CollectionProfile) {
  const level = growthProgress(profile.growth.xp[profile.equipped] ?? 0).level;
  const entries = MONSTER_CATALOG.filter(monster => monster.element === island.element)
    .map(monster => ({ monster, owned: (profile.owned[monster.id] ?? 0) > 0, available: monsterEligible(monster, level) }));
  return {
    entries,
    current: entries.filter(entry => entry.available),
    other: entries.filter(entry => !entry.available),
    collected: entries.filter(entry => entry.owned).length,
    level,
  };
}
