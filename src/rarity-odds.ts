import { RARITY_ORDER, type CharacterRarity } from './characters';

// Basis points: shared by authoritative draws and the published probability table.
export const DRAW_WEIGHTS: Readonly<Record<CharacterRarity, number>> = Object.freeze({ E: 5000, D: 2800, C: 1200, B: 600, A: 260, S: 100, SS: 30, SSS: 10 });
export const ENCOUNTER_WEIGHTS: Readonly<Record<CharacterRarity, number>> = Object.freeze({ E: 6000, D: 3000, C: 1000, B: 7500, A: 2400, S: 100, SS: 0, SSS: 0 });

/** Select a tier before a species, so adding species cannot inflate rare odds. */
export function chooseRarity(pool: readonly { rarity: CharacterRarity }[], weights: Readonly<Record<CharacterRarity, number>>, roll: number): CharacterRarity {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw Error('抽選亂數無效');
  const available = new Set(pool.map(p => p.rarity));
  const tiers = RARITY_ORDER.filter(r => available.has(r) && weights[r] > 0);
  const total = tiers.reduce((n, r) => n + weights[r], 0);
  if (!total) throw Error('沒有可抽選的角色');
  let ticket = Math.floor(roll * total);
  for (const tier of tiers) { ticket -= weights[tier]; if (ticket < 0) return tier; }
  return tiers[tiers.length - 1];
}

/** Administrator-issued invitation: exact S 30%, A 70%; no SS/SSS. */
export const STAR_TICKET_WEIGHTS: Readonly<Record<CharacterRarity, number>> = Object.freeze({ E: 0, D: 0, C: 0, B: 0, A: 7000, S: 3000, SS: 0, SSS: 0 });
