import { CHARACTERS, DEFAULT_CHARACTER_ID } from './characters';
import type { Profile } from './adventure';

export const STARTER_E_RATE = 0.8;
export const STARTER_POOLS = {
  E: CHARACTERS.filter(pet => pet.rarity === 'E'),
  D: CHARACTERS.filter(pet => pet.rarity === 'D'),
};
export type Onboarding = { pet: string | null; confirmed: boolean };
// Historical players retain Tideglow; new players keep their own first partner.
export const initialCompanion = (profile: Pick<Profile, 'onboarding'>) => profile.onboarding?.pet ?? DEFAULT_CHARACTER_ID;
export const needsOnboarding = (profile: Pick<Profile, 'onboarding'>) => Boolean(profile.onboarding && !profile.onboarding.confirmed);
export const isStarter = (id: string) => [...STARTER_POOLS.E, ...STARTER_POOLS.D].some(pet => pet.id === id);
export function pickStarter(roll: number, pick: number) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1 || !Number.isFinite(pick) || pick < 0 || pick >= 1) throw Error('抽選資料不正確');
  const pool = STARTER_POOLS[roll < STARTER_E_RATE ? 'E' : 'D'];
  return pool[Math.floor(pick * pool.length)];
}
